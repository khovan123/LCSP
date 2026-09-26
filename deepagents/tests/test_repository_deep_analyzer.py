from __future__ import annotations

import json
from types import SimpleNamespace
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

    def fake_invoke_with_stream(agent, inputs, *, config, stage=None):
        calls["invoke"] = {
            "agent": agent,
            "inputs": inputs,
            "config": config,
            "stage": stage,
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
    assert invoke["stage"] == "SCANNER"
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

    def fake_invoke_with_stream(agent, inputs, *, config, stage=None):
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


def _ai_absent_result() -> dict[str, object]:
    result = _valid_repository_result()
    result["coverage_state"] = "READY"
    result["unresolved_frontiers"] = []
    result["ai_discovery"] = {
        "gate": "AI_ABSENT_CONFIRMED",
        "coverage_state": "READY",
        "findings": [],
        "material_unresolved_frontiers": [],
    }
    return result


def _enforce(tmp_path, files: dict[str, str]):
    from tools.common.capabilities.evidence.repository_analysis.analyzer import (
        enforce_ai_absence_backstop,
    )
    from tools.common.capabilities.evidence.repository_analysis.models import (
        RepositoryAnalysisResult,
    )

    for relative, content in files.items():
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    backend = LocalShellBackend(root_dir=str(tmp_path), virtual_mode=True)
    return enforce_ai_absence_backstop(
        backend, RepositoryAnalysisResult.model_validate(_ai_absent_result())
    )


def test_ai_absent_claim_contradicted_by_sdk_import_is_downgraded(tmp_path) -> None:
    # Regression: scan d880c2f5 declared AI_ABSENT_CONFIRMED for a repository whose
    # runtime imports AI SDKs, dismissing them as "development harness code".
    result = _enforce(
        tmp_path,
        {
            "app.py": "app = object()\n",
            "agent/runtime.py": "from langchain_openai import ChatOpenAI\n",
            "web/src/client.ts": 'import OpenAI from "openai";\n',
        },
    )

    discovery = result.ai_discovery
    assert discovery.gate == "AI_UNKNOWN"
    providers = {finding.provider for finding in discovery.findings}
    assert {"langchain", "openai"} <= providers
    assert all(finding.state == "AI_PROVIDER_REFERENCE" for finding in discovery.findings)
    # The full scan already failed to trace these calls; a technical rerun would repeat
    # the miss, so production use is a Customer question (assessment 7976a135).
    assert all(finding.clarification_owner == "CUSTOMER" for finding in discovery.findings)
    assert all(
        finding.clarification_kind == "OUTBOUND_AI_CONFIRMATION" for finding in discovery.findings
    )
    anchors = {anchor.anchor_id: anchor for anchor in result.source_anchors}
    for finding in discovery.findings:
        anchor = anchors[finding.anchor_id]
        assert anchor.file_path in {"agent/runtime.py", "web/src/client.ts"}
        assert anchor.start_line == 1
    assert discovery.material_unresolved_frontiers == []
    assert any(
        "AI_ABSENT_CONFIRMED" in note and "agent/runtime.py:1" in note
        for note in result.coverage_notes
    )


def test_ai_absent_claim_contradicted_by_manifest_dependency_is_downgraded(tmp_path) -> None:
    result = _enforce(
        tmp_path,
        {
            "app.py": "app = object()\n",
            "package.json": '{"dependencies": {"@google/genai": "^1.0.0"}}\n',
        },
    )

    assert result.ai_discovery.gate == "AI_UNKNOWN"
    assert [finding.provider for finding in result.ai_discovery.findings] == ["google-genai"]


def test_vendored_and_test_only_references_do_not_contradict_absence(tmp_path) -> None:
    result = _enforce(
        tmp_path,
        {
            "app.py": "app = object()\n",
            "node_modules/openai/index.js": 'module.exports = require("openai");\n',
            "tests/test_fixture.py": "import openai\n",
        },
    )

    assert result.ai_discovery.gate == "AI_ABSENT_CONFIRMED"
    assert result.ai_discovery.findings == []


def test_clean_repository_keeps_ai_absent_confirmed(tmp_path) -> None:
    result = _enforce(tmp_path, {"app.py": "app = object()\n"})

    assert result.ai_discovery.gate == "AI_ABSENT_CONFIRMED"


def test_absence_backstop_fails_closed_when_search_errors(tmp_path) -> None:
    from tools.common.capabilities.evidence.repository_analysis.analyzer import (
        enforce_ai_absence_backstop,
    )
    from tools.common.capabilities.evidence.repository_analysis.models import (
        RepositoryAnalysisResult,
    )

    class BrokenBackend:
        def grep(self, *_args, **_kwargs):
            return SimpleNamespace(error="sandbox unavailable", matches=None, truncated=False)

    result = enforce_ai_absence_backstop(
        BrokenBackend(), RepositoryAnalysisResult.model_validate(_ai_absent_result())
    )

    assert result.ai_discovery.gate == "AI_UNKNOWN"
    assert result.ai_discovery.material_unresolved_frontiers


def test_non_absent_results_are_untouched(tmp_path) -> None:
    from tools.common.capabilities.evidence.repository_analysis.analyzer import (
        enforce_ai_absence_backstop,
    )
    from tools.common.capabilities.evidence.repository_analysis.models import (
        RepositoryAnalysisResult,
    )

    original = RepositoryAnalysisResult.model_validate(_valid_repository_result())

    assert enforce_ai_absence_backstop(MagicMock(), original) is original


def _compiled_subagent_middleware(monkeypatch) -> dict[str, list[str]]:
    """Record the middleware Deep Agents actually compiles into each subagent."""
    from deepagents.middleware import subagents as deep_subagents

    compiled: dict[str, list[str]] = {}
    real_create_agent = deep_subagents.create_agent

    def recording_create_agent(model, **kwargs):
        compiled[kwargs["name"]] = [type(item).__name__ for item in kwargs["middleware"]]
        return real_create_agent(model, **kwargs)

    monkeypatch.setattr(deep_subagents, "create_agent", recording_create_agent)
    return compiled


_GOVERNANCE_MIDDLEWARE = {
    "BillingAgentRoleMiddleware",
    "ModelRetryMiddleware",
    "ProviderFallbackMiddleware",
    "TokenFallbackMiddleware",
    "BillingMeteringMiddleware",
}


def test_repository_analyst_task_subagents_run_under_model_governance(
    monkeypatch,
    tmp_path,
) -> None:
    """A `task` subagent model call must rotate/fall back/meter like the analyst's own.

    Regression: the auto-added general-purpose subagent inherited none of the
    LCSP governance middleware, so one provider timeout inside it failed the scan.
    """
    compiled = _compiled_subagent_middleware(monkeypatch)
    monkeypatch.setattr(analyzer, "configure_lcsp_harness", lambda: None)
    monkeypatch.setattr(
        analyzer,
        "resolve_agent_model",
        lambda *, agent_name, model_spec: _NeverCalledModel(),
    )
    monkeypatch.setattr(
        analyzer,
        "invoke_with_stream",
        lambda agent, inputs, *, config, stage=None: {
            "structured_response": _valid_repository_result()
        },
    )

    RepositoryDeepAnalyzer()._invoke(
        LocalShellBackend(tmp_path, inherit_env=False, timeout=5),
        snapshot_id="snapshot-governed",
        commit_sha="abc1234",
        scan_job_id="scan-governed",
        targeted_scope=None,
    )

    assert {"general-purpose", "repository-explorer"} <= compiled.keys()
    for name, middleware in compiled.items():
        missing = _GOVERNANCE_MIDDLEWARE - set(middleware)
        assert not missing, f"subagent {name} runs without {sorted(missing)}"


class _NeverCalledModel(BaseChatModel):
    @property
    def _llm_type(self) -> str:
        return "never-called"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        raise AssertionError("graph construction must not call the model")


def test_repository_analyst_task_subagent_timeout_falls_back_to_next_provider(
    monkeypatch,
    tmp_path,
) -> None:
    """Scan b09a3da2 regression: a timed-out `task` subagent call uses provider fallback.

    Before the fix the general-purpose subagent had no governance middleware, so
    the primary provider's OpenAITimeoutError escaped `task` and failed the scan.
    """
    import httpx2
    from langchain_openai.chat_models.base import OpenAITimeoutError

    from middleware import provider_fallback

    subagent_description = "Locate every AI SDK import under src/"

    class ScriptedModel(BaseChatModel):
        subagent_calls: int = 0
        parent_calls: int = 0
        subagent_times_out: bool = False
        # Native structured output, as in the managed-graph smoke test above.
        __module__ = "langchain_google_genai.chat_models"

        @property
        def _llm_type(self) -> str:
            return "scripted"

        def bind_tools(self, tools, **kwargs):
            return self

        def _generate(self, messages, stop=None, run_manager=None, **kwargs):
            if messages and messages[-1].type == "human" and messages[-1].content == subagent_description:
                self.subagent_calls += 1
                if self.subagent_times_out:
                    raise OpenAITimeoutError(
                        request=httpx2.Request("POST", "https://provider.invalid/v1/chat/completions")
                    )
                message = AIMessage(content="No AI SDK imports under src/.")
            else:
                self.parent_calls += 1
                if self.parent_calls == 1:
                    message = AIMessage(
                        content="",
                        tool_calls=[
                            {
                                "name": "task",
                                "args": {
                                    "description": subagent_description,
                                    "subagent_type": "general-purpose",
                                },
                                "id": "call_task_1",
                                "type": "tool_call",
                            }
                        ],
                    )
                else:
                    message = AIMessage(content=json.dumps(_valid_repository_result()))
            return ChatResult(generations=[ChatGeneration(message=message)])

    ScriptedModel.model_rebuild()
    primary = ScriptedModel(subagent_times_out=True)
    fallback = ScriptedModel()
    monkeypatch.setattr(provider_fallback, "configured_fallback_providers", lambda: ("llm7",))
    monkeypatch.setattr(provider_fallback, "fallback_model", lambda provider: fallback)
    monkeypatch.setattr(analyzer, "configure_lcsp_harness", lambda: None)
    monkeypatch.setattr(
        analyzer,
        "resolve_agent_model",
        lambda *, agent_name, model_spec: primary,
    )

    result = RepositoryDeepAnalyzer()._invoke(
        LocalShellBackend(tmp_path, inherit_env=False, timeout=5),
        snapshot_id="snapshot-timeout",
        commit_sha="abc1234",
        scan_job_id="scan-timeout",
        targeted_scope=None,
    )

    assert result.summary == "Tiny repository inspected through managed Deep Agent graph"
    assert primary.subagent_calls == 1
    assert fallback.subagent_calls == 1
    assert primary.parent_calls == 2


def test_evidence_graph_carries_content_hash_that_investigation_accepts(tmp_path) -> None:
    # Regression: the Deep Agent analyzer emitted graph_hash="" so every
    # post-Interview investigation stopped on "provenance is incomplete".
    from tools.common.capabilities.assessment.investigation.engineering_rule.pipeline import (
        EngineeringInvestigationPipeline,
    )
    from tools.common.capabilities.evidence.graph.schema.models import (
        program_graph_content_hash,
    )

    payload = _evidence_payload_for(tmp_path, _valid_repository_result())
    graph = payload["evidence_graph"]

    assert graph["graph_hash"].startswith("sha256:")
    assert graph["graph_hash"] == program_graph_content_hash(graph)
    parsed = EngineeringInvestigationPipeline._graph({"evidence_payload": payload})
    assert parsed.graph_id == "deep-agent:scan-1"
    assert parsed.graph_hash == graph["graph_hash"]
