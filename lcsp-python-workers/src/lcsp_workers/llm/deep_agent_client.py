"""Deep Agents based LCSP model client.

This module is the worker-side model boundary. It uses LangChain Deep Agents as
the execution harness while keeping LCSP's explicit safety, budget, provider
fallback, trace, and manual tool-dispatch contracts.
"""

from __future__ import annotations

import contextlib
import contextvars
import json
import os
import re
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

import tiktoken

from lcsp_workers.llm.budget_tracker import BudgetTracker
from lcsp_workers.llm.docker_sandbox import (
    DockerSandboxBackend,
    docker_sandbox_config,
)
from lcsp_workers.llm.prompt_safety import check_prompt_safety
from lcsp_workers.platform.redaction import redact_string
from lcsp_workers.platform.tracing import get_current_run_tree, traceable


@dataclass
class LLMResponse:
    """Provider-neutral text completion response and usage metadata."""

    content: str
    input_tokens: int
    output_tokens: int
    model: str
    provider: str
    request_id: Optional[str] = None


@dataclass(frozen=True)
class LLMToolDefinition:
    """Provider-neutral definition for one manually dispatched model tool."""

    name: str
    description: str
    input_schema: dict[str, Any]
    tool_choice_required: bool = False


@dataclass(frozen=True)
class LLMToolCall:
    """Structured model-requested tool call awaiting registry validation/dispatch."""

    name: str
    arguments: dict[str, Any]
    call_id: str | None = None


@dataclass
class LLMToolResponse(LLMResponse):
    """Completion response that may include captured structured tool calls."""

    tool_calls: tuple[LLMToolCall, ...] = ()


DEFAULT_MODEL_PRICING = {
    "gpt-4o": (5.0, 15.0),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4-turbo": (10.0, 30.0),
    "gpt-3.5-turbo": (0.5, 1.5),
    "claude-3-opus-20240229": (15.0, 75.0),
    "claude-3-sonnet-20240229": (3.0, 15.0),
    "claude-3-haiku-20240307": (0.25, 1.25),
    "claude-sonnet-5": (2.0, 10.0),
    "gemini-2.5-pro": (1.5, 9.0),
    "gemini-2.5-flash": (0.30, 2.5),
    "gemini-2.5-flash-lite": (0.15, 1.25),
    "gemini-1.5-pro": (1.25, 5.0),
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-3.5-flash": (0.075, 0.30),
    "gemini-3.1-flash-lite": (0.15, 1.25),
}

_TOOL_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_PACKAGE_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = Path(__file__).resolve().parents[4]
_LCSP_SKILLS_DIR = _PACKAGE_ROOT / "llm" / "deep_agent_skills"
_TEXT_EXTENSIONS = {
    ".md",
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".prisma",
}
_MAX_RETRIEVAL_FILE_BYTES = 512_000
_RUNTIME_CONTEXT: contextvars.ContextVar[dict[str, Any]] = contextvars.ContextVar(
    "lcsp_deep_agent_runtime_context",
    default={},
)


@contextlib.contextmanager
def deep_agent_runtime_context(**context: Any):
    """Bind per-run/per-workflow Deep Agent retrieval context for the current flow."""
    token = set_deep_agent_runtime_context(**context)
    try:
        yield
    finally:
        reset_deep_agent_runtime_context(token)


def set_deep_agent_runtime_context(**context: Any) -> contextvars.Token:
    current = dict(_RUNTIME_CONTEXT.get())
    current.update({key: value for key, value in context.items() if value is not None})
    return _RUNTIME_CONTEXT.set(current)


def reset_deep_agent_runtime_context(token: contextvars.Token) -> None:
    _RUNTIME_CONTEXT.reset(token)


def get_model_pricing() -> dict[str, tuple[float, float]]:
    """Load optional per-million-token pricing overrides or return safe defaults."""
    pricing_env = os.environ.get("LLM_MODEL_PRICING")
    if pricing_env:
        parsed = json.loads(pricing_env)
        pricing: dict[str, tuple[float, float]] = {}
        for key, value in parsed.items():
            if isinstance(value, dict):
                pricing[key] = (float(value["input"]), float(value["output"]))
                continue
            if isinstance(value, (list, tuple)) and len(value) == 2:
                pricing[key] = (float(value[0]), float(value[1]))
                continue
            raise ValueError(f"Invalid pricing entry for model: {key}")
        return pricing
    return DEFAULT_MODEL_PRICING


