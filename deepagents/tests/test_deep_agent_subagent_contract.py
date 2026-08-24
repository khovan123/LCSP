from __future__ import annotations

from pathlib import Path

import harness
from model_policy import (
    ALL_LCSP_MODEL_SPECS,
    DEFAULT_INVESTIGATOR_MODEL_SPEC,
    DEFAULT_PLANNER_MODEL_SPEC,
    DEFAULT_RESOLVER_MODEL_SPEC,
    DEFAULT_ROOT_MODEL_SPEC,
    INVESTIGATOR_MODEL_SPEC,
    PLANNER_MODEL_SPEC,
    RESOLVER_MODEL_SPEC,
    ROOT_MODEL_SPEC,
)
from orchestrator import ROOT_ORCHESTRATOR_SYSTEM_PROMPT
from subagents import FLOW_SUBAGENTS


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_subagents_follow_deep_agents_dictionary_contract() -> None:
    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}
    assert tuple(by_name) == ("planner", "investigator", "resolver")

    expected_models = {
        "planner": PLANNER_MODEL_SPEC,
        "investigator": INVESTIGATOR_MODEL_SPEC,
        "resolver": RESOLVER_MODEL_SPEC,
    }
    for name, subagent in by_name.items():
        assert {"name", "description", "system_prompt", "tools", "model"} <= set(subagent)
        assert subagent["model"] == expected_models[name]
        assert "Tool guidance:" in str(subagent["system_prompt"])
        assert "Output contract:" in str(subagent["system_prompt"])
        assert len(str(subagent["description"])) >= 80


def test_default_role_models_match_lcsp_cost_and_reasoning_policy() -> None:
    assert DEFAULT_ROOT_MODEL_SPEC == "openai:gpt-5.6-terra"
    assert DEFAULT_PLANNER_MODEL_SPEC == "openai:gpt-5.6-sol"
    assert DEFAULT_INVESTIGATOR_MODEL_SPEC == "openai:gpt-5.6-terra"
    assert DEFAULT_RESOLVER_MODEL_SPEC == "openai:gpt-5.6-luna"

    assert ROOT_MODEL_SPEC in ALL_LCSP_MODEL_SPECS
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


def test_root_agent_has_explicit_orchestration_prompt() -> None:
    source = (PROJECT_ROOT / "agent.py").read_text(encoding="utf-8")

    assert "system_prompt=ROOT_ORCHESTRATOR_SYSTEM_PROMPT" in source
    assert "task" in ROOT_ORCHESTRATOR_SYSTEM_PROMPT
    assert "planner" in ROOT_ORCHESTRATOR_SYSTEM_PROMPT
    assert "investigator" in ROOT_ORCHESTRATOR_SYSTEM_PROMPT
    assert "resolver" in ROOT_ORCHESTRATOR_SYSTEM_PROMPT
    assert "deterministic gate" in ROOT_ORCHESTRATOR_SYSTEM_PROMPT
