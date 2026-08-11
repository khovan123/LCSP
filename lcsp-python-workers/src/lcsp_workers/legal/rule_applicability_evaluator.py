from __future__ import annotations

from dataclasses import dataclass
from typing import Any


UNKNOWN_FACT_VALUES = {
    "UNKNOWN",
    "UNCLEAR",
    "NOT_DETERMINABLE_FROM_CODE",
}


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

    def evaluate_rule(
        self,
        *,
        rule: dict[str, Any],
        verified_profile: dict[str, Any],
    ) -> RuleEvaluationResult:
        merged_profile = verified_profile.get("mergedProfile") or {}
        evidence_refs = verified_profile.get("evidenceRefs") or []
        evidence_ids = {
            str(item.get("id"))
            for item in evidence_refs
            if isinstance(item, dict) and item.get("id")
        }

        required_facts = rule.get("requiredFacts") or []
        blocking_facts = rule.get("blockingFacts") or []
        unknown_fact_policy = str(rule.get("unknownFactPolicy") or "BLOCK_ON_UNKNOWN")

        matched_required_facts: list[str] = []
        unknown_required_facts: list[str] = []
        mismatched_required_facts: list[str] = []
        rationale: list[str] = []

        for fact in required_facts:
            if not isinstance(fact, dict):
                continue
            field = str(fact.get("field") or "")
            if not field:
                continue
            expected_value = fact.get("expectedValue")
            actual_value = merged_profile.get(field)

            if is_unknown_fact(actual_value):
                unknown_required_facts.append(field)
                rationale.append(f"required fact {field} is unknown")
            elif fact_matches(actual_value, expected_value):
                matched_required_facts.append(field)
                rationale.append(f"required fact {field} matched")
            else:
                mismatched_required_facts.append(field)
                rationale.append(f"required fact {field} did not match")

        blocking_present: list[str] = []
        for item in blocking_facts:
            if not isinstance(item, dict):
                continue
            field = str(item.get("field") or "")
            if not field or field not in merged_profile:
                continue
            actual_value = merged_profile.get(field)
            if "expectedValue" not in item:
                if not is_unknown_fact(actual_value):
                    blocking_present.append(field)
                continue
            if not is_unknown_fact(actual_value) and fact_matches(
                actual_value,
                item.get("expectedValue"),
            ):
                blocking_present.append(field)

        if blocking_present:
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status="NOT_APPLICABLE",
                confidence=0.0,
                rationale=rationale + ["blocking fact matched"],
                matched_required_facts=matched_required_facts,
                blocking_facts=blocking_present,
            )

        if mismatched_required_facts:
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status="NOT_APPLICABLE",
                confidence=0.0,
                rationale=rationale,
                matched_required_facts=matched_required_facts,
                blocking_facts=blocking_present,
            )

        if unknown_required_facts:
            status = (
                "BLOCKED_UNKNOWN_FACT"
                if unknown_fact_policy == "BLOCK_ON_UNKNOWN"
                else "NOT_APPLICABLE"
            )
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status=status,
                confidence=0.0,
                rationale=rationale,
                matched_required_facts=matched_required_facts,
                blocking_facts=blocking_present,
            )

        if len(matched_required_facts) != len(
            [fact for fact in required_facts if isinstance(fact, dict) and fact.get("field")]
        ):
            return RuleEvaluationResult(
                rule_id=str(rule.get("legalRuleId") or "unknown"),
                status="BLOCKED_UNKNOWN_FACT",
                confidence=0.0,
                rationale=rationale + ["required fact definition invalid"],
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


def is_unknown_fact(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        normalized = value.strip().upper()
        return not normalized or normalized in UNKNOWN_FACT_VALUES
    return False


def fact_matches(actual_value: Any, expected_value: Any) -> bool:
    """Match rule facts without requiring exact list equality.

    Legal profile list fields are additive (for example harm categories), so a
    rule requiring one category must still match when the verified profile has
    other categories as well. Scalar expectations also match membership in an
    actual list. No coercion between unrelated scalar types is performed.
    """

    if isinstance(expected_value, list):
        if not isinstance(actual_value, list):
            return False
        return all(expected in actual_value for expected in expected_value)
    if isinstance(actual_value, list):
        return expected_value in actual_value
    return actual_value == expected_value