def estimate_tokens(text: str) -> int:
    """Estimate token count with tiktoken and fall back to a conservative heuristic."""
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        return len(text) // 4


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate call cost from configured model input/output token pricing."""
    in_price, out_price = get_model_pricing().get(model, (10.0, 30.0))
    return (input_tokens / 1_000_000 * in_price) + (
        output_tokens / 1_000_000 * out_price
    )


class DeepAgentClient:
    """Deep Agents implementation of LCSP's model client protocol."""

    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str,
        budget_tracker: BudgetTracker,
        max_tokens_per_call: int = 4096,
        timeout_seconds: float = 30.0,
    ):
        if max_tokens_per_call < 1:
            raise ValueError("max_tokens_per_call must be >= 1")
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model
        self.max_tokens_per_call = max_tokens_per_call
        self.timeout_seconds = timeout_seconds
        self.budget_tracker = budget_tracker
        self.model_ref = self._model_ref()

    @traceable(run_type="llm", name="DeepAgentClient.complete")
    def complete(
        self,
        prompt: str,
        workflow_run_id: str,
        node_name: str,
        max_tokens: Optional[int] = None,
        correlationId: Optional[str] = None,
    ) -> LLMResponse:
        safe_prompt, max_tokens_to_use, _extra_headers = self._prepare_request(
            prompt=prompt,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            max_tokens=max_tokens,
            correlationId=correlationId,
        )
        agent = self._create_agent(
            system_prompt=_plain_completion_prompt(),
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            prompt=safe_prompt,
        )
        result = self._invoke_agent(
            agent,
            safe_prompt,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            correlationId=correlationId,
            max_tokens=max_tokens_to_use,
        )
        content = _last_message_content(result)
        input_tokens, output_tokens = _usage_from_agent_result(
            result,
            safe_prompt,
            content,
        )
        self._record_actual_usage(input_tokens, output_tokens)
        self._update_run_tree_usage(input_tokens, output_tokens)
        return LLMResponse(
            content=redact_string(content),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=self.model,
            provider=self.provider,
            request_id=str(uuid4()),
        )

    @traceable(run_type="llm", name="DeepAgentClient.complete_with_tools")
    def complete_with_tools(
        self,
        prompt: str,
        *,
        tools: list[LLMToolDefinition],
        workflow_run_id: str,
        node_name: str,
        max_tokens: Optional[int] = None,
        correlationId: Optional[str] = None,
    ) -> LLMToolResponse:
        self._validate_tool_definitions(tools)
        require_tool_call = any(tool.tool_choice_required for tool in tools)
        safe_prompt, max_tokens_to_use, _extra_headers = self._prepare_request(
            prompt=prompt,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            max_tokens=max_tokens,
            correlationId=correlationId,
        )
        captured_calls: list[LLMToolCall] = []
        agent = self._create_agent(
            tools=_capture_tools(tools, captured_calls),
            system_prompt=_tool_completion_prompt(tools, require_tool_call),
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            prompt=safe_prompt,
            capture_tool_names=[tool.name for tool in tools],
        )
        result = self._invoke_agent(
            agent,
            safe_prompt,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            correlationId=correlationId,
            max_tokens=max_tokens_to_use,
        )
        content = _last_message_content(result)
        allowed_names = {tool.name for tool in tools}
        if any(call.name not in allowed_names for call in captured_calls):
            raise ValueError("Deep Agent returned an undeclared tool call")
        if require_tool_call and not captured_calls:
            raise ValueError("Deep Agent returned no tool call in required mode")
        input_tokens, output_tokens = _usage_from_agent_result(
            result,
            safe_prompt,
            content,
        )
        self._record_actual_usage(input_tokens, output_tokens)
        self._update_run_tree_usage(input_tokens, output_tokens)
        return LLMToolResponse(
            content=redact_string(content),
            tool_calls=tuple(captured_calls),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=self.model,
            provider=self.provider,
            request_id=str(uuid4()),
        )

    def _create_agent(
        self,
        *,
        system_prompt: str,
        tools: list[Any] | None = None,
        workflow_run_id: str,
        node_name: str,
        prompt: str,
        capture_tool_names: list[str] | None = None,
    ) -> Any:
        try:
            from deepagents import (
                AsyncSubAgent,
                RubricMiddleware,
                create_deep_agent,
            )
            from deepagents.backends import (
                CompositeBackend,
                FilesystemBackend,
                StoreBackend,
            )
            from langgraph.checkpoint.memory import MemorySaver
            from langgraph.store.memory import InMemoryStore
        except ImportError as exc:
            raise RuntimeError(
                "deepagents is required for LCSP worker model execution"
            ) from exc
        store = InMemoryStore()
        subagent_mode = _select_subagent_mode(
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            prompt=prompt,
        )
        retrieval_tools = _base_retrieval_tools()
        middleware = _lcsp_middleware(
            model=self.model_ref,
            subagent_mode=subagent_mode,
        )
        subagents = _lcsp_subagents(retrieval_tools)
        async_subagents = _lcsp_async_subagents(AsyncSubAgent, subagent_mode)
        if async_subagents:
            subagents = async_subagents
        with self._provider_env():
            return create_deep_agent(
                model=self.model_ref,
                tools=[*retrieval_tools, *(tools or [])],
                system_prompt=_context_engineered_prompt(
                    system_prompt,
                    subagent_mode=subagent_mode,
                ),
                memory=_existing_paths(_default_memory_paths()),
                skills=_existing_paths([_LCSP_SKILLS_DIR]),
                backend=_lcsp_backend(
                    CompositeBackend=CompositeBackend,
                    FilesystemBackend=FilesystemBackend,
                    StoreBackend=StoreBackend,
                    store=store,
                    workflow_run_id=workflow_run_id,
                    node_name=node_name,
                ),
                checkpointer=MemorySaver(),
                store=store,
                subagents=subagents,
                middleware=middleware,
                interrupt_on=_lcsp_interrupt_on(capture_tool_names or []),
                name="lcsp-deep-agent",
            )

    def _invoke_agent(
        self,
        agent: Any,
        prompt: str,
        *,
        workflow_run_id: str,
        node_name: str,
        correlationId: str | None,
        max_tokens: int,
    ) -> Any:
        with self._provider_env():
            return agent.invoke(
                {"messages": [{"role": "user", "content": prompt}]},
                config={
                    "metadata": {
                        "workflow_run_id": workflow_run_id,
                        "node_name": node_name,
                        "correlationId": correlationId,
                        "ls_provider": self.provider,
                        "ls_model_name": self.model,
                        "lcsp_subagent_mode": _select_subagent_mode(
                            workflow_run_id=workflow_run_id,
                            node_name=node_name,
                            prompt=prompt,
                        ),
                    },
                    "configurable": {
                        "thread_id": workflow_run_id,
                        "workflow_run_id": workflow_run_id,
                        "node_name": node_name,
                        "correlationId": correlationId,
                        "max_tokens": max_tokens,
                    },
                },
            )

    def _prepare_request(
        self,
        *,
        prompt: str,
        workflow_run_id: str,
        node_name: str,
        max_tokens: Optional[int],
        correlationId: Optional[str],
    ) -> tuple[str, int, dict[str, str]]:
        if not workflow_run_id:
            raise ValueError("workflow_run_id is required")
        if not node_name:
            raise ValueError("node_name is required")
        check_prompt_safety(prompt)
        requested_max_tokens = (
            max_tokens if max_tokens is not None else self.max_tokens_per_call
        )
        if requested_max_tokens < 1:
            raise ValueError("max_tokens must be >= 1")
        max_tokens_to_use = min(requested_max_tokens, self.max_tokens_per_call)
        safe_prompt = redact_string(prompt)
        est_input = estimate_tokens(safe_prompt)
        est_cost_pre = estimate_cost(self.model, est_input, max_tokens_to_use)
        self.budget_tracker.check_budget(est_input, max_tokens_to_use, est_cost_pre)
        extra_headers = {
            "X-Workflow-Run-Id": workflow_run_id,
            "X-Node-Name": node_name,
        }
        if correlationId:
            extra_headers["X-Correlation-Id"] = correlationId
        return safe_prompt, max_tokens_to_use, extra_headers

    def _record_actual_usage(self, input_tokens: int, output_tokens: int) -> None:
        actual_cost = estimate_cost(self.model, input_tokens, output_tokens)
        self.budget_tracker.check_budget_and_accumulate(
            input_tokens,
            output_tokens,
            actual_cost,
        )

    def _update_run_tree_usage(self, input_tokens: int, output_tokens: int) -> None:
        run_tree = get_current_run_tree()
        if run_tree:
            run_tree.metadata["ls_provider"] = self.provider
            run_tree.metadata["ls_model_name"] = self.model
            run_tree.metadata["usage"] = {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
            }

    def _model_ref(self) -> str:
        if self.provider == "openai":
            return f"openai:{self.model}"
        if self.provider == "anthropic":
            return f"anthropic:{self.model}"
        if self.provider in ("google", "google-genai", "gemini"):
            return f"google_genai:{self.model}"
        raise ValueError(f"Unsupported LLM_PROVIDER: {self.provider}")

    @contextlib.contextmanager
    def _provider_env(self):
        key_name = _api_key_env_name(self.provider)
        previous = os.environ.get(key_name)
        os.environ[key_name] = self.api_key
        try:
            yield
        finally:
            if previous is None:
                os.environ.pop(key_name, None)
            else:
                os.environ[key_name] = previous

    @staticmethod
    def _validate_tool_definitions(tools: list[LLMToolDefinition]) -> None:
        if not tools:
            raise ValueError("at least one tool definition is required")
        names: set[str] = set()
        for tool in tools:
            if not _TOOL_NAME_PATTERN.fullmatch(tool.name):
                raise ValueError(f"invalid tool name: {tool.name}")
            if tool.name in names:
                raise ValueError(f"duplicate tool name: {tool.name}")
            names.add(tool.name)
            if not tool.description.strip():
                raise ValueError(f"tool description is required: {tool.name}")
            schema = tool.input_schema
            if not isinstance(schema, dict) or schema.get("type") != "object":
                raise ValueError(f"tool input schema must be an object: {tool.name}")
            if schema.get("additionalProperties") is not False:
                raise ValueError(
                    f"tool input schema must set additionalProperties=false: {tool.name}"
                )


