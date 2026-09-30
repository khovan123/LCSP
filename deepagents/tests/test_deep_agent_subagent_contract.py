from __future__ import annotations

import importlib
from pathlib import Path

import pytest

import harness
import model_policy
from middleware.agent_run_budget import AgentRunBudgetMiddleware
from middleware.tool_scope import AllowedToolsMiddleware
from middleware.interview_runtime_context import inject_interview_runtime_context
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE, TRIAGE_MODEL_GOVERNANCE_MIDDLEWARE
from middleware.billing_metering import BillingAgentRoleMiddleware
from middleware.triage_progress import require_triage_progress
from middleware.runtime_context import inject_lcsp_runtime_context
from model_policy import (
    ALL_LCSP_MODEL_SPECS,
    DEFAULT_INTERVIEW_MODEL_SPEC,
    DEFAULT_REPOSITORY_ANALYST_MODEL_SPEC,
    DEFAULT_NARRATOR_MODEL_SPEC,
    DEFAULT_REASONING_EFFORT,
    DEFAULT_ROOT_MODEL_SPEC,
    DEFAULT_TRIAGE_MODEL_SPEC,
    INTERVIEW_MODEL_SPEC,
    NARRATOR_MODEL_SPEC,
    REPOSITORY_ANALYST_MODEL_SPEC,
    REASONING_EFFORT,
    RESPONSES_OUTPUT_VERSION,
    ROOT_MODEL_SPEC,
    TRIAGE_MODEL_SPEC,
    _model_spec,
    _reasoning_effort_status,
    effective_model_configs,
    model_init_kwargs_for_agent,
    openai_responses_base_init_kwargs,
    openai_responses_init_kwargs,
    reasoning_policy_for_agent,
    supports_openai_reasoning,
)
from subagents import FLOW_SUBAGENTS
from contracts.handoffs import (
    InterviewResult,
    SPECIALIST_RESPONSE_FORMATS,
    TriageResult,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _tool_names(subagent: dict[str, object]) -> tuple[str, ...]:
    return tuple(str(getattr(tool, "name")) for tool in subagent["tools"])


def test_subagents_follow_deep_agents_dictionary_contract() -> None:
    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}
    assert tuple(by_name) == ("triage", "interview", "repository-analyst")

    expected_models = {
        "triage": TRIAGE_MODEL_SPEC,
        "interview": INTERVIEW_MODEL_SPEC,
        "repository-analyst": REPOSITORY_ANALYST_MODEL_SPEC,
    }
    for name, subagent in by_name.items():
        assert {
            "name",
            "description",
            "system_prompt",
            "tools",
            "model",
            "middleware",
        } <= set(subagent)
        assert subagent["model"] == expected_models[name]
        assert str(subagent["system_prompt"]).strip()
        assert len(str(subagent["description"])) >= 80
        if name == "interview":
            expected_prefix = [inject_interview_runtime_context]
            expected_governance = MODEL_GOVERNANCE_MIDDLEWARE
        elif name == "triage":
            expected_prefix = [require_triage_progress]
            expected_governance = TRIAGE_MODEL_GOVERNANCE_MIDDLEWARE
        else:
            expected_prefix = [inject_lcsp_runtime_context]
            expected_governance = MODEL_GOVERNANCE_MIDDLEWARE
        middleware = subagent["middleware"]
        if name == "interview":
            # The Interview resolves Customer-owned gaps only: no repository
            # tools at all, and one model call per turn.
            assert isinstance(middleware[0], AllowedToolsMiddleware)
            assert middleware[0].allowed == frozenset()
            assert isinstance(middleware[1], AgentRunBudgetMiddleware)
            assert middleware[1].finalize_after == 1
            middleware = middleware[2:]
        if name == "repository-analyst":
            # Exploring role: bounded by a model-call budget, but the budget's finalize
            # phase must keep the governed submit tool so a budget hit can still report.
            budgets = [item for item in middleware if isinstance(item, AgentRunBudgetMiddleware)]
            assert len(budgets) == 1
            assert "submit_rule_assessment" in budgets[0].finalize_tools
            middleware = [item for item in middleware if item is not budgets[0]]
        else:
            assert not any(
                isinstance(item, AgentRunBudgetMiddleware) for item in middleware[1:]
            ) or name == "interview"
        assert middleware[:1] == expected_prefix
        role_middleware = middleware[1]
        assert isinstance(role_middleware, BillingAgentRoleMiddleware)
        assert role_middleware.agent_role == name
        assert middleware[2:] == list(expected_governance)


