from __future__ import annotations

import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from flow import (
    ALLOWED_FLOW_TRANSITIONS,
    COMMON_TOOL_NAMES,
    FLOW_ORDER,
    NODE_TOOL_NAMES,
    NON_MODEL_FLOW_STEPS,
    ORCHESTRATION_TOOL_NAMES,
    assert_flow_transition,
)
from harness import (
    HIDDEN_BUILTIN_TOOLS,
    LCSP_FILESYSTEM_PERMISSIONS,
    LCSP_HARNESS_PROFILE,
)
from subagents import (
    FLOW_SUBAGENTS,
    INVESTIGATOR_TOOLS,
    PLANNER_TOOLS,
    RESOLVER_TOOLS,
)


def _names(tools: list[object]) -> tuple[str, ...]:
    return tuple(str(getattr(tool, "name")) for tool in tools)


def _directory_names(path: Path) -> set[str]:
    return {
        entry.name
        for entry in path.iterdir()
        if entry.is_dir() and entry.name != "__pycache__"
    }


def test_canonical_flow_keeps_needs_input_resume_and_deterministic_gate() -> None:
    assert FLOW_ORDER == (
        "plan",
        "investigate",
        "needs_input",
        "resolve",
        "resume",
        "gate",
        "gap",
        "report",
    )
    assert NON_MODEL_FLOW_STEPS == (
        "needs_input",
        "resume",
        "gate",
        "gap",
        "report",
    )


def test_canonical_flow_declares_only_expected_transitions() -> None:
    assert ALLOWED_FLOW_TRANSITIONS == {
        "plan": frozenset({"investigate"}),
        "investigate": frozenset({"needs_input", "gate"}),
        "needs_input": frozenset({"resolve"}),
        "resolve": frozenset({"resume"}),
        "resume": frozenset({"investigate"}),
        "gate": frozenset({"gap"}),
        "gap": frozenset({"report"}),
        "report": frozenset(),
    }

    assert_flow_transition("plan", "investigate")
    assert_flow_transition("investigate", "needs_input")
    assert_flow_transition("needs_input", "resolve")
    assert_flow_transition("resolve", "resume")
    assert_flow_transition("resume", "investigate")
    assert_flow_transition("investigate", "gate")
    assert_flow_transition("gate", "gap")
    assert_flow_transition("gap", "report")

    with pytest.raises(ValueError, match="invalid LCSP flow transition"):
        assert_flow_transition("plan", "gate")
    with pytest.raises(ValueError, match="unknown LCSP flow step"):
        assert_flow_transition("unknown", "plan")


def test_subagents_receive_fixed_minimal_tool_surfaces() -> None:
    assert _names(PLANNER_TOOLS) == NODE_TOOL_NAMES["planner"]
    assert _names(INVESTIGATOR_TOOLS) == NODE_TOOL_NAMES["investigator"]
    assert _names(RESOLVER_TOOLS) == NODE_TOOL_NAMES["resolver"]

    by_name = {item["name"]: item for item in FLOW_SUBAGENTS}
    assert tuple(by_name) == ("planner", "investigator", "resolver")
    assert _names(by_name["planner"]["tools"]) == NODE_TOOL_NAMES["planner"]
    assert _names(by_name["investigator"]["tools"]) == NODE_TOOL_NAMES["investigator"]
    assert _names(by_name["resolver"]["tools"]) == NODE_TOOL_NAMES["resolver"]


def test_common_and_orchestration_tools_are_classified_explicitly() -> None:
    assert COMMON_TOOL_NAMES == (
        "get_assessment_context",
        "get_legal_corpus_readiness",
        "retrieve_legal_basis",
        "search_program_graph",
    )
    assert ORCHESTRATION_TOOL_NAMES == ("request_targeted_reanalysis",)
    for tool_name in ORCHESTRATION_TOOL_NAMES:
        assert tool_name not in NODE_TOOL_NAMES["planner"]
        assert tool_name not in NODE_TOOL_NAMES["investigator"]
        assert tool_name not in NODE_TOOL_NAMES["resolver"]