def _capture_tools(
    tools: list[LLMToolDefinition],
    captured_calls: list[LLMToolCall],
) -> list[Any]:
    captured_tools = []
    for definition in tools:

        def capture_tool(
            _definition: LLMToolDefinition = definition,
            **arguments: Any,
        ) -> str:
            captured_calls.append(
                LLMToolCall(
                    name=_definition.name,
                    arguments=dict(arguments),
                    call_id=str(uuid4()),
                )
            )
            return (
                "LCSP captured this tool call for deterministic PBAC/schema "
                "dispatch. Do not treat this as executed domain action."
            )

        capture_tool.__name__ = definition.name
        capture_tool.__doc__ = definition.description
        captured_tools.append(capture_tool)
    return captured_tools


def _plain_completion_prompt() -> str:
    return (
        "You are the LCSP Deep Agent runtime. Return the requested answer only. "
        "Use concise, schema-compatible output when the prompt specifies a schema."
    )


def _tool_completion_prompt(
    tools: list[LLMToolDefinition],
    require_tool_call: bool,
) -> str:
    tool_names = ", ".join(tool.name for tool in tools)
    required = (
        "You must call one of the provided tools before finalizing."
        if require_tool_call
        else "Call a provided tool when structured data is needed."
    )
    return (
        "You are the LCSP Deep Agent runtime. Tools are capture-only: calling a "
        "tool records the structured request for LCSP to validate and dispatch "
        f"later. Available capture tools: {tool_names}. You may use LCSP retrieval "
        f"tools to inspect source code, OpenWiki chunks, and engineering-rule "
        f"context before choosing a capture tool. {required}"
    )