def test_pipeline_roles_do_not_receive_customer_context_or_resolver_tools() -> None:
    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}

    assert _tool_names(by_name["triage"]) == (
        "maintain_legal_catalog",
        "get_legal_rule_triage_work_items",
        "persist_legal_rule_triage_result",
        "finish_legal_rule_triage_execution",
    )
    # Repository exploration comes from native Deep Agents filesystem/shell/task tools
    # plus typed queries over the pre-indexed Codebase Memory graph, not PGE wrappers.
    assert _tool_names(by_name["interview"]) == ()
    assert _tool_names(by_name["repository-analyst"]) == (
        "search_code_graph",
        "trace_call_path",
        "get_code_snippet",
        "search_code_text",
        "get_repository_architecture",
        "cite_repository_source",
        "submit_rule_assessment",
        "retrieve_verified_episodes",
    )
    assert "get_assessment_context" not in _tool_names(by_name["repository-analyst"])
    assert "retrieve_legal_basis" not in _tool_names(by_name["repository-analyst"])

    # LCSP-285: Interview must not receive EngineeringRule retrieval or verified episode tools
    for disallowed in ("get_finding_detail", "retrieve_verified_episodes", "retrieve_legal_basis"):
        assert disallowed not in _tool_names(by_name["interview"])


def test_only_customer_facing_specialists_expose_pydantic_response_formats() -> None:
    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}

    assert by_name["triage"]["response_format"] is TriageResult
    assert by_name["interview"]["response_format"] is InterviewResult
    # The analyst reports through the governed submit_rule_assessment tool, never free JSON.
    assert "response_format" not in by_name["repository-analyst"]
    assert SPECIALIST_RESPONSE_FORMATS == {
        "interview": InterviewResult,
        "triage": TriageResult,
    }


def test_engineering_rules_are_pinned_inputs_not_subagent_discovery() -> None:
    context_source = (PROJECT_ROOT / "orchestration" / "context.py").read_text(
        encoding="utf-8"
    )
    instructions = (PROJECT_ROOT / "instructions.md").read_text(encoding="utf-8")
    analyst_prompt = str(
        next(item for item in FLOW_SUBAGENTS if item["name"] == "repository-analyst")[
            "system_prompt"
        ]
    )

    # Trusted, dispatcher-set identity: a model can never choose its own rule or version.
    for field in ("engineering_rule_ids", "engineering_rule_version", "criterion_ids", "prior_evidence_refs"):
        assert field in context_source
    assert "repository-analyst" in instructions
    assert "One task = one EngineeringRule" in analyst_prompt


def test_interview_prompt_states_every_enforced_control_shape_rule() -> None:
    # A rejected handoff is discarded by the delivery boundary, so an Interview question
    # the contract forbids stalls the assessment with no retry. Every rule the validator
    # enforces has to be stated where the model can read it.
    from contracts.handoffs import InterviewQuestionResult

    interview_prompt = str(
        next(item for item in FLOW_SUBAGENTS if item["name"] == "interview")["system_prompt"]
    )

    def rejects(**overrides) -> bool:
        question = {
            "id": "q-1",
            "intent": "ASK",
            "control": "BOOLEAN",
            "prompt": "Does this system ingest external data?",
            **overrides,
        }
        try:
            InterviewQuestionResult.model_validate(question)
        except ValueError:
            return True
        return False

    assert rejects(choices=[{"id": "YES", "label": "Yes"}])
    assert rejects(control="SINGLE_SELECT", choices=[])
    assert "BOOLEAN and FREE_TEXT must leave `choices` empty" in interview_prompt
    assert "SINGLE_SELECT and\n  MULTI_SELECT require at least one choice" in interview_prompt
    assert "exactly CONFIRM and ADJUST stable choice IDs" in interview_prompt



