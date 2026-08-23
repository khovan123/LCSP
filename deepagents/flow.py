"""Canonical LCSP Deep-Agent flow and tool-boundary manifest."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FlowStep:
    """One stable orchestration step in the LCSP assessment flow."""

    name: str
    owner: str
    description: str


FLOW_STEPS: tuple[FlowStep, ...] = (
    FlowStep(
        "plan",
        "planner",
        "Select bounded EngineeringRule investigation scope from governed context.",
    ),
    FlowStep(
        "investigate",
        "investigator",
        "Collect provenance-backed technical evidence with bounded graph tools.",
    ),
    FlowStep(
        "needs_input",
        "orchestrator",
        "Return NEEDS_INPUT when a material business or technical fact is unresolved.",
    ),
    FlowStep(
        "resolve",
        "resolver",
        "Resolve only the missing context required by the active investigation.",
    ),
    FlowStep(
        "resume",
        "orchestrator",
        "Resume from the durable checkpoint and re-enter investigation.",
    ),
    FlowStep(
        "gate",
        "deterministic-runtime",
        "Validate claims and evaluate EngineeringRules deterministically.",
    ),
    FlowStep(
        "gap",
        "application-runtime",
        "Build evidence-backed gaps from deterministic EngineeringRule outcomes.",
    ),
    FlowStep(
        "report",
        "application-runtime",
        "Produce the guarded final report and audit artifacts.",
    ),
)

FLOW_ORDER: tuple[str, ...] = tuple(step.name for step in FLOW_STEPS)

# Flow transitions are declared independently from prompts so the orchestrator can
# enforce the same state machine once durable state wiring is introduced.
ALLOWED_FLOW_TRANSITIONS: dict[str, frozenset[str]] = {
    "plan": frozenset({"investigate"}),
    "investigate": frozenset({"needs_input", "gate"}),
    "needs_input": frozenset({"resolve"}),
    "resolve": frozenset({"resume"}),
    "resume": frozenset({"investigate"}),
    "gate": frozenset({"gap"}),
    "gap": frozenset({"report"}),
    "report": frozenset(),
}


def assert_flow_transition(current: str, next_step: str) -> None:
    """Reject orchestration transitions outside the canonical LCSP flow."""
    allowed = ALLOWED_FLOW_TRANSITIONS.get(current)
    if allowed is None:
        raise ValueError(f"unknown LCSP flow step: {current}")
    if next_step not in allowed:
        raise ValueError(
            f"invalid LCSP flow transition: {current} -> {next_step}; "
            f"allowed={sorted(allowed)}"
        )


COMMON_TOOL_NAMES: tuple[str, ...] = (
    "get_assessment_context",
    "get_legal_corpus_readiness",
    "retrieve_legal_basis",
    "search_program_graph",
)

NODE_TOOL_NAMES: dict[str, tuple[str, ...]] = {
    "planner": (
        "get_assessment_context",
        "get_legal_corpus_readiness",
        "retrieve_legal_basis",
        "search_program_graph",
        "get_scan_coverage",
    ),
    "investigator": (
        "get_assessment_context",
        "retrieve_legal_basis",
        "search_program_graph",
        "trace_static_flow",
        "inspect_data_path",
        "inspect_decision_path",
        "inspect_human_review_path",
        "get_symbol_context",
        "find_provider_invocations",
    ),
    "resolver": (
        "get_assessment_context",
        "compare_wizard_claim",
    ),
}

ORCHESTRATION_TOOL_NAMES: tuple[str, ...] = (
    "request_targeted_reanalysis",
)

NON_MODEL_FLOW_STEPS: tuple[str, ...] = (
    "needs_input",
    "resume",
    "gate",
    "gap",
    "report",
)
