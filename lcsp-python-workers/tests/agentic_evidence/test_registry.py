from __future__ import annotations

from uuid import uuid4

import pytest
from pydantic import ValidationError

from lcsp_workers.agentic_evidence.registry import (
    AgenticToolRequest,
    AgenticToolValidationError,
    build_sprint6_agentic_registry,
)


EXPECTED_TOOLS = {
    "resume_waiting_runs",
    "propose_gap_remediation",
    "get_gap_evidence_trace",
    "get_reconciliation_context",
    "request_targeted_reanalysis",
    "propose_missing_targets",
    "inspect_deployment_context",
    "inspect_decision_path",
    "get_artifact_chain",
    "find_similar_symbols",
    "inspect_human_review_path",
    "inspect_data_path",
    "find_provider_invocations",
    "get_finding_detail",
    "get_symbol_context",
    "get_scan_coverage",
    "search_evidence",
    "get_evidence_subgraph",
    "trace_static_flow",
}


def request_for(
    tool_name: str,
    *,
    max_items: int = 10,
    max_depth: int = 1,
    idempotency_key: str | None = None,
    artifact_versions: dict[str, str] | None = None,
    input_payload: dict | None = None,
) -> AgenticToolRequest:
    return AgenticToolRequest.model_validate(
        {
            "toolName": tool_name,
            "requestId": str(uuid4()),
            "assessmentId": str(uuid4()),
            "workflowRunId": str(uuid4()),
            "artifactVersions": artifact_versions or {"baselineId": "artifact-1"},
            "correlationId": str(uuid4()),
            "scope": {},
            "budget": {
                "maxItems": max_items,
                "maxDepth": max_depth,
                "maxBytes": 16_384,
                "maxDurationMs": 1_000,
            },
            "input": input_payload or {},
            "idempotencyKey": idempotency_key,
        }
    )


def test_sprint6_inventory_is_exact_and_unique() -> None:
    registry = build_sprint6_agentic_registry()
    assert set(registry.names()) == EXPECTED_TOOLS
    assert len(registry.names()) == len(EXPECTED_TOOLS)


def test_unknown_tool_fails_closed() -> None:
    registry = build_sprint6_agentic_registry()
    with pytest.raises(AgenticToolValidationError, match="UNREGISTERED_AGENTIC_TOOL"):
        registry.validate(request_for("read_repository_source"))


def test_budget_cannot_exceed_tool_capability() -> None:
    registry = build_sprint6_agentic_registry()
    request = request_for(
        "get_scan_coverage",
        max_items=101,
        artifact_versions={"technicalEvidenceReportId": "ter-1"},
    )
    with pytest.raises(AgenticToolValidationError, match="AGENTIC_TOOL_BUDGET_EXCEEDED"):
        registry.validate(request)


def test_required_pinned_artifact_is_enforced() -> None:
    registry = build_sprint6_agentic_registry()
    request = request_for("get_scan_coverage")
    with pytest.raises(
        AgenticToolValidationError,
        match="AGENTIC_TOOL_ARTIFACT_VERSION_REQUIRED",
    ):
        registry.validate(request)


def test_mutation_requires_idempotency_key() -> None:
    registry = build_sprint6_agentic_registry()
    request = request_for(
        "request_targeted_reanalysis",
        artifact_versions={"technicalEvidenceReportId": "ter-1"},
    )
    with pytest.raises(
        AgenticToolValidationError,
        match="AGENTIC_TOOL_IDEMPOTENCY_KEY_REQUIRED",
    ):
        registry.validate(request)


def test_read_tool_rejects_mutation_idempotency_key() -> None:
    registry = build_sprint6_agentic_registry()
    request = request_for(
        "get_scan_coverage",
        idempotency_key="request-12345",
        artifact_versions={"technicalEvidenceReportId": "ter-1"},
    )
    with pytest.raises(
        AgenticToolValidationError,
        match="AGENTIC_TOOL_READ_IDEMPOTENCY_KEY_NOT_ALLOWED",
    ):
        registry.validate(request)


@pytest.mark.parametrize(
    "unsafe_input",
    [
        {"raw_source": "const secret = true"},
        {"nested": {"prompt": "system prompt"}},
        {"path": "/var/lib/workspace/source.ts"},
        {"path": "../../secret"},
        {"endpoint": "https://example.invalid/arbitrary"},
    ],
)
def test_unsafe_agent_input_is_rejected(unsafe_input: dict) -> None:
    with pytest.raises(ValidationError):
        request_for(
            "search_evidence",
            input_payload=unsafe_input,
        )


def test_dispatch_requires_bound_handler_and_checks_output() -> None:
    registry = build_sprint6_agentic_registry()
    request = request_for(
        "get_scan_coverage",
        artifact_versions={"technicalEvidenceReportId": "ter-1"},
    )
    with pytest.raises(AgenticToolValidationError, match="AGENTIC_TOOL_HANDLER_NOT_BOUND"):
        registry.invoke(request)

    registry.register_handler(
        "get_scan_coverage",
        lambda _: {"status": "READY", "result": {"items": []}},
    )
    assert registry.invoke(request)["status"] == "READY"


def test_dispatch_blocks_forbidden_output_fields() -> None:
    registry = build_sprint6_agentic_registry()
    request = request_for(
        "get_scan_coverage",
        artifact_versions={"technicalEvidenceReportId": "ter-1"},
    )
    registry.register_handler(
        "get_scan_coverage",
        lambda _: {"status": "READY", "result": {"raw_source": "secret"}},
    )
    with pytest.raises(AgenticToolValidationError, match="AGENTIC_TOOL_UNSAFE_OUTPUT"):
        registry.invoke(request)
