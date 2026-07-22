from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from lcsp_workers.platform.redaction import redact_string

from .confidence_calculator import calculate_claim_confidence, lifecycle_for_confidence
from .conflict_candidate_builder import ConflictCandidateBuilder


SCHEMA_VERSION = "1.0.0"
DEFAULT_PROVIDER_VERSION = "lcsp.ai-usage-flow-worker.v1"
TECHNICAL_ONLY = "TECHNICAL_ONLY"
TECHNICAL_PLUS_WIZARD = "TECHNICAL_PLUS_WIZARD"
SYNTHETIC_OUTPUT_CATEGORIES = {"audio", "image", "video", "synthetic_media"}


class PrivacyAssertionError(RuntimeError):
    """Raised when AIUsageFlow generation detects unsafe raw content."""


@dataclass(frozen=True)
class AIUsageFlowClaim:
    claim_id: str
    ai_usage_flow_id: str
    claim_category: str
    claim_field: str
    claim_value: object
    lifecycle_state: str
    evidence_refs: list[str]
    confidence: float
    confidence_breakdown: dict[str, float]
    uncertainty_reasons: list[str] = field(default_factory=list)
    conflict_refs: list[str] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class AIUsageFlow:
    ai_usage_flow_id: str
    assessment_id: str
    technical_profile_id: str
    technical_evidence_report_id: str | None
    schema_version: str
    provider_version: str
    status: str
    verification_source: str
    summary: dict[str, Any]
    claims: list[AIUsageFlowClaim]
    confidence: float
    uncertainty_reasons: list[str]
    coverage_limitations: list[str]
    conflict_candidates: list[dict[str, Any]]
    privacy_flags: dict[str, bool]

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["claims"] = [claim.to_dict() for claim in self.claims]
        return data


