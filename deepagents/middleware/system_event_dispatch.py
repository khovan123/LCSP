"""Dispatch trusted broker events inside the local Deep Agents thread run."""

from __future__ import annotations

from typing import Any, Mapping

from langchain.agents.middleware import before_agent

from orchestration.context import LCSPRunContext
from tools.common.capabilities.agent_runtime.invocation import invoke_boundary
from tools.common.capabilities.platform.repository_sandbox import (
    activate_repository_backend,
    ensure_repository_for_event,
    resolve_repository_thread_backend,
)


@before_agent(can_jump_to=["end"])
def dispatch_agent_runtime_system_event(state, runtime) -> dict[str, Any] | None:
    """Run trusted LCSP system events before the root model is invoked."""
    _ = state
    context = _context(runtime.context)
    if context is None or not context.system_boundary_name or not context.system_event:
        return None

    backend = resolve_repository_thread_backend(_repository_config(runtime))
    ensure_repository_for_event(
        backend,
        context.system_boundary_name,
        context.system_event,
    )
    correlation_id = (
        context.correlation_id
        or _event_text(context.system_event, "correlationId", "correlation_id")
        or context.system_boundary_name
    )
    with activate_repository_backend(backend):
        invoke_boundary(
            context.system_boundary_name,
            dict(context.system_event),
            correlation_id,
        )
    return {"jump_to": "end"}


def _context(value: object) -> LCSPRunContext | None:
    if isinstance(value, LCSPRunContext):
        return value
    if isinstance(value, Mapping):
        return LCSPRunContext(**dict(value))
    return None


def _repository_config(runtime: Any) -> dict[str, dict[str, str]]:
    config = getattr(runtime, "config", None)
    if isinstance(config, dict) and isinstance(config.get("configurable"), dict):
        configurable = config["configurable"]
        if configurable.get("thread_id"):
            return config

    context = _context(getattr(runtime, "context", None))
    if context is None or not context.thread_id:
        return {"configurable": {}}

    event = context.system_event if isinstance(context.system_event, dict) else {}
    configurable = {
        "thread_id": context.thread_id,
        "cwd": "/workspace/repository",
    }
    _copy_if_present(configurable, "assessment_id", context.assessment_id)
    _copy_if_present(
        configurable,
        "snapshot_id",
        context.snapshot_id or _event_text(event, "snapshotId", "snapshot_id"),
    )
    _copy_if_present(
        configurable,
        "scan_job_id",
        context.scan_job_id or _event_text(event, "scanJobId", "scan_job_id"),
    )
    _copy_if_present(
        configurable,
        "commit_sha",
        context.commit_sha or _event_text(event, "commitSha", "commit_sha"),
    )
    return {"configurable": configurable}


def _copy_if_present(target: dict[str, str], key: str, value: str | None) -> None:
    if value:
        target[key] = value


def _event_text(event: Mapping[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


__all__ = ["dispatch_agent_runtime_system_event"]