def _context_engineered_prompt(
    system_prompt: str,
    *,
    subagent_mode: str,
) -> str:
    return "\n\n".join(
        [
            system_prompt,
            (
                "LCSP context policy: prefer source-code retrieval for implementation "
                "facts, OpenWiki retrieval for curated repository/legal context, and "
                "engineering-rule retrieval for rule planning. Treat wizard answers as "
                "claims until source and corpus evidence confirm them."
            ),
            (
                "Chunk triage policy: retrieve narrowly, compare source/OpenWiki/rule "
                "chunks, keep only grounded matches, and mark unsupported or conflicting "
                "claims as needing human review instead of silently resolving them."
            ),
            (
                "Human-in-the-loop policy: when wizard claims and source evidence "
                "materially disagree, route the capture decision through LCSP review "
                "tools when available; otherwise return a blocked/conflict status."
            ),
            f"Sub-agent policy selected for this run: {subagent_mode}.",
        ]
    )


def _last_message_content(result: Any) -> str:
    messages = result.get("messages", []) if isinstance(result, dict) else []
    if not messages:
        return ""
    content = getattr(messages[-1], "content", None)
    if content is None and isinstance(messages[-1], dict):
        content = messages[-1].get("content")
    if isinstance(content, list):
        return "".join(str(part) for part in content)
    return str(content or "")


