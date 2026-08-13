from __future__ import annotations

from uuid import uuid4

import pytest

from lcsp_workers.agentic_evidence import (
    AgenticInvocationContext,
    AgenticToolResolver,
    AgenticToolValidationError,
    build_sprint6_agentic_registry,
)
from lcsp_workers.llm import LLMToolCall


def context() -> AgenticInvocationContext:
    return AgenticInvocationContext(
        assessment_id=uuid4(),
        workflow_run_id=uuid4(),
        correlation_id=uuid4(),
        artifact_versions={"technicalEvidenceReportId": "ter-1"},
        scope={"pathPrefixes": ["apps/api/"]},
    )


def test_resolver_exposes_exact_model_callable_catalog() -> None:
    registry = build_sprint6_agentic_registry()
    resolver = AgenticToolResolver(registry, max_tool_calls=4)
    names = {definition.name for definition in resolver.tool_definitions()}

    assert "resume_waiting_runs" not in names
    assert "request_targeted_reanalysis" not in names
    assert "get_scan_coverage" in names
    assert "search_evidence" in names
    assert len(names) == 17


def test_resolver_dispatches_validated_read_call() -> None:
    registry = build_sprint6_agentic_registry()
    registry.register_handler(
        "get_scan_coverage",
        lambda request: {
            "status": "READY",
            "result": {"maxResults": request.input["maxResults"]},
        },
    )
    resolver = AgenticToolResolver(registry, max_tool_calls=2)

    results = resolver.invoke_tool_calls(
        [
            LLMToolCall(
                name="get_scan_coverage",
                arguments={"maxResults": 25},
                call_id="call-1",
            )
        ],
        context=context(),
    )

    assert len(results) == 1
    assert results[0].call_id == "call-1"
    assert results[0].tool_name == "get_scan_coverage"
    assert results[0].response["result"]["maxResults"] == 25


def test_resolver_rejects_schema_invalid_call_before_handler() -> None:
    registry = build_sprint6_agentic_registry()
    called = False

    def handler(_request):
        nonlocal called
        called = True
        return {"status": "READY"}

    registry.register_handler("get_scan_coverage", handler)
    resolver = AgenticToolResolver(registry, max_tool_calls=2)

    with pytest.raises(
        AgenticToolValidationError,
        match="AGENTIC_TOOL_INPUT_SCHEMA_INVALID",
    ):
        resolver.invoke_tool_calls(
            [
                LLMToolCall(
                    name="get_scan_coverage",
                    arguments={"maxResults": 101},
                )
            ],
            context=context(),
        )
    assert called is False


def test_resolver_rejects_non_model_tool_even_if_registered() -> None:
    registry = build_sprint6_agentic_registry()
    registry.register_handler(
        "request_targeted_reanalysis",
        lambda _request: {"status": "READY"},
    )
    resolver = AgenticToolResolver(registry, max_tool_calls=2)

    with pytest.raises(
        AgenticToolValidationError,
        match="AGENTIC_TOOL_NOT_MODEL_CALLABLE",
    ):
        resolver.invoke_tool_calls(
            [
                LLMToolCall(
                    name="request_targeted_reanalysis",
                    arguments={
                        "inputArtifactVersion": "ter_12345678",
                        "analyzerId": "RUN_TS_JS_SEMANTIC_ANALYSIS",
                        "scope": {"pathPrefixes": ["apps/api/"]},
                        "reasonRequirementId": "requirement:12345678",
                        "idempotencyKey": "request_1234567890",
                    },
                )
            ],
            context=context(),
        )


def test_resolver_enforces_orchestration_call_count_budget() -> None:
    registry = build_sprint6_agentic_registry()
    resolver = AgenticToolResolver(registry, max_tool_calls=1)
    calls = [
        LLMToolCall(name="get_scan_coverage", arguments={"maxResults": 10}),
        LLMToolCall(name="search_evidence", arguments={"maxResults": 10}),
    ]

    with pytest.raises(
        AgenticToolValidationError,
        match="AGENTIC_TOOL_CALL_BUDGET_EXCEEDED",
    ):
        resolver.invoke_tool_calls(calls, context=context())
