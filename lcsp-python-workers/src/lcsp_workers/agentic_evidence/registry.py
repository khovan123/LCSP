from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AgenticToolValidationError(ValueError):
    """Safe validation failure raised before an agentic tool handler is dispatched."""


class AgenticToolBudget(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    max_items: int = Field(alias="maxItems", ge=1, le=500)
    max_depth: int = Field(alias="maxDepth", ge=0, le=20)
    max_bytes: int = Field(alias="maxBytes", ge=1, le=1_048_576)
    max_duration_ms: int = Field(alias="maxDurationMs", ge=1, le=60_000)


class AgenticToolRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    tool_name: str = Field(alias="toolName", min_length=1, max_length=100)
    request_id: UUID = Field(alias="requestId")
    assessment_id: UUID = Field(alias="assessmentId")
    workflow_run_id: UUID = Field(alias="workflowRunId")
    artifact_versions: dict[str, str] = Field(alias="artifactVersions", min_length=1)
    correlation_id: UUID = Field(alias="correlationId")
    scope: dict[str, Any] = Field(default_factory=dict)
    budget: AgenticToolBudget
    input: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(
        default=None,
        alias="idempotencyKey",
        min_length=8,
        max_length=200,
    )

    @field_validator("artifact_versions")
    @classmethod
    def validate_artifact_versions(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 20:
            raise ValueError("artifactVersions exceeds the maximum number of pinned refs")
        if any(not key.strip() or not ref.strip() for key, ref in value.items()):
            raise ValueError("artifactVersions must contain non-empty names and refs")
        return value

    @field_validator("scope", "input")
    @classmethod
    def validate_safe_projection(cls, value: dict[str, Any]) -> dict[str, Any]:
        _assert_safe_agent_input(value)
        return value


@dataclass(frozen=True)
class AgenticToolCapability:
    name: str
    mutation: bool
    max_items: int
    max_depth: int
    max_bytes: int
    max_duration_ms: int
    required_artifacts: tuple[str, ...] = ()


AgenticToolHandler = Callable[[AgenticToolRequest], Mapping[str, Any]]


# Sprint 6 runtime inventory requested by the delivery scope. These names are exact
# contract values; aliases and free-form tool names are intentionally unsupported.
SPRINT6_AGENTIC_CAPABILITIES: tuple[AgenticToolCapability, ...] = (
    AgenticToolCapability("resume_waiting_runs", True, 100, 1, 131_072, 10_000),
    AgenticToolCapability("propose_gap_remediation", False, 50, 2, 131_072, 5_000),
    AgenticToolCapability("get_gap_evidence_trace", False, 100, 5, 262_144, 5_000),
    AgenticToolCapability("get_reconciliation_context", False, 100, 3, 262_144, 5_000),
    AgenticToolCapability(
        "request_targeted_reanalysis",
        True,
        100,
        3,
        131_072,
        10_000,
        ("technicalEvidenceReportId",),
    ),
    AgenticToolCapability(
        "propose_missing_targets",
        False,
        100,
        3,
        262_144,
        5_000,
        ("technicalEvidenceReportId",),
    ),
    AgenticToolCapability(
        "inspect_deployment_context",
        False,
        100,
        5,
        262_144,
        5_000,
        ("technicalEvidenceReportId",),
    ),
    AgenticToolCapability("inspect_decision_path", False, 100, 20, 262_144, 5_000),
    AgenticToolCapability("get_artifact_chain", False, 100, 10, 262_144, 5_000),
    AgenticToolCapability("find_similar_symbols", False, 100, 3, 262_144, 5_000),
    AgenticToolCapability("inspect_human_review_path", False, 100, 20, 262_144, 5_000),
    AgenticToolCapability("inspect_data_path", False, 100, 20, 262_144, 5_000),
    AgenticToolCapability("find_provider_invocations", False, 100, 3, 262_144, 5_000),
    AgenticToolCapability("get_finding_detail", False, 50, 3, 262_144, 5_000),
    AgenticToolCapability("get_symbol_context", False, 50, 3, 262_144, 5_000),
    AgenticToolCapability(
        "get_scan_coverage",
        False,
        100,
        1,
        262_144,
        2_000,
        ("technicalEvidenceReportId",),
    ),
    AgenticToolCapability("search_evidence", False, 100, 3, 262_144, 5_000),
    AgenticToolCapability("get_evidence_subgraph", False, 100, 3, 262_144, 5_000),
    AgenticToolCapability("trace_static_flow", False, 100, 20, 262_144, 5_000),
)


class AgenticToolRegistry:
    """Fail-closed allow-list and dispatcher for LLM-callable Sprint 6 tools."""

    def __init__(self, capabilities: tuple[AgenticToolCapability, ...]) -> None:
        self._capabilities = {capability.name: capability for capability in capabilities}
        if len(self._capabilities) != len(capabilities):
            raise ValueError("agentic tool capability names must be unique")
        self._handlers: dict[str, AgenticToolHandler] = {}

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._capabilities))

    def capability(self, name: str) -> AgenticToolCapability:
        capability = self._capabilities.get(name)
        if capability is None:
            raise AgenticToolValidationError("UNREGISTERED_AGENTIC_TOOL")
        return capability

    def register_handler(self, name: str, handler: AgenticToolHandler) -> None:
        self.capability(name)
        if name in self._handlers:
            raise AgenticToolValidationError("AGENTIC_TOOL_HANDLER_ALREADY_REGISTERED")
        self._handlers[name] = handler

    def validate(self, request: AgenticToolRequest) -> AgenticToolCapability:
        capability = self.capability(request.tool_name)
        budget = request.budget
        if (
            budget.max_items > capability.max_items
            or budget.max_depth > capability.max_depth
            or budget.max_bytes > capability.max_bytes
            or budget.max_duration_ms > capability.max_duration_ms
        ):
            raise AgenticToolValidationError("AGENTIC_TOOL_BUDGET_EXCEEDED")

        missing_artifacts = [
            artifact
            for artifact in capability.required_artifacts
            if not request.artifact_versions.get(artifact)
        ]
        if missing_artifacts:
            raise AgenticToolValidationError("AGENTIC_TOOL_ARTIFACT_VERSION_REQUIRED")

        if capability.mutation and not request.idempotency_key:
            raise AgenticToolValidationError("AGENTIC_TOOL_IDEMPOTENCY_KEY_REQUIRED")
        if not capability.mutation and request.idempotency_key:
            raise AgenticToolValidationError("AGENTIC_TOOL_READ_IDEMPOTENCY_KEY_NOT_ALLOWED")
        return capability

    def invoke(self, request: AgenticToolRequest) -> Mapping[str, Any]:
        self.validate(request)
        handler = self._handlers.get(request.tool_name)
        if handler is None:
            raise AgenticToolValidationError("AGENTIC_TOOL_HANDLER_NOT_BOUND")
        response = handler(request)
        _assert_safe_agent_output(response)
        return response


