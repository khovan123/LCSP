from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class RuleEvaluationResult:
    rule_id: str
    status: str
    confidence: float
    rationale: list[str]
    matched_required_facts: list[str]
    blocking_facts: list[str]


class RuleApplicabilityEvaluator:
    """Deterministic evaluation of legal rules against verified profile facts."""

    def evaluate_rule(self, *, rule: dict[str, Any], verified_profile: dict[str, Any]) -> RuleEvaluationResult:
        merged_profile = verified_profile.get("mergedProfile") or {}
        evidence_refs = verified_profile.get("evidenceRefs") or []
        evidence_ids = {str(item.get("id")) for item in evidence_refs if isinstance(item, dict)}

        required_facts = rule.get("requiredFacts") or []
        blocking_facts = rule.get("blockingFacts") or []

        matched_required_facts: list[str] = []
        rationale: list[str] = []

        for fact in required_facts:
            if not isinstance(fact, dict):
                continue
            field = str(fact.get("field") or "")
            expected_value = fact.get("expectedValue")
            actual_value = merged_profile.get(field)
            if actual_value == expected_value:
                matched_required_facts.append(field)
                rationale.append(f"required fact {field} matched")
            else:
                rationale.append(f"required fact {field} missing")

        blocking_present = [
            str(item.get("field") or "")
            for item in blocking_facts
            if isinstance(item, dict) and str(item.get("field") or "") in merged_profile
        ]

        if blocking_present:
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status="NOT_APPLICABLE",
                confidence=0.0,
                rationale=rationale + ["blocking fact present"],
                matched_required_facts=matched_required_facts,
                blocking_facts=blocking_present,
            )

        if len(matched_required_facts) != len(required_facts):
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status="BLOCKED_UNKNOWN_FACT",
                confidence=0.0,
                rationale=rationale,
                matched_required_facts=matched_required_facts,
                blocking_facts=blocking_present,
            )

        if not evidence_ids:
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status="BLOCKED_UNKNOWN_FACT",
                confidence=0.0,
                rationale=rationale + ["evidence refs missing"],
                matched_required_facts=matched_required_facts,
                blocking_facts=blocking_present,
            )

        return RuleEvaluationResult(
            rule_id=str(rule.get("legalRuleId") or "unknown"),
            status="MATCHED",
            confidence=0.95,
            rationale=rationale,
            matched_required_facts=matched_required_facts,
            blocking_facts=blocking_present,
        )