def _usage_from_agent_result(
    result: Any,
    prompt: str,
    content: str,
) -> tuple[int, int]:
    input_tokens = 0
    output_tokens = 0
    messages = result.get("messages", []) if isinstance(result, dict) else []
    for message in messages:
        usage = getattr(message, "usage_metadata", None)
        if isinstance(usage, dict):
            input_tokens += int(
                usage.get("input_tokens") or usage.get("prompt_tokens") or 0
            )
            output_tokens += int(
                usage.get("output_tokens") or usage.get("completion_tokens") or 0
            )
    if input_tokens == 0:
        input_tokens = estimate_tokens(prompt)
    if output_tokens == 0:
        output_tokens = estimate_tokens(content)
    return input_tokens, output_tokens


def _api_key_env_name(provider: str) -> str:
    normalized = provider.lower()
    if normalized == "openai":
        return "OPENAI_API_KEY"
    if normalized == "anthropic":
        return "ANTHROPIC_API_KEY"
    if normalized in ("google", "google-genai", "gemini"):
        return "GOOGLE_API_KEY"
    return f"{normalized.upper()}_API_KEY"


def _existing_paths(paths: list[Path]) -> list[str]:
    return [str(path) for path in paths if path.exists()]


def _default_memory_paths() -> list[Path]:
    return [
        _REPO_ROOT / "AGENTS.md",
        _REPO_ROOT / "RTK.md",
        Path.cwd() / "AGENTS.md",
    ]


def _base_retrieval_tools() -> list[Any]:
    return [
        lcsp_search_source_code,
        lcsp_search_openwiki,
        lcsp_search_engineering_rules,
        lcsp_triage_chunks,
    ]


def _lcsp_subagents(retrieval_tools: list[Any]) -> list[dict[str, Any]]:
    skill_paths = _existing_paths([_LCSP_SKILLS_DIR])
    return [
        {
            "name": "lcsp-source-code-agent",
            "description": (
                "Investigates LCSP repository source evidence and summarizes "
                "implementation facts for wizard-vs-source conflict analysis."
            ),
            "system_prompt": (
                "Use source-code retrieval first. Return concise file/line "
                "grounded findings. Do not call LCSP capture tools."
            ),
            "tools": [lcsp_search_source_code],
            "skills": skill_paths,
        },
        {
            "name": "lcsp-openwiki-agent",
            "description": (
                "Retrieves OpenWiki and legal corpus chunks for legal-rule "
                "grounding and citation context."
            ),
            "system_prompt": (
                "Use OpenWiki/corpus retrieval first. Return only grounded "
                "legal or citation context and explicit uncertainty."
            ),
            "tools": [lcsp_search_openwiki],
            "skills": skill_paths,
        },
        {
            "name": "lcsp-engineering-rule-agent",
            "description": (
                "Retrieves LCSP engineering-rule context and compares it with "
                "scan evidence for rule planning."
            ),
            "system_prompt": (
                "Use engineering-rule retrieval first. Summarize candidate "
                "rules, source support, and unresolved frontiers."
            ),
            "tools": retrieval_tools,
            "skills": skill_paths,
        },
    ]


