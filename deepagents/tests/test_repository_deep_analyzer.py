from __future__ import annotations

from unittest.mock import MagicMock

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
