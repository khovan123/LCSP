from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from deepagents.backends import LocalShellBackend
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field

from tools.common.capabilities.evidence.repository_analysis import analyzer
from tools.common.capabilities.evidence.repository_analysis.analyzer import (
    RepositoryDeepAnalyzer,
)


def test_repository_deep_analyzer_runs_as_standalone_root_without_checkpointer(
    monkeypatch,
) -> None:
    calls: dict[str, object] = {}
    fake_agent = object()
    fake_backend = MagicMock()

    monkeypatch.setattr(analyzer, "configure_lcsp_harness", lambda: None)
    monkeypatch.setattr(
        analyzer,
        "resolve_agent_model",
        lambda *, agent_name, model_spec: "fake-model",
    )

    def fake_create_deep_agent(**kwargs):
        calls["create_kwargs"] = kwargs
        return fake_agent

    def fake_invoke_with_stream(agent, inputs, *, config):
        calls["invoke"] = {
            "agent": agent,
            "inputs": inputs,
            "config": config,
        }
        return {
            "structured_response": {
                "summary": "Repository inspected",
                "coverage_state": "PARTIAL",
                "coverage_notes": ["unit test"],
                "languages": [],
                "frameworks": [],
                "source_anchors": [],
                "nodes": [],
                "edges": [],
                "unresolved_frontiers": ["not executed"],
                "ai_discovery": {
                    "gate": "AI_UNKNOWN",
                    "coverage_state": "PARTIAL",
                    "findings": [],
                    "material_unresolved_frontiers": ["not executed"],
                },
            }
        }

    monkeypatch.setattr(analyzer, "create_deep_agent", fake_create_deep_agent)
    monkeypatch.setattr(analyzer, "invoke_with_stream", fake_invoke_with_stream)

    result = RepositoryDeepAnalyzer()._invoke(
        fake_backend,
        snapshot_id="snapshot-1",
        commit_sha="abc1234",
        scan_job_id="scan-1",
        targeted_scope=None,
    )

    create_kwargs = calls["create_kwargs"]
    assert isinstance(create_kwargs, dict)
    assert create_kwargs["name"] == "repository-analyst"
    assert create_kwargs["backend"] is fake_backend
    assert "checkpointer" not in create_kwargs
    invoke = calls["invoke"]
    assert isinstance(invoke, dict)
    assert invoke["agent"] is fake_agent
    assert invoke["config"]["configurable"]["thread_id"] == (
        "repository-analysis:scan-1"
    )
    assert result.summary == "Repository inspected"


def test_repository_deep_analyzer_allows_more_than_two_model_calls(
    monkeypatch,
) -> None:
    calls: dict[str, object] = {}
    fake_agent = object()
    fake_backend = MagicMock()
    simulated_model_calls = 0

    monkeypatch.setattr(analyzer, "configure_lcsp_harness", lambda: None)
    monkeypatch.setattr(
        analyzer,
        "resolve_agent_model",
        lambda *, agent_name, model_spec: "fake-model",
    )

    def fake_create_deep_agent(**kwargs):
        calls["create_kwargs"] = kwargs
        return fake_agent

    def fake_invoke_with_stream(agent, inputs, *, config):
        nonlocal simulated_model_calls
        for _ in range(3):
            simulated_model_calls += 1
        return {
            "structured_response": {
                "summary": "Repository inspected after extended analysis",
                "coverage_state": "PARTIAL",
                "coverage_notes": ["more than two model calls were required"],
                "languages": [],
                "frameworks": [],
                "source_anchors": [],
                "nodes": [],
                "edges": [],
                "unresolved_frontiers": ["not executed"],
                "ai_discovery": {
                    "gate": "AI_UNKNOWN",
                    "coverage_state": "PARTIAL",
                    "findings": [],
                    "material_unresolved_frontiers": ["not executed"],
                },
            }
        }

    monkeypatch.setattr(analyzer, "create_deep_agent", fake_create_deep_agent)
    monkeypatch.setattr(analyzer, "invoke_with_stream", fake_invoke_with_stream)

    result = RepositoryDeepAnalyzer()._invoke(
        fake_backend,
        snapshot_id="snapshot-1",
        commit_sha="abc1234",
        scan_job_id="scan-extended",
        targeted_scope=None,
    )

    create_kwargs = calls["create_kwargs"]
    assert isinstance(create_kwargs, dict)
    middleware_names = {
        type(item).__name__ for item in create_kwargs["middleware"]
    }
    assert "ModelCallLimitMiddleware" not in middleware_names
    assert simulated_model_calls == 3
    assert result.summary == "Repository inspected after extended analysis"


