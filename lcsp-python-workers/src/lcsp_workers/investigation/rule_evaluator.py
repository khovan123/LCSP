"""Deterministically turn validated engineering claims into rule outcomes."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Iterable

from lcsp_workers.legal.engineering_rules.models import EngineeringRule

from .models import EvidenceClaim


ENGINEERING_RULE_EVALUATION_STATUSES = {
    "compliant": "COMPLIANT",
    "non_compliant": "NON_COMPLIANT",
    "unknown": "UNKNOWN",
}


@dataclass(frozen=True)
class EngineeringRuleEvaluation:
    engineering_rule_id: str
    legal_rule_id: str
    concept: str
    status: str
    reason: str
    evidence_refs: tuple[str, ...]
    source_chunk_ids: tuple[str, ...]
    source_locators: tuple[str, ...]
    confidence: float
    limitations: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class EngineeringRuleEvaluator:
    """Evaluate one EngineeringRule without allowing the LLM to be the final gate."""

    def evaluate(
        self,
        rule: EngineeringRule,
        claims: Iterable[EvidenceClaim],
    ) -> EngineeringRuleEvaluation:
        rows = list(claims)
        failed = [row for row in rows if row.claim_type == "RULE_REQUIREMENT_NOT_MET"]
        passed = [row for row in rows if row.claim_type == "RULE_REQUIREMENT_MET"]
        unresolved = [
            row for row in rows if row.claim_type == "UNRESOLVED_ENGINEERING_FACT"
        ]

        evidence_refs = tuple(
            sorted(
                {
                    ref
                    for row in rows
                    for ref in (
                        *row.evidence_refs,
                        *row.graph_path_refs,
                        *row.source_anchor_refs,
                    )
                    if ref
                }
            )
        )
        limitations = tuple(
            sorted({item for row in rows for item in row.limitations if item})
        )

        # Contradictory evidence must fail closed rather than silently choosing one.
        if failed and passed:
            return self._result(
                rule,
                ENGINEERING_RULE_EVALUATION_STATUSES["unknown"],
                "Conflicting evidence supports both satisfied and unsatisfied control states.",
                evidence_refs,
                rows,
                (*limitations, "CONFLICTING_ENGINEERING_EVIDENCE"),
            )

        if failed:
            backed = [row for row in failed if row.evidence_refs]
            if backed:
                return self._result(
                    rule,
                    ENGINEERING_RULE_EVALUATION_STATUSES["non_compliant"],
                    "Repository evidence demonstrates that the engineering requirement is not met.",
                    evidence_refs,
                    backed,
                    limitations,
                )
            unresolved.append(failed[0])

        if passed:
            backed = [row for row in passed if row.evidence_refs]
            if backed and not unresolved:
                return self._result(
                    rule,
                    ENGINEERING_RULE_EVALUATION_STATUSES["compliant"],
                    "Repository evidence demonstrates that the engineering requirement is met.",
                    evidence_refs,
                    backed,
                    limitations,
                )

        return self._result(
            rule,
            ENGINEERING_RULE_EVALUATION_STATUSES["unknown"],
            "Available repository evidence is insufficient to determine this engineering requirement.",
            evidence_refs,
            rows,
            limitations or ("ENGINEERING_EVIDENCE_INSUFFICIENT",),
        )

    @staticmethod
    def _result(
        rule: EngineeringRule,
        status: str,
        reason: str,
        evidence_refs: tuple[str, ...],
        claims: list[EvidenceClaim],
        limitations: tuple[str, ...],
    ) -> EngineeringRuleEvaluation:
        confidence = max((row.confidence for row in claims), default=0.0)
        confidence = max(0.0, min(1.0, float(confidence)))
        return EngineeringRuleEvaluation(
            engineering_rule_id=rule.engineering_rule_id,
            legal_rule_id=rule.legal_rule_id,
            concept=rule.concept,
            status=status,
            reason=reason,
            evidence_refs=evidence_refs,
            source_chunk_ids=rule.source_chunk_ids,
            source_locators=rule.source_locators,
            confidence=confidence,
            limitations=tuple(dict.fromkeys(limitations)),
        )
