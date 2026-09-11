"""Deterministic validation for structured specialist handoffs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ValidationError

from contracts.handoffs import (
    InvestigatorClaim,
    InvestigatorRequirementMetClaim,
    InvestigatorRequirementNotMetClaim,
    InvestigatorResult,
    InvestigatorScopeNotApplicableClaim,
    InvestigatorUnresolvedClaim,
    ResolverResult,
    SPECIALIST_RESPONSE_FORMATS,
)
from tools.common.capabilities.assessment.claims.evidence_claim.evidence_claim_validator import (
    EvidenceClaimValidationError,
    EvidenceClaimValidator,
)
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
)


class SpecialistHandoffValidationError(RuntimeError):
    """Raised when a specialist returns an unsafe or invalid handoff."""


_CAUSE_DETAIL_LIMIT = 500

# `InvestigatorClaim` is a plain `Union` (anyOf, not a discriminated oneOf — see
# contracts/handoffs.py for why). Pydantic's "smart union" validates a claim against every
# variant and reports every variant's failures, so a real error (e.g. the UNRESOLVED
# variant's empty `limitations`) arrives buried under 3 irrelevant "this isn't a MET claim"
# reports. _filter_union_variant_noise below narrows to the one variant whose claim_type
# actually matched before rendering.
_INVESTIGATOR_CLAIM_VARIANT_NAMES = tuple(
    cls.__name__
    for cls in (
        InvestigatorRequirementMetClaim,
        InvestigatorRequirementNotMetClaim,
        InvestigatorUnresolvedClaim,
        InvestigatorScopeNotApplicableClaim,
    )
)


def _union_variant_in_segment(segment: Any) -> str | None:
    text = str(segment)
    for name in _INVESTIGATOR_CLAIM_VARIANT_NAMES:
        if name in text:
            return name
    return None


def _filter_union_variant_noise(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    generic: list[dict[str, Any]] = []
    variant_groups: dict[str, list[dict[str, Any]]] = {}
    for error in errors:
        variant = next(
            (v for v in map(_union_variant_in_segment, error.get("loc", ())) if v),
            None,
        )
        (generic if variant is None else variant_groups.setdefault(variant, [])).append(
            error
        )
    if not variant_groups:
        return errors
    # A variant whose own errors include a `claim_type` mismatch never matched the input at
    # all; its other field errors ("criterion required", etc.) are artifacts of the smart
    # union trying every shape, not real problems with the claim the caller sent.
    matched = {
        variant: group
        for variant, group in variant_groups.items()
        if not any(error.get("loc", ())[-1:] == ("claim_type",) for error in group)
    }
    if len(matched) == 1:
        (group,) = matched.values()
        return [*generic, *group]
    return errors


def _bounded_cause(exc: Exception) -> str:
    """Render a bounded, PII-safe summary of the underlying validation failure.

    Callers (structured logs, ``_recovery_instruction``) need the actual field/rule that
    failed, not just the generic outer message, or the model has nothing concrete to
    self-correct against. ``ValidationError.errors(include_input=False)`` keeps this safe:
    it surfaces ``loc``/``msg`` only, never the model's raw field values.
    """
    if isinstance(exc, ValidationError):
        errors = exc.errors(include_url=False, include_context=False, include_input=False)
        errors = _filter_union_variant_noise(errors)
        parts = []
        for error in errors:
            loc = ".".join(
                str(segment)
                for segment in error.get("loc", ())
                if _union_variant_in_segment(segment) is None
            )
            msg = str(error.get("msg") or "")
            parts.append(f"{loc}: {msg}" if loc else msg)
        text = "; ".join(parts)
    else:
        text = str(exc)
    text = text.strip()
    if len(text) > _CAUSE_DETAIL_LIMIT:
        text = text[:_CAUSE_DETAIL_LIMIT].rstrip() + "..."
    return text


FORBIDDEN_FINAL_VERDICTS = frozenset({"COMPLIANT", "NON_COMPLIANT"})
CONTROLLED_NON_VERDICT_PATHS = frozenset(
    {
        ("status",),
        ("coverage_state",),
        ("coverageState",),
        ("next_step",),
        ("nextStep",),
    }
)


def _validate_customer_context_claim_refs(
    claims: list[InvestigatorClaim],
    *,
    confirmed_statement_refs: tuple[str, ...],
) -> None:
    known = {str(ref) for ref in confirmed_statement_refs if str(ref).strip()}
    for claim in claims:
        if (
            claim.claim_type
            != ENGINEERING_EVIDENCE_CLAIM_TYPES["rule_scope_not_applicable"]
        ):
            continue
        missing = [ref for ref in claim.customer_context_refs if ref not in known]
        if missing or not known:
            raise SpecialistHandoffValidationError(
                "RULE_SCOPE_NOT_APPLICABLE customer_context_refs must reference confirmed statements"
            )

def _response_model(subagent_type: str) -> type[BaseModel]:
    if subagent_type == "resolver":
        return ResolverResult
    try:
        return SPECIALIST_RESPONSE_FORMATS[subagent_type]
    except KeyError as exc:
        raise SpecialistHandoffValidationError(
            f"unknown LCSP specialist handoff type: {subagent_type}"
        ) from exc


def _is_controlled_non_verdict_path(path: tuple[str, ...]) -> bool:
    if path in CONTROLLED_NON_VERDICT_PATHS:
        return True
    if path[-1:] in {("claim_type",), ("claimType",)} and "claims" in path:
        return True
    if path[-1:] in {("source",)} and "conflicting_values" in path:
        return True
    if path[-1:] in {("source_kind",), ("sourceKind",)}:
        return True
    return False


def _assert_no_final_verdict(value: Any, *, path: tuple[str, ...] = ()) -> None:
    if path and _is_controlled_non_verdict_path(path):
        return
    if isinstance(value, str):
        tokens = {
            token.strip(".,:;()[]{}").upper()
            for token in value.replace("-", "_").split()
        }
        verdicts = sorted(tokens & FORBIDDEN_FINAL_VERDICTS)
        if verdicts:
            raise SpecialistHandoffValidationError(
                f"specialist handoff contains forbidden compliance verdict: {verdicts}"
        )
        return
    if isinstance(value, dict):
        for key, child in value.items():
            _assert_no_final_verdict(child, path=(*path, str(key)))
        return
    if isinstance(value, (list, tuple, set)):
        for child in value:
            _assert_no_final_verdict(child, path=path)


def validate_specialist_handoff(
    subagent_type: str,
    payload: Any,
    *,
    graph: Any | None = None,
    pinned_rule_ids: tuple[str, ...] | list[str] | None = None,
    pinned_versions: dict[str, str] | None = None,
    confirmed_statement_refs: tuple[str, ...] | list[str] | None = None,
) -> BaseModel:
    """Validate a specialist handoff before root or deterministic gates consume it."""
    model = _response_model(subagent_type)
    try:
        handoff = payload if isinstance(payload, model) else model.model_validate(payload)
    except ValidationError as exc:
        raise SpecialistHandoffValidationError(
            f"{subagent_type} handoff failed schema validation: {_bounded_cause(exc)}"
        ) from exc

    _assert_no_final_verdict(handoff.model_dump(mode="json"))

    if subagent_type == "investigator":
        investigator = InvestigatorResult.model_validate(handoff)
        if (
            graph is not None
            and pinned_rule_ids is not None
            and pinned_versions is not None
        ):
            validate_investigator_handoff(
                investigator,
                pinned_rule_ids=tuple(pinned_rule_ids),
                pinned_versions=pinned_versions,
                program_graph=graph,
                confirmed_statement_refs=confirmed_statement_refs,
            )
        elif investigator.status == "READY":
            raise SpecialistHandoffValidationError(
                "READY investigator handoff requires graph, pinned_rule_ids, and pinned_versions"
            )

    return handoff


def validate_investigator_handoff(
    result: InvestigatorResult | dict[str, Any],
    *,
    pinned_rule_ids: tuple[str, ...],
    pinned_versions: dict[str, str],
    program_graph: Any,
    confirmed_statement_refs: tuple[str, ...] | list[str] | None = None,
) -> tuple[Any, ...]:
    """Validate an Investigator handoff against immutable run pins."""
    handoff = (
        result if isinstance(result, InvestigatorResult) else InvestigatorResult.model_validate(result)
    )
    expected_versions = {str(key): str(value) for key, value in pinned_versions.items()}
    if handoff.artifact_versions != expected_versions:
        raise SpecialistHandoffValidationError(
            "investigator handoff artifact_versions do not match pinned versions"
        )

    pinned_rules = set(pinned_rule_ids)
    changed_rules = sorted(
        {
            claim.engineering_rule_id
            for claim in handoff.claims
            if claim.engineering_rule_id not in pinned_rules
        }
    )
    if changed_rules:
        raise SpecialistHandoffValidationError(
            f"investigator handoff contains unpinned engineering_rule_ids: {changed_rules}"
        )

    if handoff.status != "READY":
        return ()

    _validate_customer_context_claim_refs(
        handoff.claims,
        confirmed_statement_refs=tuple(confirmed_statement_refs or ()),
    )

    validator = EvidenceClaimValidator()
    validated_claims: list[Any] = []
    try:
        for claim in handoff.claims:
            if (
                claim.claim_type
                == ENGINEERING_EVIDENCE_CLAIM_TYPES["rule_scope_not_applicable"]
            ):
                validated_claims.append(claim.to_evidence_claim())
                continue
            validated_claims.append(validator.validate(claim.to_evidence_claim(), program_graph))
    except EvidenceClaimValidationError as exc:
        raise SpecialistHandoffValidationError(
            "investigator handoff failed evidence-claim validation "
            f"(claim_id={claim.claim_id!r}, criterion={claim.criterion!r}): "
            f"{_bounded_cause(exc)}"
        ) from exc

    if not validated_claims:
        raise SpecialistHandoffValidationError(
            "READY investigator handoff requires validated claims"
        )
    return tuple(validated_claims)


__all__ = [
    "FORBIDDEN_FINAL_VERDICTS",
    "SpecialistHandoffValidationError",
    "validate_investigator_handoff",
    "validate_specialist_handoff",
]