def _lcsp_async_subagents(AsyncSubAgent: Any, subagent_mode: str) -> list[Any]:
    if subagent_mode != "async":
        return []
    graph_url = os.environ.get("LCSP_DEEP_AGENT_ASYNC_AGENT_URL", "").strip()
    if not graph_url or not _is_local_agent_protocol_url(graph_url):
        return []
    headers = _async_subagent_headers()
    return [
        AsyncSubAgent(
            name="lcsp-corpus-build-agent",
            description=(
                "Long-running OpenWiki/corpus chunk build and retrieval-index "
                "triage agent. Use when the planner has no valid engineering-rule "
                "chunks and must wait for corpus automation."
            ),
            graph_id=os.environ.get(
                "LCSP_DEEP_AGENT_ASYNC_CORPUS_GRAPH_ID",
                "lcsp_corpus_builder",
            ),
            url=graph_url,
            headers=headers,
        ),
        AsyncSubAgent(
            name="lcsp-rule-investigation-agent",
            description=(
                "Long-running parallel engineering-rule investigation agent for "
                "large rule sets and unresolved source frontiers."
            ),
            graph_id=os.environ.get(
                "LCSP_DEEP_AGENT_ASYNC_RULE_GRAPH_ID",
                "lcsp_rule_investigator",
            ),
            url=graph_url,
            headers=headers,
        ),
    ]


def _is_local_agent_protocol_url(url: str) -> bool:
    normalized = url.lower()
    return normalized.startswith(("http://127.0.0.1", "http://localhost", "unix://"))


def _async_subagent_headers() -> dict[str, str]:
    token = os.environ.get("LCSP_DEEP_AGENT_ASYNC_AGENT_TOKEN", "").strip()
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def _lcsp_backend(
    *,
    CompositeBackend: Any,
    FilesystemBackend: Any,
    StoreBackend: Any,
    store: Any,
    workflow_run_id: str,
    node_name: str,
) -> Any:
    context = _RUNTIME_CONTEXT.get()
    routes: dict[str, Any] = {}
    source_root = _runtime_path(context.get("source_root"))
    if source_root:
        routes["/workspace/"] = FilesystemBackend(
            root_dir=source_root,
            virtual_mode=True,
        )
    openwiki_root = _runtime_path(context.get("openwiki_root"))
    if openwiki_root:
        routes["/openwiki/"] = FilesystemBackend(
            root_dir=openwiki_root,
            virtual_mode=True,
        )
    routes["/memories/"] = StoreBackend(
        namespace=lambda _runtime: ("lcsp", "deep-agent"),
        store=store,
    )
    docker_backend = DockerSandboxBackend(
        docker_sandbox_config(
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            workspace_root=source_root,
            openwiki_root=openwiki_root,
        )
    )
    return CompositeBackend(default=docker_backend, routes=routes)


def _lcsp_middleware(*, model: str, subagent_mode: str) -> list[Any]:
    middleware: list[Any] = []
    if _env_flag("LCSP_DEEP_AGENT_RUBRIC", default=True):
        try:
            from deepagents import RubricMiddleware
        except ImportError:
            RubricMiddleware = None
        if RubricMiddleware is not None:
            middleware.append(
                RubricMiddleware(
                    model=os.environ.get("LCSP_DEEP_AGENT_RUBRIC_MODEL", model),
                    system_prompt=_lcsp_rubric_prompt(),
                    max_iterations=_env_int(
                        "LCSP_DEEP_AGENT_RUBRIC_MAX_ITERATIONS",
                        default=2,
                        minimum=1,
                        maximum=5,
                    ),
                )
            )
    if subagent_mode == "dynamic" and _env_flag(
        "LCSP_DEEP_AGENT_DYNAMIC_SUBAGENTS",
        default=True,
    ):
        try:
            from langchain_quickjs import CodeInterpreterMiddleware
        except ImportError:
            CodeInterpreterMiddleware = None
        if CodeInterpreterMiddleware is not None:
            middleware.append(CodeInterpreterMiddleware())
    return middleware