def test_interview_snippet_ref_is_bounded_locator_only() -> None:
    from contracts.handoffs import InterviewQuestionResult

    base = {
        "id": "q-snippet",
        "intent": "ASK",
        "control": "FREE_TEXT",
        "prompt": "What provider does this gateway invoke?",
        "snippetRef": {
            "snapshot_id": "snapshot-1",
            "commit_sha": "abc123",
            "file_path": "src/gateway.ts",
            "start_line": 10,
            "end_line": 16,
            "evidence_hash": "sha256:" + "a" * 64,
            "snippet_policy": "PINNED_SNAPSHOT_BOUNDED_REDACTED_V1",
        },
    }
    question = InterviewQuestionResult.model_validate(base)
    assert question.snippetRef is not None
    assert question.snippetRef.file_path == "src/gateway.ts"

    with pytest.raises(ValueError):
        InterviewQuestionResult.model_validate(
            {**base, "snippetRef": {**base["snippetRef"], "raw_source": "secret"}}
        )
    with pytest.raises(ValueError):
        InterviewQuestionResult.model_validate(
            {**base, "snippetRef": {**base["snippetRef"], "end_line": 17}}
        )


def test_repository_analyst_prompt_is_compact_and_governed() -> None:
    prompt = str(
        next(item for item in FLOW_SUBAGENTS if item["name"] == "repository-analyst")[
            "system_prompt"
        ]
    )

    assert "assessed repository is your working database" in prompt
    assert "Repository source is authoritative" in prompt
    assert "submit_rule_assessment" in prompt
    assert "cite_repository_source" in prompt
    assert "never write a ref" in prompt
    assert "never proof" in prompt
    # No prescribed repository navigation sequence (LCSP does not steer how it searches).
    for forbidden in ("first ", "then grep", "step 1", "Step 1"):
        assert forbidden not in prompt
    assert len(prompt.splitlines()) < 40


def test_default_role_models_match_lcsp_cost_and_reasoning_policy() -> None:
    assert DEFAULT_ROOT_MODEL_SPEC == "openai:gpt-5-nano"
    assert DEFAULT_TRIAGE_MODEL_SPEC == "openai:gpt-5-nano"
    assert DEFAULT_INTERVIEW_MODEL_SPEC == "openai:gpt-5-nano"
    assert DEFAULT_REPOSITORY_ANALYST_MODEL_SPEC == "openai:gpt-5-nano"
    assert DEFAULT_NARRATOR_MODEL_SPEC == "openai:gpt-4.1-nano"
    assert DEFAULT_REASONING_EFFORT == "low"
    assert RESPONSES_OUTPUT_VERSION == "responses/v1"

    assert ROOT_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert TRIAGE_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert INTERVIEW_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert REPOSITORY_ANALYST_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert NARRATOR_MODEL_SPEC in ALL_LCSP_MODEL_SPECS


