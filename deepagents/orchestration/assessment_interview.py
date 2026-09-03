"""Canonical Assessment Interview runtime contract helpers.

This module is intentionally deterministic. Runtime Interview owns Customer-facing
questions and context authority, while Root Orchestration owns recovery, stale-state
validation, downstream re-evaluation, and specialist resume.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any, Literal


InterviewOutcome = Literal[
    "WAITING_FOR_CUSTOMER",
    "CONTEXT_READY",
    "CONTEXT_RESOLVED",
    "BLOCKED_OR_UNRESOLVED",
    "FAILED",
]
QuestionIntent = Literal["ASK", "CLARIFY"]
CoverageState = Literal["READY", "PARTIAL", "UNAVAILABLE"]
ContextAuthority = Literal[
    "CUSTOMER_STATED",
    "UNCERTAIN",
    "CONFLICTED",
    "CUSTOMER_CONFIRMED",
    "CONFIRMED",
    "SUPERSEDED",
]


@dataclass(frozen=True)
class TechnicalCoverage:
    state: CoverageState
    limitations: tuple[str, ...] = ()
    missing_evidence_refs: tuple[str, ...] = ()


@dataclass(frozen=True)
class InterviewQuestion:
    id: str
    intent: QuestionIntent
    prompt: str
    need_id: str | None = None
    control: str = "FREE_TEXT"


@dataclass(frozen=True)
class CustomerContextRevision:
    revision: int
    facts: dict[str, Any]
    authority: ContextAuthority
    confirmed_by_actor_id: str | None = None


@dataclass(frozen=True)
class BusinessContextNeed:
    need_id: str
    business_context_need: str
    resolution_criteria: tuple[str, ...]
    originating_investigation_reference: str
    affected_rule_ids: tuple[str, ...]


@dataclass(frozen=True)
class InvestigatorContinuation:
    token: str
    originating_investigation_reference: str
    investigator_execution_id: str
    affected_rule_ids: tuple[str, ...]
    artifact_versions: dict[str, str]
    consumed: bool = False


@dataclass(frozen=True)
class InterviewRuntimeState:
    outcome: InterviewOutcome
    active_question: InterviewQuestion | None = None
    confirmed_context: dict[str, Any] = field(default_factory=dict)
    context_revision: int = 0
    coverage_limitations: tuple[str, ...] = ()
    missing_evidence_is_absence_proof: bool = False
    flags: tuple[str, ...] = ()
    blocked_actions: tuple[str, ...] = ()
    orchestration_recovery_required: bool = False
    planner_can_start: bool = False
    engineering_rule_can_start: bool = False
    interview_payload: dict[str, Any] = field(default_factory=dict)
    resume: dict[str, Any] | None = None


def initial_interview(
    *,
    coverage: TechnicalCoverage,
    customer_revisions: tuple[CustomerContextRevision, ...],
) -> InterviewRuntimeState:
    """Advance Minimal Setup/PGE through Initial Interview and Planner readiness."""
    if coverage.state == "UNAVAILABLE":
        return InterviewRuntimeState(
            outcome="FAILED",
            orchestration_recovery_required=True,
            coverage_limitations=coverage.limitations,
        )

    latest = customer_revisions[-1] if customer_revisions else None
    if latest is None:
        return InterviewRuntimeState(
            outcome="WAITING_FOR_CUSTOMER",
            active_question=InterviewQuestion(
                id="initial-context",
                intent="ASK",
                prompt="Describe the assessed system and where AI is involved.",
            ),
            coverage_limitations=coverage.limitations,
        )

    if latest.authority in {"UNCERTAIN", "CONFLICTED"}:
        return InterviewRuntimeState(
            outcome="WAITING_FOR_CUSTOMER",
            active_question=InterviewQuestion(
                id="initial-context-clarify",
                intent="CLARIFY",
                prompt="Clarify the ambiguous or conflicting Customer context.",
            ),
            coverage_limitations=coverage.limitations,
        )

    if latest.authority not in {"CUSTOMER_CONFIRMED", "CONFIRMED"}:
        return InterviewRuntimeState(
            outcome="WAITING_FOR_CUSTOMER",
            active_question=InterviewQuestion(
                id="initial-context-confirm",
                intent="ASK",
                prompt="Confirm the Customer context before it is used downstream.",
                control="CONFIRM_ADJUST",
            ),
            coverage_limitations=coverage.limitations,
        )

    return InterviewRuntimeState(
        outcome="CONTEXT_READY",
        confirmed_context=dict(latest.facts),
        context_revision=latest.revision,
        coverage_limitations=coverage.limitations,
        missing_evidence_is_absence_proof=False,
        planner_can_start=True,
        engineering_rule_can_start=True,
    )


def targeted_interview(
    *,
    need: BusinessContextNeed,
    continuation: InvestigatorContinuation,
    customer_revisions: tuple[CustomerContextRevision, ...],
    customer_blocked: bool = False,
) -> InterviewRuntimeState:
    """Resolve one Investigator-originated business-context need only."""
    latest = customer_revisions[-1] if customer_revisions else None
    payload = {
        "needId": need.need_id,
        "businessContextNeed": need.business_context_need,
        "resolutionCriteria": list(need.resolution_criteria),
        "originatingInvestigationReference": need.originating_investigation_reference,
    }

    if customer_blocked:
        return InterviewRuntimeState(
            outcome="BLOCKED_OR_UNRESOLVED",
            blocked_actions=(
                "PROVIDE_MORE_CONTEXT",
                "CHECK_INTERNALLY",
                "SAVE_AND_EXIT",
            ),
            interview_payload=payload,
        )

    if latest is None:
        return InterviewRuntimeState(
            outcome="WAITING_FOR_CUSTOMER",
            active_question=InterviewQuestion(
                id=f"{need.need_id}:ask",
                intent="ASK",
                prompt=need.business_context_need,
                need_id=need.need_id,
            ),
            interview_payload=payload,
        )

    if latest.authority in {"UNCERTAIN", "CONFLICTED", "CUSTOMER_STATED"}:
        return InterviewRuntimeState(
            outcome="WAITING_FOR_CUSTOMER",
            active_question=InterviewQuestion(
                id=f"{need.need_id}:clarify",
                intent="CLARIFY",
                prompt="Clarify this supplied Customer context before resume.",
                need_id=need.need_id,
            ),
            interview_payload=payload,
        )

    if not _criteria_satisfied(need, latest):
        return InterviewRuntimeState(
            outcome="WAITING_FOR_CUSTOMER",
            active_question=InterviewQuestion(
                id=f"{need.need_id}:criteria",
                intent="CLARIFY",
                prompt="Provide the remaining context required by the resolution criteria.",
                need_id=need.need_id,
            ),
            interview_payload=payload,
        )

    return InterviewRuntimeState(
        outcome="CONTEXT_RESOLVED",
        confirmed_context=dict(latest.facts),
        context_revision=latest.revision,
        flags=("DOWNSTREAM_IMPACT",),
        interview_payload=payload,
        resume={
            "investigatorExecutionId": continuation.investigator_execution_id,
            "originatingInvestigationReference": continuation.originating_investigation_reference,
            "affectedRuleIds": list(continuation.affected_rule_ids),
        },
    )


def validate_continuation(
    *,
    need: BusinessContextNeed,
    continuation: InvestigatorContinuation,
    current_artifact_versions: dict[str, str],
) -> InvestigatorContinuation:
    """Root Orchestration validates origin, freshness and one-shot resume."""
    if continuation.consumed:
        raise ValueError("duplicate continuation cannot be resumed")
    if (
        continuation.originating_investigation_reference
        != need.originating_investigation_reference
    ):
        raise ValueError("continuation origin does not match business context need")
    if continuation.affected_rule_ids != need.affected_rule_ids:
        raise ValueError("continuation affected rule scope changed")
    if continuation.artifact_versions != current_artifact_versions:
        raise ValueError("stale continuation requires orchestration revalidation")
    return replace(continuation, consumed=True)


def _criteria_satisfied(
    need: BusinessContextNeed,
    revision: CustomerContextRevision,
) -> bool:
    if revision.authority not in {"CUSTOMER_CONFIRMED", "CONFIRMED"}:
        return False
    normalized = {str(key) for key in revision.facts}
    return all(str(item) in normalized for item in need.resolution_criteria)


__all__ = [
    "BusinessContextNeed",
    "CustomerContextRevision",
    "InterviewQuestion",
    "InterviewRuntimeState",
    "InvestigatorContinuation",
    "TechnicalCoverage",
    "initial_interview",
    "targeted_interview",
    "validate_continuation",
]
