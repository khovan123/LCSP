"""Specialized LCSP Deep-Agent definitions with fixed per-node tool surfaces."""

from __future__ import annotations

from flow import NODE_TOOL_NAMES
from tools.common.get_assessment_context.code import get_assessment_context
from tools.common.get_legal_corpus_readiness.code import get_legal_corpus_readiness
from tools.common.retrieve_legal_basis.code import retrieve_legal_basis
from tools.common.search_program_graph.code import search_program_graph
from tools.investigator.find_provider_invocations.code import find_provider_invocations
from tools.investigator.get_symbol_context.code import get_symbol_context
from tools.investigator.inspect_data_path.code import inspect_data_path
from tools.investigator.inspect_decision_path.code import inspect_decision_path
from tools.investigator.inspect_human_review_path.code import inspect_human_review_path
from tools.investigator.trace_static_flow.code import trace_static_flow
from tools.planner.get_scan_coverage.code import get_scan_coverage
from tools.resolver.compare_wizard_claim.code import compare_wizard_claim


PLANNER_TOOLS = [
    get_assessment_context,
    get_legal_corpus_readiness,
    retrieve_legal_basis,
    search_program_graph,
    get_scan_coverage,
]

INVESTIGATOR_TOOLS = [
    get_assessment_context,
    retrieve_legal_basis,
    search_program_graph,
    trace_static_flow,
    inspect_data_path,
    inspect_decision_path,
    inspect_human_review_path,
    get_symbol_context,
    find_provider_invocations,
]

RESOLVER_TOOLS = [
    get_assessment_context,
    compare_wizard_claim,
]


def _tool_names(tools: list[object]) -> tuple[str, ...]:
    return tuple(str(getattr(tool, "name")) for tool in tools)


if _tool_names(PLANNER_TOOLS) != NODE_TOOL_NAMES["planner"]:
    raise RuntimeError("planner tools drifted from the canonical flow manifest")
if _tool_names(INVESTIGATOR_TOOLS) != NODE_TOOL_NAMES["investigator"]:
    raise RuntimeError("investigator tools drifted from the canonical flow manifest")
if _tool_names(RESOLVER_TOOLS) != NODE_TOOL_NAMES["resolver"]:
    raise RuntimeError("resolver tools drifted from the canonical flow manifest")


FLOW_SUBAGENTS = [
    {
        "name": "planner",
        "description": (
            "Plan bounded EngineeringRule investigation scope. Use governed legal "
            "context and deterministic graph seeds; never decide compliance."
        ),
        "system_prompt": (
            "You are the LCSP planner. Select the smallest evidence-backed technical "
            "investigation scope needed for the active EngineeringRules. Do not make "
            "legal applicability, risk-tier, or compliance decisions. Return unresolved "
            "facts explicitly instead of inventing them."
        ),
        "tools": PLANNER_TOOLS,
    },
    {
        "name": "investigator",
        "description": (
            "Investigate selected EngineeringRules using bounded Program Evidence Graph "
            "tools and return provenance-backed evidence claims."
        ),
        "system_prompt": (
            "You are the LCSP investigator. Query only the supplied bounded graph tools. "
            "Treat truncation and unresolved frontiers as limitations. Never emit a legal "
            "verdict. If a material fact cannot be established, return NEEDS_INPUT or an "
            "unresolved engineering fact with evidence references."
        ),
        "tools": INVESTIGATOR_TOOLS,
    },
    {
        "name": "resolver",
        "description": (
            "Resolve a specific NEEDS_INPUT condition using bounded assessment and Wizard "
            "context without overriding repository or legal evidence."
        ),
        "system_prompt": (
            "You are the LCSP missing-input resolver. Resolve only the exact missing "
            "context requested by the orchestrator. Never silently overwrite fixed Wizard "
            "answers or repository evidence. Surface conflicts explicitly so the run can "
            "resume from its durable checkpoint."
        ),
        "tools": RESOLVER_TOOLS,
    },
]
