from __future__ import annotations

from pathlib import Path

import harness
from model_policy import (
    ALL_LCSP_MODEL_SPECS,
    CONTEXT_WIZARD_MODEL_SPEC,
    DEFAULT_CONTEXT_WIZARD_MODEL_SPEC,
    DEFAULT_INVESTIGATOR_MODEL_SPEC,
    DEFAULT_PLANNER_MODEL_SPEC,
    DEFAULT_RESOLVER_MODEL_SPEC,
    DEFAULT_ROOT_MODEL_SPEC,
    INVESTIGATOR_MODEL_SPEC,
    PLANNER_MODEL_SPEC,
    RESOLVER_MODEL_SPEC,
    ROOT_MODEL_SPEC,
)
from orchestration.memory import SHARED_MDA_MEMORY_ENABLED
from subagents import FLOW_SUBAGENTS


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _tool_names(subagent: dict[str, object]) -> tuple[str, ...]:
    return tuple(str(getattr(tool, "name")) for tool in subagent["tools"])


def test_subagents_follow_deep_agents_dictionary_contract() -> None:
    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}
    assert tuple(by_name) == (
        "context_wizard",
        "planner",
        "investigator",
        "resolver",
    )

    expected_models = {
        "context_wizard": CONTEXT_WIZARD_MODEL_SPEC,
        "planner": PLANNER_MODEL_SPEC,
        "investigator": INVESTIGATOR_MODEL_SPEC,
        "resolver": RESOLVER_MODEL_SPEC,
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
        assert "Tool guidance:" in str(subagent["system_prompt"])
        assert "Output contract:" in str(subagent["system_prompt"])
        assert len(str(subagent["description"])) >= 80
        assert subagent["middleware"]


def test_pipeline_roles_do_not_bypass_context_wizard_hydration() -> None:
    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}

    assert _tool_names(by_name["context_wizard"]) == (
        "get_assessment_context",
        "get_legal_corpus_readiness",
        "retrieve_legal_basis",
    )
    assert _tool_names(by_name["planner"]) == (
        "search_program_graph",
        "get_scan_coverage",
    )
    assert "retrieve_legal_basis" not in _tool_names(by_name["investigator"])
    assert "get_assessment_context" not in _tool_names(by_name["investigator"])
    assert _tool_names(by_name["resolver"]) == (
        "get_assessment_context",
        "compare_wizard_claim",
    )


def test_engineering_rules_are_pinned_inputs_not_subagent_discovery() -> None:
    context_source = (PROJECT_ROOT / "orchestration" / "context.py").read_text()
    instructions = (PROJECT_ROOT / "instructions.md").read_text()
    planner_prompt = str(
        next(item for item in FLOW_SUBAGENTS if item["name"] == "planner")["system_prompt"]
    )
    context_wizard_prompt = str(
        next(item for item in FLOW_SUBAGENTS if item["name"] == "context_wizard")["system_prompt"]
    )

    assert "engineering_rule_ids" in context_source
    assert "already-selected/pinned EngineeringRule IDs" in instructions
    assert "Do not add, remove, reinterpret or re-rank EngineeringRules" in planner_prompt
    assert "Do not discover, select, invent or broaden the set of EngineeringRules" in (
        context_wizard_prompt
    )


def test_default_role_models_match_lcsp_cost_and_reasoning_policy() -> None:
    assert DEFAULT_ROOT_MODEL_SPEC == "openai:gpt-5.6-terra"
    assert DEFAULT_CONTEXT_WIZARD_MODEL_SPEC == "openai:gpt-5.6-luna"
    assert DEFAULT_PLANNER_MODEL_SPEC == "openai:gpt-5.6-sol"
    assert DEFAULT_INVESTIGATOR_MODEL_SPEC == "openai:gpt-5.6-terra"
    assert DEFAULT_RESOLVER_MODEL_SPEC == "openai:gpt-5.6-luna"

    assert ROOT_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert CONTEXT_WIZARD_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert PLANNER_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert INVESTIGATOR_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
    assert RESOLVER_MODEL_SPEC in ALL_LCSP_MODEL_SPECS


def test_harness_profile_is_registered_for_every_role_model(monkeypatch) -> None:
    registered: list[tuple[str, object]] = []

    monkeypatch.setattr(
        harness,
        "register_harness_profile",
        lambda model_spec, profile: registered.append((model_spec, profile)),
    )

    harness.configure_lcsp_harness()

    assert tuple(model_spec for model_spec, _ in registered) == ALL_LCSP_MODEL_SPECS
    assert all(profile is harness.LCSP_HARNESS_PROFILE for _, profile in registered)


def test_root_agent_uses_managed_instructions_context_and_todos() -> None:
    source = (PROJECT_ROOT / "agent.py").read_text(encoding="utf-8")
    instructions = (PROJECT_ROOT / "instructions.md").read_text(encoding="utf-8")

    # Managed Deep Agents owns the system prompt through instructions.md.
    assert "system_prompt=" not in source
    assert "context_schema=LCSPRunContext" in source
    assert "ROOT_TODO_MIDDLEWARE" in source
    assert "inject_lcsp_runtime_context" in source

    assert "context_wizard" in instructions
    assert "planner" in instructions
    assert "investigator" in instructions
    assert "resolver" in instructions
    assert "write_todos" in instructions
    assert "deterministic gate" in instructions


def test_multi_tenant_agent_does_not_enable_deployment_shared_mda_memory() -> None:
    assert SHARED_MDA_MEMORY_ENABLED is False
    assert not (PROJECT_ROOT / "memory.py").exists()
    assert (PROJECT_ROOT / "orchestration" / "memory.py").is_file()