class AIUsageFlowRuleEngine:
    def __init__(
        self,
        *,
        provider_version: str = DEFAULT_PROVIDER_VERSION,
        conflict_builder: ConflictCandidateBuilder | None = None,
    ) -> None:
        self._provider_version = provider_version
        self._conflict_builder = conflict_builder or ConflictCandidateBuilder()

    def generate(
        self,
        *,
        technical_profile: dict[str, Any] | None,
        evidence_report: dict[str, Any] | None,
        wizard_profile: dict[str, Any] | None,
    ) -> AIUsageFlow:
        if not technical_profile:
            return self._blocked_flow("MISSING_TECHNICAL_PROFILE")
        if not evidence_report:
            return self._blocked_flow(
                "MISSING_TECHNICAL_EVIDENCE_REPORT",
                technical_profile=technical_profile,
            )
        if str(evidence_report.get("status", "")).lower() not in {"", "accepted"}:
            return self._blocked_flow(
                "TECHNICAL_EVIDENCE_REPORT_NOT_ACCEPTED",
                technical_profile=technical_profile,
                evidence_report=evidence_report,
            )

        self._assert_privacy(technical_profile, evidence_report)

        flow_id = self._flow_id(technical_profile)
        findings = self._findings(evidence_report)
        coverage_limitations = self._coverage_limitations(technical_profile, evidence_report)
        uncertainty_reasons = list(coverage_limitations)
        claims: list[AIUsageFlowClaim] = []

        provider_refs = self._refs_for(findings, {"AI_PROVIDER_USAGE", "AI_FRAMEWORK_USAGE", "provider_integration"})
        invocation_refs = self._refs_for(findings, {"AI_MODEL_INVOCATION", "model_call"})
        output_refs = self._refs_for(findings, {"AI_OUTPUT_SIGNAL", "output_signal"})

        if provider_refs or self._list_field(technical_profile, "providers") or self._list_field(technical_profile, "frameworks"):
            claims.append(
                self._claim(
                    flow_id=flow_id,
                    claim_category="MODEL_PROVIDER_USAGE",
                    claim_field="provider_usage",
                    claim_value={
                        "providers": self._list_field(technical_profile, "providers"),
                        "frameworks": self._list_field(technical_profile, "frameworks"),
                    },
                    evidence_refs=provider_refs or self._list_field(technical_profile, "evidence_refs"),
                    optional_signal_count=1 if self._list_field(technical_profile, "providers") else 0,
                    material_coverage_limitations=len(coverage_limitations),
                )
            )

        if invocation_refs or self._has_signal(findings, {"AI_MODEL_INVOCATION", "model_call"}):
            claims.append(
                self._claim(
                    flow_id=flow_id,
                    claim_category="MODEL_INVOCATION",
                    claim_field="model_invocation",
                    claim_value={"invocationDetected": True},
                    evidence_refs=invocation_refs,
                    optional_signal_count=1
                    if provider_refs or self._list_field(technical_profile, "providers")
                    else 0,
                    material_coverage_limitations=len(coverage_limitations),
                )
            )
        elif provider_refs or self._list_field(technical_profile, "providers"):
            uncertainty_reasons.append("PROVIDER_ONLY_SIGNAL")

        if output_refs:
            claims.append(
                self._claim(
                    flow_id=flow_id,
                    claim_category="AI_GENERATED_OUTPUT",
                    claim_field="output_categories",
                    claim_value={
                        "outputCategories": self._output_categories(technical_profile, findings)
                    },
                    evidence_refs=output_refs,
                    optional_signal_count=0,
                    material_coverage_limitations=len(coverage_limitations),
                )
            )

        content_labeling_claim = self._content_labeling_claim(
            flow_id=flow_id,
            technical_profile=technical_profile,
            findings=findings,
            coverage_limitations=coverage_limitations,
        )
        if content_labeling_claim:
            claims.append(content_labeling_claim)

        conflict_candidates = self._conflict_builder.build(
            technical_profile=technical_profile,
            wizard_profile=wizard_profile,
            has_validated_invocation=any(
                claim.claim_category == "MODEL_INVOCATION"
                and claim.lifecycle_state == "VALIDATED"
                for claim in claims
            ),
        )
        if conflict_candidates:
            claims = [
                self._apply_conflict(claim, conflict_candidates)
                if claim.claim_category == "MODEL_INVOCATION"
                else claim
                for claim in claims
            ]

        summary = self._summary(
            technical_profile=technical_profile,
            wizard_profile=wizard_profile,
            claims=claims,
            uncertainty_reasons=uncertainty_reasons,
        )
        status = self._status(claims, uncertainty_reasons, conflict_candidates)
        confidence = self._overall_confidence(claims, uncertainty_reasons)
        privacy_flags = {"containsSourceCode": False, "secretsRedacted": True}
        flow = AIUsageFlow(
            ai_usage_flow_id=flow_id,
            assessment_id=self._str_field(technical_profile, "assessment_id"),
            technical_profile_id=self._technical_profile_id(technical_profile),
            technical_evidence_report_id=self._evidence_report_id(technical_profile, evidence_report),
            schema_version=SCHEMA_VERSION,
            provider_version=self._provider_version,
            status=status,
            verification_source=TECHNICAL_PLUS_WIZARD if wizard_profile else TECHNICAL_ONLY,
            summary=summary,
            claims=claims,
            confidence=confidence,
            uncertainty_reasons=uncertainty_reasons,
            coverage_limitations=coverage_limitations,
            conflict_candidates=conflict_candidates,
            privacy_flags=privacy_flags,
        )
        self._assert_output_safe(flow.to_dict())
        return flow

    def _claim(
        self,
        *,
        flow_id: str,
        claim_category: str,
        claim_field: str,
        claim_value: object,
        evidence_refs: list[str],
        optional_signal_count: int,
        material_coverage_limitations: int,
    ) -> AIUsageFlowClaim:
        missing_refs = not evidence_refs
        confidence, breakdown = calculate_claim_confidence(
            claim_category,
            required_evidence_present=not missing_refs,
            optional_signal_count=optional_signal_count,
            material_coverage_limitations=material_coverage_limitations,
            has_wizard_conflict=False,
            missing_required_evidence_class=missing_refs,
        )
        uncertainty = ["MISSING_EVIDENCE_REF"] if missing_refs else []
        return AIUsageFlowClaim(
            claim_id=f"claim_{claim_category.lower()}",
            ai_usage_flow_id=flow_id,
            claim_category=claim_category,
            claim_field=claim_field,
            claim_value=claim_value,
            lifecycle_state=lifecycle_for_confidence(
                confidence,
                missing_evidence_ref=missing_refs,
            ),
            evidence_refs=evidence_refs,
            confidence=confidence,
            confidence_breakdown=breakdown,
            uncertainty_reasons=uncertainty,
        )

    def _content_labeling_claim(
        self,
        *,
        flow_id: str,
        technical_profile: dict[str, Any],
        findings: list[dict[str, Any]],
        coverage_limitations: list[str],
    ) -> AIUsageFlowClaim | None:
        output_categories = set(self._output_categories(technical_profile, findings))
        synthetic_output = bool(output_categories & SYNTHETIC_OUTPUT_CATEGORIES)
        if not synthetic_output:
            return None

        labeling_refs = self._refs_for(findings, {"CONTENT_LABELING_SIGNAL", "LABELING_SIGNAL"})
        output_refs = self._refs_for(findings, {"AI_OUTPUT_SIGNAL", "output_signal"})
        path_resolved = any(bool(finding.get("path_resolved") or finding.get("pathResolved")) for finding in findings)
        status = "PRESENT" if labeling_refs else "ABSENT" if path_resolved else "UNCLEAR"
        return self._claim(
            flow_id=flow_id,
            claim_category="CONTENT_LABELING",
            claim_field="content_labeling_status",
            claim_value={"contentLabelingStatus": status},
            evidence_refs=labeling_refs or output_refs,
            optional_signal_count=1 if labeling_refs else 0,
            material_coverage_limitations=len(coverage_limitations),
        )

    def _apply_conflict(
        self,
        claim: AIUsageFlowClaim,
        conflicts: list[dict[str, Any]],
    ) -> AIUsageFlowClaim:
        confidence, breakdown = calculate_claim_confidence(
            claim.claim_category,
            required_evidence_present=bool(claim.evidence_refs),
            optional_signal_count=0,
            material_coverage_limitations=0,
            has_wizard_conflict=True,
            missing_required_evidence_class=False,
        )
        return AIUsageFlowClaim(
            claim_id=claim.claim_id,
            ai_usage_flow_id=claim.ai_usage_flow_id,
            claim_category=claim.claim_category,
            claim_field=claim.claim_field,
            claim_value=claim.claim_value,
            lifecycle_state="CONFLICTED",
            evidence_refs=claim.evidence_refs,
            confidence=confidence,
            confidence_breakdown=breakdown,
            uncertainty_reasons=list(claim.uncertainty_reasons),
            conflict_refs=[str(conflict["conflict_id"]) for conflict in conflicts],
        )

    def _blocked_flow(
        self,
        reason: str,
        *,
        technical_profile: dict[str, Any] | None = None,
        evidence_report: dict[str, Any] | None = None,
    ) -> AIUsageFlow:
        technical_profile = technical_profile or {}
        return AIUsageFlow(
            ai_usage_flow_id="blocked_ai_usage_flow",
            assessment_id=self._str_field(technical_profile, "assessment_id"),
            technical_profile_id=self._technical_profile_id(technical_profile),
            technical_evidence_report_id=self._evidence_report_id(technical_profile, evidence_report or {}),
            schema_version=SCHEMA_VERSION,
            provider_version=self._provider_version,
            status="BLOCKED",
            verification_source=TECHNICAL_ONLY,
            summary=self._empty_summary([reason]),
            claims=[],
            confidence=0.0,
            uncertainty_reasons=[reason],
            coverage_limitations=[],
            conflict_candidates=[],
            privacy_flags={"containsSourceCode": False, "secretsRedacted": True},
        )

    def _summary(
        self,
        *,
        technical_profile: dict[str, Any],
        wizard_profile: dict[str, Any] | None,
        claims: list[AIUsageFlowClaim],
        uncertainty_reasons: list[str],
    ) -> dict[str, Any]:
        answers = wizard_profile.get("answers") if wizard_profile else {}
        answers = answers if isinstance(answers, dict) else {}
        material_claim_refs = [
            claim.claim_id
            for claim in claims
            if claim.lifecycle_state == "VALIDATED"
            and claim.evidence_refs
            and claim.confidence >= 0.75
        ]
        content_labeling = next(
            (
                claim.claim_value.get("contentLabelingStatus")
                for claim in claims
                if claim.claim_category == "CONTENT_LABELING"
                and isinstance(claim.claim_value, dict)
            ),
            "NOT_APPLICABLE",
        )
        return {
            "aiDetected": self._str_field(technical_profile, "ai_detected") or "unknown",
            "businessProcess": answers.get("businessProcess", "UNKNOWN"),
            "aiPurpose": answers.get("aiPurpose", "UNKNOWN"),
            "aiInputTypes": self._list_field(technical_profile, "input_categories"),
            "aiOutputTypes": self._list_field(technical_profile, "output_categories"),
            "downstreamAction": "UNKNOWN",
            "affectedSubjects": answers.get("affectedSubjects", "UNKNOWN"),
            "humanReview": "UNCLEAR",
            "automationLevel": "UNKNOWN",
            "potentialHarmCategories": [],
            "contentLabelingStatus": content_labeling,
            "riskDocumentationEvidence": "NOT_DETERMINABLE_FROM_CODE",
            "trainingDataLawfulnessSignal": "NOT_DETERMINABLE_FROM_CODE",
            "interventionControlPresent": "NOT_APPLICABLE",
            "aiInteractionDisclosurePresent": "NOT_APPLICABLE",
            "incidentHandlingPresent": "UNCLEAR",
            "materialClaimRefs": material_claim_refs,
            "blockingReasons": list(uncertainty_reasons),
        }

    def _empty_summary(self, reasons: list[str]) -> dict[str, Any]:
        return {
            "aiDetected": "unknown",
            "businessProcess": "UNKNOWN",
            "aiPurpose": "UNKNOWN",
            "aiInputTypes": [],
            "aiOutputTypes": [],
            "downstreamAction": "UNKNOWN",
            "affectedSubjects": "UNKNOWN",
            "humanReview": "UNCLEAR",
            "automationLevel": "UNKNOWN",
            "potentialHarmCategories": [],
            "contentLabelingStatus": "NOT_APPLICABLE",
            "riskDocumentationEvidence": "NOT_DETERMINABLE_FROM_CODE",
            "trainingDataLawfulnessSignal": "NOT_DETERMINABLE_FROM_CODE",
            "interventionControlPresent": "NOT_APPLICABLE",
            "aiInteractionDisclosurePresent": "NOT_APPLICABLE",
            "incidentHandlingPresent": "UNCLEAR",
            "materialClaimRefs": [],
            "blockingReasons": list(reasons),
        }

    def _status(
        self,
        claims: list[AIUsageFlowClaim],
        uncertainty_reasons: list[str],
        conflicts: list[dict[str, Any]],
    ) -> str:
        if conflicts:
            return "CONFLICTED"
        if not claims or any(claim.lifecycle_state == "REJECTED" for claim in claims):
            return "UNCLEAR"
        if uncertainty_reasons:
            return "UNCLEAR"
        return "READY"

    def _overall_confidence(
        self,
        claims: list[AIUsageFlowClaim],
        uncertainty_reasons: list[str],
    ) -> float:
        material = [claim.confidence for claim in claims if claim.evidence_refs]
        if not material:
            return 0.0
        raw = sum(material) / len(material) - (0.05 * len(uncertainty_reasons))
        return round(max(0.0, min(1.0, raw)), 2)

    def _assert_privacy(
        self,
        technical_profile: dict[str, Any],
        evidence_report: dict[str, Any],
    ) -> None:
        for payload in (technical_profile, evidence_report):
            privacy_flags = payload.get("privacy_flags") or payload.get("privacyFlags")
            if isinstance(privacy_flags, dict):
                if privacy_flags.get("containsSourceCode") is True:
                    raise PrivacyAssertionError("AIUsageFlow input contains source code")
                if privacy_flags.get("secretsRedacted") is False:
                    raise PrivacyAssertionError("AIUsageFlow input contains secrets")
        self._assert_output_safe({"technical_profile": technical_profile, "evidence_report": evidence_report})

    def _assert_output_safe(self, value: Any) -> None:
        if isinstance(value, dict):
            for key, nested_value in value.items():
                if str(key) in {"raw_source", "rawSource", "source_code", "sourceCode", "ast_body", "astBody"}:
                    raise PrivacyAssertionError("AIUsageFlow contains raw source field")
                self._assert_output_safe(nested_value)
            return
        if isinstance(value, list):
            for nested_value in value:
                self._assert_output_safe(nested_value)
            return
        if isinstance(value, str):
            if "def " in value or "function " in value or "class " in value:
                raise PrivacyAssertionError("AIUsageFlow contains raw source text")
            if redact_string(value) != value:
                raise PrivacyAssertionError("AIUsageFlow contains unredacted secret")

    def _findings(self, evidence_report: dict[str, Any]) -> list[dict[str, Any]]:
        payload = evidence_report.get("evidence_payload") or evidence_report.get("evidencePayload") or {}
        if not isinstance(payload, dict):
            return []
        findings = payload.get("ai_usage_signals") or payload.get("technical_findings") or payload.get("findings") or []
        return [finding for finding in findings if isinstance(finding, dict)]

    def _refs_for(self, findings: list[dict[str, Any]], signal_types: set[str]) -> list[str]:
        refs: list[str] = []
        normalized = {signal.lower() for signal in signal_types}
        for finding in findings:
            signal_type = str(finding.get("signal_type") or finding.get("finding_type") or finding.get("type") or "").lower()
            if signal_type not in normalized:
                continue
            value = (
                finding.get("evidence_ref")
                or finding.get("evidenceRef")
                or finding.get("evidence_ref_id")
                or finding.get("evidenceRefId")
            )
            if value:
                refs.append(str(value))
        return sorted(set(refs))

    def _has_signal(self, findings: list[dict[str, Any]], signal_types: set[str]) -> bool:
        normalized = {signal.lower() for signal in signal_types}
        return any(
            str(
                finding.get("signal_type")
                or finding.get("finding_type")
                or finding.get("type")
                or ""
            ).lower()
            in normalized
            for finding in findings
        )

    def _coverage_limitations(
        self,
        technical_profile: dict[str, Any],
        evidence_report: dict[str, Any],
    ) -> list[str]:
        limitations = self._list_field(technical_profile, "coverage_limitations")
        payload = evidence_report.get("evidence_payload") or evidence_report.get("evidencePayload") or {}
        if isinstance(payload, dict):
            limitations.extend(str(note) for note in payload.get("coverage_notes", []) if note)
        return sorted(set(limitations))

    def _output_categories(
        self,
        technical_profile: dict[str, Any],
        findings: list[dict[str, Any]],
    ) -> list[str]:
        categories = set(self._list_field(technical_profile, "output_categories"))
        for finding in findings:
            category = finding.get("output_category") or finding.get("outputCategory")
            if category:
                categories.add(str(category))
        return sorted(categories)

    def _flow_id(self, technical_profile: dict[str, Any]) -> str:
        return f"aiuf-{self._technical_profile_id(technical_profile) or 'unknown'}"

    def _technical_profile_id(self, technical_profile: dict[str, Any]) -> str:
        return self._str_field(technical_profile, "technical_profile_id") or self._str_field(technical_profile, "id")

    def _evidence_report_id(
        self,
        technical_profile: dict[str, Any],
        evidence_report: dict[str, Any],
    ) -> str | None:
        return (
            self._str_field(technical_profile, "evidence_report_id")
            or self._str_field(evidence_report, "id")
            or None
        )

    def _str_field(self, payload: dict[str, Any], key: str) -> str:
        value = payload.get(key) or payload.get(self._to_camel_case(key))
        return str(value) if value else ""

    def _list_field(self, payload: dict[str, Any], key: str) -> list[str]:
        value = payload.get(key) or payload.get(self._to_camel_case(key))
        return [str(item) for item in value] if isinstance(value, list) else []

    def _to_camel_case(self, key: str) -> str:
        parts = key.split("_")
        return parts[0] + "".join(part.title() for part in parts[1:])