def build_sprint6_agentic_registry() -> AgenticToolRegistry:
    return AgenticToolRegistry(SPRINT6_AGENTIC_CAPABILITIES)


_FORBIDDEN_KEYS = {
    "source",
    "source_code",
    "raw_source",
    "raw_content",
    "full_source",
    "prompt",
    "prompt_text",
    "full_prompt",
    "ast_body",
    "full_ast",
    "ast_dump",
    "secret",
    "token",
    "api_key",
    "api_token",
    "authorization",
    "credential",
    "password",
    "url",
    "command",
    "shell",
}


def _assert_safe_agent_input(value: Any, *, key: str | None = None) -> None:
    if key is not None:
        normalized_key = key.replace("-", "_").lower()
        if normalized_key in _FORBIDDEN_KEYS:
            raise ValueError(f"forbidden agentic tool input field: {normalized_key}")

    if isinstance(value, dict):
        for nested_key, nested_value in value.items():
            _assert_safe_agent_input(nested_value, key=str(nested_key))
        return
    if isinstance(value, (list, tuple)):
        for nested_value in value:
            _assert_safe_agent_input(nested_value)
        return
    if not isinstance(value, str):
        return

    normalized = value.replace("\\", "/")
    if normalized.startswith("/") or normalized.startswith("~/"):
        raise ValueError("absolute paths are forbidden in agentic tool input")
    if ".." in normalized.split("/"):
        raise ValueError("parent path traversal is forbidden in agentic tool input")
    if "://" in normalized:
        raise ValueError("arbitrary URLs are forbidden in agentic tool input")


def _assert_safe_agent_output(value: Any, *, key: str | None = None) -> None:
    if key is not None and key.replace("-", "_").lower() in _FORBIDDEN_KEYS:
        raise AgenticToolValidationError("AGENTIC_TOOL_UNSAFE_OUTPUT")
    if isinstance(value, Mapping):
        for nested_key, nested_value in value.items():
            _assert_safe_agent_output(nested_value, key=str(nested_key))
    elif isinstance(value, (list, tuple)):
        for nested_value in value:
            _assert_safe_agent_output(nested_value)