def _lcsp_interrupt_on(capture_tool_names: list[str]) -> dict[str, Any] | None:
    review_tools = [
        name
        for name in capture_tool_names
        if any(token in name for token in ("conflict", "review", "resolution"))
    ]
    if not review_tools:
        return None
    return {
        name: {"allowed_decisions": ["approve", "edit", "reject", "respond"]}
        for name in review_tools
    }


def _lcsp_rubric_prompt() -> str:
    return (
        "Grade LCSP agent output against this rubric: every material claim must be "
        "grounded in source-code, OpenWiki, corpus, or engineering-rule retrieval; "
        "wizard-only claims must be labeled as unverified; mismatch between wizard "
        "and source must not be auto-accepted; capture-tool output must remain "
        "schema-compatible JSON when the task requires a tool call."
    )


def _select_subagent_mode(
    *,
    workflow_run_id: str,
    node_name: str,
    prompt: str,
) -> str:
    forced = os.environ.get("LCSP_DEEP_AGENT_SUBAGENT_MODE", "").strip().lower()
    if forced in {"sync", "async", "dynamic"}:
        return forced
    text = f"{workflow_run_id} {node_name} {prompt[:2000]}".lower()
    if any(
        marker in text
        for marker in (
            "no engineering",
            "no valid engineering",
            "build chunk",
            "build corpus",
            "resume-waiting-runs",
            "waiting-runs",
            "cron",
        )
    ):
        return "async"
    if any(
        marker in text
        for marker in (
            "plan_engineering_rules",
            "investigate_engineering_rule",
            "candidate_count",
            "selected_rule_ids",
            "business-cluster",
            "fan-out",
        )
    ):
        return "dynamic"
    return "sync"


def _runtime_path(value: Any) -> Path | None:
    if value is None:
        return None
    path = value if isinstance(value, Path) else Path(str(value))
    if path.exists():
        return path
    return None