def test_openai_model_policy_gates_reasoning_by_model_capability() -> None:
    assert openai_responses_base_init_kwargs() == {
        "use_responses_api": True,
        "output_version": "responses/v1",
        "timeout": 300.0,
    }

    kwargs = openai_responses_init_kwargs("openai:gpt-5-mini")

    assert kwargs == {
        "use_responses_api": True,
        "output_version": "responses/v1",
        "timeout": 300.0,
        "reasoning": {"effort": REASONING_EFFORT},
    }
    assert "reasoning_effort" not in kwargs
    assert openai_responses_init_kwargs("openai:gpt-4o-mini") == {
        "use_responses_api": True,
        "output_version": "responses/v1",
        "timeout": 300.0,
    }
    assert supports_openai_reasoning("openai:gpt-5-mini") is True
    assert supports_openai_reasoning("openai:gpt-5.1") is True
    assert supports_openai_reasoning("openai:gpt-5") is True
    assert supports_openai_reasoning("openai:gpt-5-chat-latest") is False
    assert supports_openai_reasoning("openai:gpt-4o-mini") is False
    assert supports_openai_reasoning("openai:gpt-4.1-nano") is False
    assert openai_responses_init_kwargs("openai:gpt-4.1-nano") == {
        "use_responses_api": True,
        "output_version": "responses/v1",
        "timeout": 300.0,
    }
    assert supports_openai_reasoning("anthropic:claude-sonnet-4-6") is False


def test_agent_reasoning_policy_is_role_and_model_scoped() -> None:
    assert (
        reasoning_policy_for_agent(
            agent_name="repository-analyst",
            model_spec="openai:gpt-5-mini",
        )
        == "enabled"
    )
    assert (
        reasoning_policy_for_agent(
            agent_name="repository-analyst",
            model_spec="openai:gpt-4o-mini",
        )
        == "unsupported_model"
    )
    assert (
        reasoning_policy_for_agent(
            agent_name="lcsp-final-report-narrator",
            model_spec="openai:gpt-5-mini",
        )
        == "disabled_for_agent"
    )
    assert "reasoning" not in model_init_kwargs_for_agent(
        agent_name="lcsp-final-report-narrator",
        model_spec="openai:gpt-5-mini",
    )
    assert "reasoning" not in model_init_kwargs_for_agent(
        agent_name="repository-analyst",
        model_spec="openai:gpt-4o-mini",
    )
    assert model_init_kwargs_for_agent(
        agent_name="repository-analyst",
        model_spec="openai:gpt-5-mini",
    )["reasoning"] == {"effort": REASONING_EFFORT}


def test_openai_non_reasoning_env_override_omits_reasoning(monkeypatch) -> None:
    monkeypatch.setenv("LCSP_TRIAGE_MODEL", "openai:gpt-4o-mini")

    try:
        reloaded = importlib.reload(model_policy)
        configs = {config.role: config for config in reloaded.effective_model_configs()}

        assert reloaded.TRIAGE_MODEL_SPEC == "openai:gpt-4o-mini"
        assert configs["triage"].client == "responses_api"
        assert configs["triage"].reasoning_effort == "unset"
        assert configs["triage"].reasoning_policy == "unsupported_model"
        assert "reasoning" not in reloaded.model_init_kwargs_for_agent(
            agent_name="triage",
            model_spec=reloaded.TRIAGE_MODEL_SPEC,
        )
    finally:
        monkeypatch.delenv("LCSP_TRIAGE_MODEL", raising=False)
        importlib.reload(model_policy)


def test_narrator_model_env_defaults_to_non_reasoning_model(monkeypatch) -> None:
    monkeypatch.setenv("LCSP_NARRATOR_MODEL", "openai:gpt-4o-mini")

    try:
        reloaded = importlib.reload(model_policy)
        configs = {config.role: config for config in reloaded.effective_model_configs()}

        assert reloaded.NARRATOR_MODEL_SPEC == "openai:gpt-4o-mini"
        assert configs["narrator"].client == "responses_api"
        assert configs["narrator"].reasoning_effort == "unset"
        assert configs["narrator"].reasoning_policy == "disabled_for_agent"
        assert "reasoning" not in reloaded.model_init_kwargs_for_agent(
            agent_name="lcsp-final-report-narrator",
            model_spec=reloaded.NARRATOR_MODEL_SPEC,
        )
    finally:
        monkeypatch.delenv("LCSP_NARRATOR_MODEL", raising=False)
        importlib.reload(model_policy)