def test_repository_deep_analyzer_revalidates_structured_response_contract(
    monkeypatch,
) -> None:
    fake_agent = object()
    fake_backend = MagicMock()

    monkeypatch.setattr(analyzer, "configure_lcsp_harness", lambda: None)
    monkeypatch.setattr(
        analyzer,
        "resolve_agent_model",
        lambda *, agent_name, model_spec: "fake-model",
    )
    monkeypatch.setattr(
        analyzer,
        "create_deep_agent",
        lambda **_kwargs: fake_agent,
    )
    monkeypatch.setattr(
        analyzer,
        "invoke_with_stream",
        lambda *_args, **_kwargs: {
            "structured_response": {
                "summary": "Invalid repository result",
                "coverage_state": "READY",
                "coverage_notes": [],
                "languages": [],
                "frameworks": [],
                "source_anchors": [],
                "nodes": [],
                "edges": [],
                "unresolved_frontiers": ["not allowed for absent closure"],
                "ai_discovery": {
                    "gate": "AI_ABSENT_CONFIRMED",
                    "coverage_state": "READY",
                    "findings": [],
                    "material_unresolved_frontiers": [],
                },
            }
        },
    )

    with pytest.raises(Exception, match="AI_ABSENT_CONFIRMED"):
        RepositoryDeepAnalyzer()._invoke(
            fake_backend,
            snapshot_id="snapshot-1",
            commit_sha="abc1234",
            scan_job_id="scan-invalid",
            targeted_scope=None,
        )


def test_repository_deep_analyzer_create_deep_agent_smoke_uses_gemini_native_output(
    monkeypatch,
    tmp_path,
) -> None:
    """Exercise the managed repository analyzer graph through a tool turn and final result."""

    class FakeGeminiModel(BaseChatModel):
        calls: int = 0
        seen_bind_kwargs: list[dict[str, object]] = Field(default_factory=list)
        __module__ = "langchain_google_genai.chat_models"

        @property
        def _llm_type(self) -> str:
            return "fake-gemini"

        def bind_tools(self, tools, **kwargs):
            self.seen_bind_kwargs.append(dict(kwargs))
            return self

        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            self.calls += 1
            if self.calls == 1:
                message = AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "name": "ls",
                            "args": {"path": "/"},
                            "id": "call_ls_1",
                            "type": "tool_call",
                        }
                    ],
                )
            else:
                message = AIMessage(content=json.dumps(_valid_repository_result()))
            return ChatResult(generations=[ChatGeneration(message=message)])

    FakeGeminiModel.model_rebuild()
    model = FakeGeminiModel()
    monkeypatch.setattr(analyzer, "configure_lcsp_harness", lambda: None)
    monkeypatch.setattr(
        analyzer,
        "resolve_agent_model",
        lambda *, agent_name, model_spec: model,
    )
    (tmp_path / "app.py").write_text("print('hello')\n", encoding="utf-8")

    result = RepositoryDeepAnalyzer()._invoke(
        LocalShellBackend(tmp_path, inherit_env=False, timeout=5),
        snapshot_id="snapshot-smoke",
        commit_sha="abc1234",
        scan_job_id="scan-smoke",
        targeted_scope=None,
    )

    assert result.summary == "Tiny repository inspected through managed Deep Agent graph"
    assert result.ai_discovery.gate == "AI_UNKNOWN"
    assert model.calls == 2
    response_formats = [
        kwargs.get("response_format")
        for kwargs in model.seen_bind_kwargs
        if kwargs.get("response_format") is not None
    ]
    assert response_formats
    assert all(item["type"] == "json_schema" for item in response_formats)
    assert all(
        "additionalProperties" not in json.dumps(item)
        for item in response_formats
    )
    assert all(
        kwargs.get("automatic_function_calling") == {"disable": True}
        for kwargs in model.seen_bind_kwargs
    )