def _env_flag(name: str, *, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(
    name: str,
    *,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


def lcsp_search_source_code(query: str, max_results: int = 8) -> str:
    """Search the current scan-job source workspace for code context."""
    root = _runtime_path(_RUNTIME_CONTEXT.get().get("source_root"))
    roots = [root] if root else []
    return _search_text_roots(roots, query=query, max_results=max_results)


def lcsp_search_openwiki(query: str, max_results: int = 8) -> str:
    """Search runtime OpenWiki artifacts or DB-backed corpus chunks."""
    context = _RUNTIME_CONTEXT.get()
    root = _runtime_path(context.get("openwiki_root"))
    matches = _search_text_roots(
        [root] if root else [],
        query=query,
        max_results=max_results,
    )
    payload = json.loads(matches)
    payload["dbMatches"] = _search_records(
        context.get("legal_chunks") or context.get("corpus_chunks") or [],
        query=query,
        max_results=max_results,
        source="legal_corpus",
    )
    return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def lcsp_search_engineering_rules(query: str, max_results: int = 8) -> str:
    """Search DB-backed legal and engineering-rule context for the current job."""
    context = _RUNTIME_CONTEXT.get()
    matches = [
        *_search_records(
            context.get("engineering_rules") or [],
            query=query,
            max_results=max_results,
            source="engineering_rules",
        ),
        *_search_records(
            context.get("legal_rules") or [],
            query=query,
            max_results=max_results,
            source="legal_rules",
        ),
    ]
    return json.dumps(
        {"query": query, "matches": matches[: max(1, min(max_results, 20))]},
        ensure_ascii=False,
        sort_keys=True,
    )


def lcsp_triage_chunks(query: str, max_results: int = 8) -> str:
    """Retrieve and triage source, OpenWiki, and engineering-rule chunks."""
    result_limit = max(1, min(max_results, 20))
    sources = {
        "source_code": json.loads(lcsp_search_source_code(query, result_limit)),
        "openwiki": json.loads(lcsp_search_openwiki(query, result_limit)),
        "engineering_rules": json.loads(
            lcsp_search_engineering_rules(query, result_limit)
        ),
    }
    triaged: list[dict[str, Any]] = []
    for source, payload in sources.items():
        source_matches = [
            *(payload.get("matches") or []),
            *(payload.get("dbMatches") or []),
        ]
        for match in source_matches[:result_limit]:
            snippet = str(match.get("snippet", ""))
            triaged.append(
                {
                    "source": source,
                    "path": match.get("path"),
                    "root": match.get("root"),
                    "line": match.get("line"),
                    "score": _chunk_score(query, snippet),
                    "snippet": snippet,
                }
            )
    triaged.sort(key=lambda item: int(item["score"]), reverse=True)
    return json.dumps(
        {
            "query": query,
            "matches": triaged[:result_limit],
            "triage_policy": (
                "Use source_code for implementation facts, openwiki for curated "
                "context, engineering_rules for rule applicability; escalate "
                "source-vs-wizard mismatch to human review."
            ),
        },
        ensure_ascii=False,
    )


def _chunk_score(query: str, snippet: str) -> int:
    terms = {
        term.lower()
        for term in re.findall(r"[\w.-]+", query)
        if len(term) > 1
    }
    lowered = snippet.lower()
    return sum(1 for term in terms if term in lowered)


def _search_records(
    records: Iterable[Any],
    *,
    query: str,
    max_results: int,
    source: str,
) -> list[dict[str, Any]]:
    result_limit = max(1, min(max_results, 20))
    terms = {
        term.lower()
        for term in re.findall(r"[\w.-]+", query)
        if len(term) > 1
    }
    matches: list[dict[str, Any]] = []
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            continue
        snippet = json.dumps(record, ensure_ascii=False, sort_keys=True)
        if terms and not any(term in snippet.lower() for term in terms):
            continue
        matches.append(
            {
                "source": source,
                "id": record.get("id")
                or record.get("chunkId")
                or record.get("legalRuleId")
                or record.get("engineeringRuleId")
                or str(index),
                "path": f"db://{source}",
                "root": "db",
                "line": 1,
                "snippet": snippet[:4_000],
            }
        )
        if len(matches) >= result_limit:
            break
    return matches


def _search_text_roots(
    roots: Iterable[Path],
    *,
    query: str,
    max_results: int,
) -> str:
    clean_query = query.strip()
    if not clean_query:
        return json.dumps({"matches": []}, ensure_ascii=False)
    result_limit = max(1, min(max_results, 20))
    terms = [
        term.lower()
        for term in re.findall(r"[\w.-]+", clean_query)
        if len(term) > 1
    ]
    if not terms:
        terms = [clean_query.lower()]

    matches: list[dict[str, str | int]] = []
    for root in roots:
        if len(matches) >= result_limit:
            break
        if not root.exists():
            continue
        for path in _iter_text_files(root):
            if len(matches) >= result_limit:
                break
            text = _read_text_file(path)
            if not text:
                continue
            lowered = text.lower()
            first_index = min(
                (lowered.find(term) for term in terms if term in lowered),
                default=-1,
            )
            if first_index < 0:
                continue
            line_number = text.count("\n", 0, first_index) + 1
            start = max(0, first_index - 240)
            end = min(len(text), first_index + 760)
            matches.append(
                {
                    "path": str(
                        path.relative_to(root) if path.is_relative_to(root) else path
                    ),
                    "root": str(root),
                    "line": line_number,
                    "snippet": text[start:end].strip(),
                }
            )
    return json.dumps({"matches": matches}, ensure_ascii=False)


def _iter_text_files(root: Path) -> Iterable[Path]:
    if root.is_file():
        if root.suffix.lower() in _TEXT_EXTENSIONS:
            yield root
        return
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(
            part in {".git", "node_modules", ".venv", "__pycache__"}
            for part in path.parts
        ):
            continue
        if path.suffix.lower() in _TEXT_EXTENSIONS:
            yield path


def _read_text_file(path: Path) -> str | None:
    try:
        if path.stat().st_size > _MAX_RETRIEVAL_FILE_BYTES:
            return None
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