def test_agent_facing_tools_follow_node_tool_code_layout() -> None:
    for node, tool_names in {
        "common": COMMON_TOOL_NAMES,
        "planner": ("get_scan_coverage",),
        "investigator": (
            "trace_static_flow",
            "inspect_data_path",
            "inspect_decision_path",
            "inspect_human_review_path",
            "get_symbol_context",
            "find_provider_invocations",
        ),
        "resolver": ("compare_wizard_claim",),
        "orchestration": ORCHESTRATION_TOOL_NAMES,
    }.items():
        for tool_name in tool_names:
            assert (PROJECT_ROOT / "tools" / node / tool_name / "code.py").is_file()


def test_tools_tree_contains_only_authored_agent_capabilities() -> None:
    assert _directory_names(PROJECT_ROOT / "tools") == {
        "common",
        "planner",
        "investigator",
        "resolver",
        "orchestration",
    }
    assert _directory_names(PROJECT_ROOT / "tools" / "common") == set(COMMON_TOOL_NAMES)
    assert _directory_names(PROJECT_ROOT / "tools" / "planner") == {"get_scan_coverage"}
    assert _directory_names(PROJECT_ROOT / "tools" / "investigator") == {
        "trace_static_flow",
        "inspect_data_path",
        "inspect_decision_path",
        "inspect_human_review_path",
        "get_symbol_context",
        "find_provider_invocations",
    }
    assert _directory_names(PROJECT_ROOT / "tools" / "resolver") == {"compare_wizard_claim"}
    assert _directory_names(PROJECT_ROOT / "tools" / "orchestration") == set(
        ORCHESTRATION_TOOL_NAMES
    )


def test_runtime_owns_non_model_callable_implementation_domains() -> None:
    runtime = PROJECT_ROOT / "runtime"
    assert {
        "graph",
        "scanner",
        "legal",
        "engineering_rule",
        "classification",
        "reporting",
    }.issubset(_directory_names(runtime))
    assert (runtime / "graph" / "query_engine.py").is_file()
    assert (runtime / "scanner" / "scan_boundary.py").is_file()
    assert not (runtime / "scanner" / "program_graph").exists()
    assert (
        runtime
        / "engineering_rule"
        / "planner"
        / "investigation"
        / "engineering_rule_planner.py"
    ).is_file()
    assert (runtime / "legal" / "official_text_extraction.py").is_file()
    assert (runtime / "classification" / "classification_boundary.py").is_file()
    assert (runtime / "reporting" / "final_report_boundary.py").is_file()
    assert not (runtime / "legal" / "legal").exists()
    assert not (runtime / "classification" / "classification").exists()
    assert not (runtime / "reporting" / "reporting").exists()


def test_generic_boundary_invocation_is_not_root_agent_surface() -> None:
    agent_source = (PROJECT_ROOT / "agent.py").read_text()
    assert "invoke_lcsp_boundary" not in agent_source
    assert "list_lcsp_invocation_boundaries" not in agent_source
    assert "resume_waiting_runs" not in agent_source


def test_default_general_purpose_subagent_is_disabled() -> None:
    assert LCSP_HARNESS_PROFILE.general_purpose_subagent is not None
    assert LCSP_HARNESS_PROFILE.general_purpose_subagent.enabled is False


def test_harness_hides_non_skill_filesystem_and_execute_tools() -> None:
    assert HIDDEN_BUILTIN_TOOLS == frozenset(
        {
            "ls",
            "write_file",
            "edit_file",
            "delete",
            "glob",
            "grep",
            "execute",
        }
    )
    assert "read_file" not in HIDDEN_BUILTIN_TOOLS
    assert "task" not in HIDDEN_BUILTIN_TOOLS


def test_filesystem_permissions_only_allow_reading_managed_skills() -> None:
    assert len(LCSP_FILESYSTEM_PERMISSIONS) == 2

    skill_read, deny_all = LCSP_FILESYSTEM_PERMISSIONS
    assert skill_read.operations == ["read"]
    assert skill_read.paths == ["/skills/**"]
    assert skill_read.mode == "allow"

    assert deny_all.operations == ["read", "write"]
    assert deny_all.paths == ["/**"]
    assert deny_all.mode == "deny"
