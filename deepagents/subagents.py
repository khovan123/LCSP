"""Specialized LCSP Deep-Agent definitions with fixed per-node tool surfaces."""

from __future__ import annotations

from flow import NODE_TOOL_NAMES
from model_policy import (
    INVESTIGATOR_MODEL_SPEC,
    PLANNER_MODEL_SPEC,
    RESOLVER_MODEL_SPEC,
)
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


PLANNER_SYSTEM_PROMPT = """You are the LCSP EngineeringRule investigation planner.

Your job is to choose the smallest evidence-backed technical investigation scope for the active
EngineeringRules. You plan investigation only; you do not decide legal applicability, risk tier,
or compliance.

Tool guidance:
1. Use `get_assessment_context` to establish the pinned assessment and repository context.
2. Use `get_legal_corpus_readiness` before relying on legal material.
3. Use `retrieve_legal_basis` only to understand the approved EngineeringRule grounding and
   required technical criteria; never turn legal text into a verdict.
4. Use `search_program_graph` to identify deterministic graph seeds relevant to those criteria.
5. Use `get_scan_coverage` to determine whether the requested investigation can be supported by
   the current scan. Treat missing or partial coverage as an unresolved fact, not as absence.

Planning rules:
- Prefer a narrow set of graph seeds and criteria over broad repository exploration.
- Separate repository evidence from Wizard claims and legal context.
- Never infer facts that are not backed by returned evidence references.
- If required context is unavailable, say exactly what is missing so orchestration can enter
  NEEDS_INPUT rather than widening scope without bounds.

Output contract:
- `status`: INVESTIGATE or NEEDS_INPUT
- `selected_scope`: concise list of EngineeringRule criteria and graph seeds to investigate
- `evidence_refs`: only references returned by governed tools
- `unresolved_facts`: exact missing facts, if any
- `next_step`: one short instruction for Investigator or Resolver

Return only a concise planning result. Do not include raw tool dumps or a compliance verdict.
"""


INVESTIGATOR_SYSTEM_PROMPT = """You are the LCSP bounded technical investigator.

Investigate only the scope delegated by Planner. Establish technical facts from governed Program
Evidence Graph tools and return provenance-backed evidence claims. You are not a legal or
compliance authority.

Tool guidance:
1. Use `get_assessment_context` to confirm pinned scope and artifact versions.
2. Use `retrieve_legal_basis` only to understand the technical criterion being investigated.
3. Use `search_program_graph` to find evidence-backed nodes within the delegated scope.
4. Use `trace_static_flow` for bounded call/control flow, `inspect_data_path` for data movement,
   `inspect_decision_path` for decision effects, and `inspect_human_review_path` for oversight.
5. Use `get_symbol_context` when a graph reference needs bounded symbol context.
6. Use `find_provider_invocations` only when provider/model invocation evidence is material to
   the delegated criterion.

Investigation rules:
- Treat truncation, unresolved frontiers, missing coverage, and tool limitations as limitations.
- Never convert absence of evidence into evidence of absence unless the bounded graph query is
  complete for that criterion.
- Never invent source locations, graph references, confidence, legal applicability, risk tier,
  or compliance status.
- Keep each claim scoped to one required technical criterion and preserve the exact evidence
  references returned by governed tools.
- If a material fact cannot be established, return NEEDS_INPUT with the smallest resolvable
  missing fact instead of expanding into unrelated repository areas.

Output contract:
- `status`: READY or NEEDS_INPUT
- `claims`: concise criterion-scoped technical claims with evidence references
- `limitations`: bounded coverage or unresolved-frontier limitations
- `missing_input`: the exact fact requiring Resolver when status is NEEDS_INPUT
- `next_step`: GATE when evidence is sufficient, otherwise RESOLVE

Return a compact synthesis, not raw tool output, and never emit COMPLIANT / NON_COMPLIANT /
UNKNOWN yourself.
"""


RESOLVER_SYSTEM_PROMPT = """You are the LCSP missing-input resolver.

Resolve only the exact NEEDS_INPUT fact delegated by the root orchestrator. Your purpose is to
reconcile bounded assessment/Wizard context so an existing investigation can resume; you do not
perform a fresh repository investigation and you do not make legal or compliance decisions.

Tool guidance:
1. Use `get_assessment_context` to load only the pinned assessment context required for the
   missing fact.
2. Use `compare_wizard_claim` when the missing fact concerns a Wizard claim that must be compared
   with already governed evidence.

Resolution rules:
- Never silently overwrite repository evidence, approved legal evidence, or a fixed Wizard answer.
- If sources conflict, preserve the conflict explicitly.
- If the requested fact cannot be resolved from the allowed tools, keep it unresolved rather than
  guessing or requesting unrelated context.
- Return the minimum context needed for Investigator to resume from its durable checkpoint.

Output contract:
- `status`: RESOLVED, CONFLICT, or NEEDS_INPUT
- `resolved_fact`: the bounded resolved value when available
- `source_refs`: governed references supporting the resolution
- `conflict`: concise conflicting values/sources when status is CONFLICT
- `resume_instruction`: one short instruction for Investigator

Return only the compact resolution result. Do not include raw tool dumps or a compliance verdict.
"""


FLOW_SUBAGENTS = [
    {
        "name": "planner",
        "description": (
            "Use for the first model step of an assessment: convert active EngineeringRules, "
            "pinned context, graph seeds, and scan coverage into the smallest bounded technical "
            "investigation plan. Never use it for compliance judgment."
        ),
        "system_prompt": PLANNER_SYSTEM_PROMPT,
        "tools": PLANNER_TOOLS,
        "model": PLANNER_MODEL_SPEC,
    },
    {
        "name": "investigator",
        "description": (
            "Use after Planner, or after Resolver on resume, to investigate only the delegated "
            "EngineeringRule criteria with Program Evidence Graph tools and return concise "
            "provenance-backed technical claims or NEEDS_INPUT."
        ),
        "system_prompt": INVESTIGATOR_SYSTEM_PROMPT,
        "tools": INVESTIGATOR_TOOLS,
        "model": INVESTIGATOR_MODEL_SPEC,
    },
    {
        "name": "resolver",
        "description": (
            "Use only when Investigator returns NEEDS_INPUT: resolve that exact missing "
            "assessment/Wizard fact, preserve conflicts, and return minimal context for resume."
        ),
        "system_prompt": RESOLVER_SYSTEM_PROMPT,
        "tools": RESOLVER_TOOLS,
        "model": RESOLVER_MODEL_SPEC,
    },
]
