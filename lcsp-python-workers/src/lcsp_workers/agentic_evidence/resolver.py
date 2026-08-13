from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping
from uuid import UUID, uuid4

from lcsp_workers.llm import LLMToolCall, LLMToolDefinition

from .catalog import build_llm_tool_definitions
from .registry import AgenticToolRegistry, AgenticToolRequest, AgenticToolValidationError


@dataclass(frozen=True)
class AgenticInvocationContext:
    assessment_id: UUID
    workflow_run_id: UUID
    correlation_id: UUID
    artifact_versions: dict[str, str]
    scope: dict[str, Any]


@dataclass(frozen=True)
class AgenticToolCallResult:
    call_id: str | None
    tool_name: str
    response: Mapping[str, Any]


class AgenticToolResolver:
    """Bridge manual provider tool calls to the fail-closed Sprint 6 registry.

    The resolver exposes only catalog entries marked ``LLM_CALLABLE``. It never
    constructs idempotency keys or invokes mutation/system tools on behalf of a model.
    """

    def __init__(self, registry: AgenticToolRegistry, *, max_tool_calls: int) -> None:
        if max_tool_calls < 1 or max_tool_calls > 32:
            raise ValueError("max_tool_calls must be between 1 and 32")
        self._registry = registry
        self._max_tool_calls = max_tool_calls

    def tool_definitions(self) -> list[LLMToolDefinition]:
        definitions = build_llm_tool_definitions()
        registered = set(self._registry.model_callable_names())
        definition_names = {definition.name for definition in definitions}
        if definition_names != registered:
            raise AgenticToolValidationError("AGENTIC_TOOL_CATALOG_REGISTRY_DRIFT")
        return definitions

    def invoke_tool_calls(
        self,
        tool_calls: tuple[LLMToolCall, ...] | list[LLMToolCall],
        *,
        context: AgenticInvocationContext,
    ) -> tuple[AgenticToolCallResult, ...]:
        if len(tool_calls) > self._max_tool_calls:
            raise AgenticToolValidationError("AGENTIC_TOOL_CALL_BUDGET_EXCEEDED")

        results: list[AgenticToolCallResult] = []
        for call in tool_calls:
            capability = self._registry.capability(call.name)
            request = AgenticToolRequest.model_validate(
                {
                    "toolName": call.name,
                    "requestId": str(uuid4()),
                    "assessmentId": str(context.assessment_id),
                    "workflowRunId": str(context.workflow_run_id),
                    "artifactVersions": context.artifact_versions,
                    "correlationId": str(context.correlation_id),
                    "scope": context.scope,
                    "budget": {
                        "maxItems": _requested_max_items(call.arguments, capability.max_items),
                        "maxDepth": _requested_max_depth(call.arguments, capability.max_depth),
                        "maxBytes": capability.max_bytes,
                        "maxDurationMs": capability.max_duration_ms,
                    },
                    "input": call.arguments,
                }
            )
            response = self._registry.invoke_model_tool(request)
            results.append(
                AgenticToolCallResult(
                    call_id=call.call_id,
                    tool_name=call.name,
                    response=response,
                )
            )
        return tuple(results)


def _requested_max_items(arguments: dict[str, Any], server_cap: int) -> int:
    for key in ("maxResults", "maxNodes", "maxRuns", "maxNeighbors"):
        value = arguments.get(key)
        if isinstance(value, int) and not isinstance(value, bool):
            return max(1, min(server_cap, value))
    return max(1, server_cap)


def _requested_max_depth(arguments: dict[str, Any], server_cap: int) -> int:
    for key in ("maxDepth", "maxHops"):
        value = arguments.get(key)
        if isinstance(value, int) and not isinstance(value, bool):
            return max(0, min(server_cap, value))
    return max(0, server_cap)