def test_effective_model_config_logs_responses_api_defaults() -> None:
    configs = effective_model_configs()

    assert tuple(config.role for config in configs) == (
        "root",
        "triage",
        "interview",
        "repository-analyst",
        "narrator",
    )
    assert all(config.provider == "openai" for config in configs)
    assert tuple(config.model for config in configs) == (
        "gpt-5-nano",
        "gpt-5-nano",
        "gpt-5-nano",
        "gpt-5-nano",
        "gpt-4.1-nano",
    )
    assert all(config.source in {"default", "env"} for config in configs)
    assert all(config.client == "responses_api" for config in configs)
    assert all(config.tools is True for config in configs)
    assert tuple(config.reasoning_effort for config in configs) == (
        REASONING_EFFORT,
        REASONING_EFFORT,
        REASONING_EFFORT,
        REASONING_EFFORT,
        "unset",
    )
    assert tuple(config.reasoning_policy for config in configs) == (
        "enabled",
        "enabled",
        "enabled",
        "enabled",
        "disabled_for_agent",
    )
    assert all(config.output_version == "responses/v1" for config in configs)


def test_reasoning_effort_defaults_to_low(monkeypatch) -> None:
    for env_name in (
        "LCSP_REASONING_EFFORT",
        "OPENAI_REASONING_EFFORT",
        "REASONING_EFFORT",
    ):
        monkeypatch.delenv(env_name, raising=False)

    assert _reasoning_effort_status() == "low"


def test_invalid_reasoning_effort_fails_closed(monkeypatch) -> None:
    monkeypatch.setenv("LCSP_REASONING_EFFORT", "turbo")

    with pytest.raises(RuntimeError, match="supported reasoning efforts"):
        _reasoning_effort_status()


def test_blank_model_env_does_not_override_default(monkeypatch) -> None:
    monkeypatch.setenv("LCSP_TRIAGE_MODEL", "  ")

    model_spec, source = _model_spec("LCSP_TRIAGE_MODEL", "openai:gpt-5-mini")

    assert model_spec == "openai:gpt-5-mini"
    assert source == "default"


def test_harness_registers_openai_provider_and_every_role_profile(monkeypatch) -> None:
    provider_registrations: list[tuple[str, object]] = []
    harness_registrations: list[tuple[str, object]] = []

    monkeypatch.setattr(
        harness,
        "register_provider_profile",
        lambda key, profile: provider_registrations.append((key, profile)),
    )
    monkeypatch.setattr(
        harness,
        "register_harness_profile",
        lambda model_spec, profile: harness_registrations.append((model_spec, profile)),
    )

    harness.configure_lcsp_harness()

    assert tuple(key for key, _ in provider_registrations) == (
        "openai",
        *ALL_LCSP_MODEL_SPECS,
    )
    profiles = {key: profile for key, profile in provider_registrations}
    assert dict(harness.LCSP_OPENAI_PROVIDER_PROFILE.init_kwargs) == (
        openai_responses_base_init_kwargs()
    )
    assert dict(profiles["openai"].init_kwargs) == openai_responses_base_init_kwargs()
    assert dict(profiles[ROOT_MODEL_SPEC].init_kwargs) == openai_responses_init_kwargs(
        ROOT_MODEL_SPEC
    )
    assert dict(profiles[TRIAGE_MODEL_SPEC].init_kwargs) == openai_responses_init_kwargs(
        TRIAGE_MODEL_SPEC
    )
    assert dict(profiles[NARRATOR_MODEL_SPEC].init_kwargs) == (
        openai_responses_base_init_kwargs()
    )
    assert tuple(model_spec for model_spec, _ in harness_registrations) == (
        ALL_LCSP_MODEL_SPECS
    )
    assert all(
        profile is harness.LCSP_HARNESS_PROFILE
        for _, profile in harness_registrations
    )


