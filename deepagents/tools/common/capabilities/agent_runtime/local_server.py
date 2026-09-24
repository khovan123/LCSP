"""LCSP-owned LangGraph HTTP runtime for the production Agent Server service.

This server intentionally implements only the LangGraph SDK surface LCSP uses:
thread creation, synchronous run execution, and thread state reads. It keeps the
native Deep Agents/LangGraph graph as the runtime authority while avoiding the
licensed ``langchain/langgraph-api`` image for Fogewise production.
"""

from __future__ import annotations

import logging
import os
import threading
import uuid
from collections.abc import Mapping
from contextlib import asynccontextmanager
from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from typing import Any

import anyio
import uvicorn
from langchain_core.messages import BaseMessage, message_to_dict
from langsmith_bootstrap import disable_langsmith_tracing_by_default
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from tools.common.capabilities.platform.graph_runtime import checkpoint_database_url


DEFAULT_ASSISTANT_ID = "lcsp-agent"
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000
logger = logging.getLogger(__name__)


class LocalAgentRuntime:
    """Synchronous LangGraph runner behind a LangGraph-SDK-compatible facade."""

    def __init__(self) -> None:
        self._threads: dict[str, dict[str, Any]] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._lock = threading.Lock()
        self._checkpointer_context = None
        self._checkpointer = None
        self.graph = None

    def start(self) -> None:
        disable_langsmith_tracing_by_default()
        checkpointer = self._open_checkpointer()
        from agent import create_lcsp_agent

        self.graph = create_lcsp_agent(checkpointer=checkpointer)

    def close(self) -> None:
        if self._checkpointer_context is not None:
            self._checkpointer_context.__exit__(None, None, None)
            self._checkpointer_context = None
            self._checkpointer = None

    def create_thread(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        thread_id = _text(payload.get("thread_id")) or str(uuid.uuid4())
        metadata = payload.get("metadata") if isinstance(payload.get("metadata"), Mapping) else {}
        now = _now()
        with self._lock:
            existing = self._threads.get(thread_id)
            if existing is not None:
                return existing
            thread = {
                "thread_id": thread_id,
                "created_at": now,
                "updated_at": now,
                "metadata": dict(metadata),
                "status": "idle",
                "values": {},
            }
            self._threads[thread_id] = thread
            self._locks.setdefault(thread_id, threading.Lock())
            return thread

    def get_thread(self, thread_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._threads.get(thread_id)

    def wait_for_run(self, thread_id: str, payload: Mapping[str, Any]) -> Any:
        self.create_thread({"thread_id": thread_id, "if_exists": "do_nothing"})
        lock = self._thread_lock(thread_id)
        with lock:
            self._set_thread_status(thread_id, "busy")
            try:
                graph = self._graph()
                context = payload.get("context")
                if not isinstance(context, Mapping):
                    context = {}
                graph_input = payload.get("input")
                config = _runtime_config(
                    thread_id,
                    payload.get("config"),
                    payload.get("metadata"),
                    context,
                )
                try:
                    result = graph.invoke(
                        graph_input,
                        config=config,
                        context=dict(context),
                    )
                except TypeError as exc:
                    if "context" not in str(exc):
                        raise
                    result = graph.invoke(graph_input, config=config)
                snapshot = graph.get_state(config)
                values = dict(getattr(snapshot, "values", {}) or {})
                self._update_thread_values(thread_id, values)
                return _json_ready(result)
            finally:
                self._set_thread_status(thread_id, "idle")

    def get_state(self, thread_id: str) -> dict[str, Any]:
        self.create_thread({"thread_id": thread_id, "if_exists": "do_nothing"})
        graph = self._graph()
        config = {"configurable": {"thread_id": thread_id}}
        try:
            snapshot = graph.get_state(config)
            values = dict(getattr(snapshot, "values", {}) or {})
            metadata = getattr(snapshot, "metadata", {}) or {}
            next_nodes = list(getattr(snapshot, "next", ()) or ())
            checkpoint = _checkpoint_from_config(getattr(snapshot, "config", None))
            parent_config = _checkpoint_from_config(
                getattr(snapshot, "parent_config", None)
            )
        except Exception:
            thread = self.get_thread(thread_id) or {}
            values = dict(thread.get("values") or {})
            metadata = {}
            next_nodes = []
            checkpoint = None
            parent_config = None
        return _json_ready(
            {
                "values": values,
                "next": next_nodes,
                "tasks": [],
                "metadata": metadata,
                "checkpoint": checkpoint,
                "parent_config": parent_config,
            }
        )

    def _open_checkpointer(self) -> object | None:
        configured = (
            os.environ.get("LANGGRAPH_CHECKPOINT_DATABASE_URL")
            or os.environ.get("POSTGRES_URI")
            or ""
        )
        checkpoint_url = checkpoint_database_url(configured)
        if not checkpoint_url:
            if _production_mode():
                raise RuntimeError(
                    "production LCSP Agent Runtime requires "
                    "LANGGRAPH_CHECKPOINT_DATABASE_URL"
                )
            from langgraph.checkpoint.memory import InMemorySaver

            return InMemorySaver()
        from langgraph.checkpoint.postgres import PostgresSaver

        self._checkpointer_context = PostgresSaver.from_conn_string(checkpoint_url)
        self._checkpointer = self._checkpointer_context.__enter__()
        self._checkpointer.setup()
        return self._checkpointer

    def _graph(self):
        if self.graph is None:
            raise RuntimeError("LCSP local agent runtime has not started")
        return self.graph

    def _thread_lock(self, thread_id: str) -> threading.Lock:
        with self._lock:
            return self._locks.setdefault(thread_id, threading.Lock())

    def _set_thread_status(self, thread_id: str, status: str) -> None:
        with self._lock:
            thread = self._threads.setdefault(
                thread_id,
                {
                    "thread_id": thread_id,
                    "created_at": _now(),
                    "metadata": {},
                    "values": {},
                },
            )
            thread["status"] = status
            thread["updated_at"] = _now()

    def _update_thread_values(self, thread_id: str, values: Mapping[str, Any]) -> None:
        with self._lock:
            thread = self._threads.setdefault(
                thread_id,
                {
                    "thread_id": thread_id,
                    "created_at": _now(),
                    "metadata": {},
                    "status": "idle",
                },
            )
            thread["values"] = _json_ready(dict(values))
            thread["updated_at"] = _now()


@asynccontextmanager
async def lifespan(app: Starlette):
    runtime = LocalAgentRuntime()
    runtime.start()
    app.state.runtime = runtime
    try:
        yield
    finally:
        runtime.close()


async def ok(_request: Request) -> JSONResponse:
    return JSONResponse({"ok": True})


async def create_thread(request: Request) -> JSONResponse:
    runtime: LocalAgentRuntime = request.app.state.runtime
    payload = await request.json()
    return JSONResponse(_json_ready(runtime.create_thread(payload)))


async def get_thread(request: Request) -> JSONResponse:
    runtime: LocalAgentRuntime = request.app.state.runtime
    thread_id = request.path_params["thread_id"]
    thread = runtime.get_thread(thread_id)
    if thread is None:
        return JSONResponse({"error": "thread not found"}, status_code=404)
    return JSONResponse(_json_ready(thread))


async def wait_for_run(request: Request) -> JSONResponse:
    runtime: LocalAgentRuntime = request.app.state.runtime
    thread_id = request.path_params["thread_id"]
    payload = await request.json()
    try:
        result = await anyio.to_thread.run_sync(runtime.wait_for_run, thread_id, payload)
    except Exception as exc:
        logger.exception("LCSP local Agent Server run failed")
        return JSONResponse(
            {
                "error": type(exc).__name__,
                "detail": str(exc),
            },
            status_code=500,
        )
    return JSONResponse(_json_ready(result))


async def get_state(request: Request) -> JSONResponse:
    runtime: LocalAgentRuntime = request.app.state.runtime
    thread_id = request.path_params["thread_id"]
    return JSONResponse(runtime.get_state(thread_id))


app = Starlette(
    lifespan=lifespan,
    routes=[
        Route("/ok", ok, methods=["GET"]),
        Route("/health", ok, methods=["GET"]),
        Route("/threads", create_thread, methods=["POST"]),
        Route("/threads/{thread_id}", get_thread, methods=["GET"]),
        Route("/threads/{thread_id}/runs/wait", wait_for_run, methods=["POST"]),
        Route("/threads/{thread_id}/state", get_state, methods=["GET"]),
    ],
)


def _runtime_config(
    thread_id: str,
    config: object,
    metadata: object,
    context: Mapping[str, Any],
) -> dict[str, Any]:
    runtime_config = dict(config) if isinstance(config, Mapping) else {}
    configurable = dict(runtime_config.get("configurable") or {})
    configurable["thread_id"] = thread_id
    for key, value in context.items():
        if isinstance(value, (str, int, float, bool)) and value is not None:
            configurable.setdefault(key, value)
    configurable.setdefault("cwd", "/workspace/repository")
    runtime_config["configurable"] = configurable
    runtime_metadata = dict(runtime_config.get("metadata") or {})
    if isinstance(metadata, Mapping):
        runtime_metadata.update(dict(metadata))
    runtime_config["metadata"] = runtime_metadata
    return runtime_config


def _checkpoint_from_config(config: object) -> dict[str, Any] | None:
    if not isinstance(config, Mapping):
        return None
    configurable = config.get("configurable")
    if not isinstance(configurable, Mapping):
        return None
    checkpoint = {
        key: configurable.get(key)
        for key in ("thread_id", "checkpoint_ns", "checkpoint_id")
        if configurable.get(key) is not None
    }
    return checkpoint or None


def _json_ready(value: Any) -> Any:
    if isinstance(value, BaseMessage):
        return message_to_dict(value)
    if is_dataclass(value):
        return _json_ready(asdict(value))
    if isinstance(value, Mapping):
        return {str(key): _json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_ready(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    model_dump = getattr(value, "model_dump", None)
    if callable(model_dump):
        return _json_ready(model_dump(mode="json"))
    return str(value)


def _text(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _now() -> str:
    return datetime.now(tz=UTC).isoformat()


def _production_mode() -> bool:
    mode = os.environ.get("LCSP_AGENT_RUNTIME_MODE", "").strip().lower()
    return mode == "production" or os.environ.get("NODE_ENV", "").strip().lower() == "production"


def main() -> None:
    host = os.environ.get("LCSP_AGENT_RUNTIME_HOST", DEFAULT_HOST)
    port = int(os.environ.get("PORT") or os.environ.get("LCSP_AGENT_RUNTIME_PORT") or DEFAULT_PORT)
    uvicorn.run(
        "tools.common.capabilities.agent_runtime.local_server:app",
        host=host,
        port=port,
        reload=False,
        factory=False,
    )


if __name__ == "__main__":
    main()


__all__ = ["LocalAgentRuntime", "app", "main"]
