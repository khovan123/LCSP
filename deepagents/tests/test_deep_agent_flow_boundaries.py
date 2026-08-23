from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from flow import (
    COMMON_TOOL_NAMES,
    FLOW_ORDER,
    NODE_TOOL_NAMES,
    NON_MODEL_FLOW_STEPS,
    ORCHESTRATION_TOOL_NAMES,
)
from subagents import (
    FLOW_SUBAGENTS,
    INVESTIGATOR_TOOLS,
    PLANNER_TOOLS,
    RESOLVER_TOOLS,
)


def _names(tools: list[object]) -> tuple[str, ...]:
    return tuple(str(getattr(tool, "name")) for tool in tools)


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
            assert (
                PROJECT_ROOT / "tools" / node / tool_name / "code.py"
            ).is_file()


def test_generic_boundary_invocation_is_not_root_agent_surface() -> None:
    agent_source = (PROJECT_ROOT / "agent.py").read_text()
    assert "invoke_lcsp_boundary" not in agent_source
    assert "list_lcsp_invocation_boundaries" not in agent_source
    assert "resume_waiting_runs" not in agent_source