def _valid_repository_result() -> dict[str, object]:
    return {
        "summary": "Tiny repository inspected through managed Deep Agent graph",
        "coverage_state": "PARTIAL",
        "coverage_notes": ["bounded local smoke"],
        "languages": ["Python"],
        "frameworks": [],
        "source_anchors": [
            {
                "anchor_id": "a1",
                "file_path": "app.py",
                "start_line": 1,
                "end_line": 1,
                "symbol_ref": "app",
            }
        ],
        "nodes": [
            {
                "node_id": "n1",
                "node_type": "MODULE",
                "label": "app.py",
                "semantic_types": ["python_module"],
                "anchor_id": "a1",
                "resolution_state": "OBSERVED",
            }
        ],
        "edges": [],
        "unresolved_frontiers": ["bounded local smoke did not run exhaustive scan"],
        "ai_discovery": {
            "gate": "AI_UNKNOWN",
            "coverage_state": "PARTIAL",
            "findings": [],
            "material_unresolved_frontiers": [
                "bounded local smoke did not run exhaustive scan"
            ],
        },
    }


def _evidence_payload_for(tmp_path, result: dict[str, object]) -> dict[str, object]:
    from tools.common.capabilities.evidence.repository_analysis.models import (
        RepositoryAnalysisResult,
    )

    (tmp_path / "app.py").write_text("app = object()\n", encoding="utf-8")
    return RepositoryDeepAnalyzer._evidence_payload(
        LocalShellBackend(root_dir=str(tmp_path), virtual_mode=True),
        RepositoryAnalysisResult.model_validate(result),
        snapshot_id="snapshot-1",
        commit_sha="abc1234",
        scan_job_id="scan-1",
    )


def test_partial_evidence_payload_carries_interview_coverage_policy(tmp_path) -> None:
    # Regression: the Deep Agent scanner migration dropped the scanner-workflow
    # policy, so PARTIAL reports could never start Initial Interview.
    from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
        _can_start_initial_interview,
        _technical_coverage,
    )

    payload = _evidence_payload_for(tmp_path, _valid_repository_result())

    policy = payload["partialCoveragePolicyDecision"]
    assert policy["permittedForInterview"] is True
    assert policy["policyVersion"] == "initial-interview-bounded-evidence-v1"
    assert policy["policyDecisionRef"].startswith("coverage-policy:")
    assert policy["limitations"] == ["bounded local smoke"]
    report = {"evidence_payload": payload}
    coverage_state, coverage_notes = _technical_coverage(report)
    assert coverage_state == "PARTIAL"
    assert _can_start_initial_interview(coverage_state, coverage_notes, report) is True


def test_partial_evidence_payload_without_evidence_does_not_permit_interview(tmp_path) -> None:
    from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
        _can_start_initial_interview,
        _technical_coverage,
    )

    result = _valid_repository_result()
    result["source_anchors"] = []
    result["nodes"] = []

    payload = _evidence_payload_for(tmp_path, result)

    assert payload["partialCoveragePolicyDecision"]["permittedForInterview"] is False
    report = {"evidence_payload": payload}
    coverage_state, coverage_notes = _technical_coverage(report)
    assert _can_start_initial_interview(coverage_state, coverage_notes, report) is False


def test_ready_evidence_payload_needs_no_partial_coverage_policy(tmp_path) -> None:
    result = _valid_repository_result()
    result["coverage_state"] = "READY"

    payload = _evidence_payload_for(tmp_path, result)

    assert "partialCoveragePolicyDecision" not in payload