def test_root_agent_uses_checked_in_instructions_context_and_todos() -> None:
    source = (PROJECT_ROOT / "agent.py").read_text(encoding="utf-8")
    instructions = (PROJECT_ROOT / "instructions.md").read_text(encoding="utf-8")

    assert "system_prompt=SYSTEM_PROMPT" in source
    assert "context_schema=LCSPRunContext" in source
    assert "TodoListMiddleware()" in source
    assert "inject_lcsp_runtime_context" in source
    assert "validate_lcsp_specialist_task_handoff" in source
    assert "MODEL_GOVERNANCE_MIDDLEWARE" in source

    assert "LEGAL_MAINTENANCE" in instructions
    assert "triage" in instructions
    assert "repository-analyst" in instructions
    assert "planner" not in instructions.lower()
    assert "write_todos" in instructions
    assert "deterministic gate" in instructions


def test_multi_tenant_agent_has_no_deployment_shared_model_memory() -> None:
    assert not (PROJECT_ROOT / "memory.py").exists()
    assert not (PROJECT_ROOT / "orchestration" / "memory.py").exists()
    instructions = (PROJECT_ROOT / "instructions.md").read_text(encoding="utf-8")
    assert "Memory is never authoritative evidence" in instructions


def _injected_runtime_double() -> object:
    """A ToolRuntime instance for schema-shape tests (never sent to a model)."""
    from unittest.mock import MagicMock

    from langchain.tools import ToolRuntime

    double = MagicMock()
    double.__class__ = ToolRuntime
    return double


def _governed_request_cases() -> list[tuple[type, dict]]:
    from tools.common.codebase_memory_graph.code import (
        GetArchitectureRequest,
        GetCodeSnippetRequest,
        SearchCodeGraphRequest,
        SearchCodeTextRequest,
        TraceCallPathRequest,
    )
    from tools.common.retrieve_verified_episodes.code import (
        RetrieveVerifiedEpisodesRequest,
    )
    from tools.common.submit_rule_assessment.code import (
        CiteRepositorySourceRequest,
        SubmitRuleAssessmentRequest,
    )

    return [
        (
            SubmitRuleAssessmentRequest,
            {
                "engineering_rule_id": "ENG-1",
                "engineering_rule_version": "v1",
                "repository_version": "sha",
                "criteria": [],
            },
        ),
        (
            CiteRepositorySourceRequest,
            {"path": "src/a.py", "start_line": 1, "end_line": 2},
        ),
        (RetrieveVerifiedEpisodesRequest, {"owner_agent": "planner"}),
        (SearchCodeGraphRequest, {"name_pattern": "review"}),
        (TraceCallPathRequest, {"function_name": "review_control"}),
        (GetCodeSnippetRequest, {"qualified_name": "review_control"}),
        (SearchCodeTextRequest, {"pattern": "review"}),
        (GetArchitectureRequest, {"aspects": ["auth"]}),
    ]


@pytest.mark.parametrize(
    "request_model,model_args",
    [pytest.param(cls, args, id=cls.__name__) for cls, args in _governed_request_cases()],
)
def test_governed_tool_schemas_tolerate_injected_runtime(request_model, model_args) -> None:
    """Root cause: ToolNode merges the injected ToolRuntime into tool args before
    explicit-schema validation. A forbid-schema without RuntimeInjectedInput rejects
    the runtime key, langgraph filters the error as injected (empty message the model
    cannot correct), and governance kills the run with TerminalSchemaError — every
    governed-tool call failed deterministically in live runs while .func unit tests
    passed. Fix: strip only an actual ToolRuntime; model-authored extras stay rejected.
    """
    merged = dict(model_args)
    merged["runtime"] = _injected_runtime_double()
    validated = request_model.model_validate(merged)
    assert "runtime" not in validated.model_dump()

    with pytest.raises(Exception):
        request_model.model_validate({**model_args, "model_authored_bogus": 1})
