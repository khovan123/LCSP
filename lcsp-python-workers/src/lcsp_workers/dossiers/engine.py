"""Generic dossier engine; dossier types are views over immutable verified artifacts."""
from __future__ import annotations
import hashlib, json
from typing import Any
from .models import Dossier, DossierSourceArtifacts
AI_RISK_CLASSIFICATION = "AI_RISK_CLASSIFICATION"

class DossierEngine:
    REQUIRED = ("systemIdentity", "intendedUse", "technicalAiProfile", "dataProcessing", "affectedSubjects", "decisionImpact", "humanOversight", "externalProviders", "riskIndicators", "riskClassification", "classificationRationale", "applicableProvisions", "conflicts", "unresolvedEvidence", "gaps", "remediation")
    def build_classification_dossier(self, *, assessment_id: str, organization_id: str, version: int, source_artifacts: DossierSourceArtifacts, context: dict[str, Any], evidence_appendix: list[dict[str, Any]]) -> Dossier:
        missing = tuple(key for key in self.REQUIRED if context.get(key) in (None, "", [])); seed = json.dumps({"assessment": assessment_id, "version": version, "sources": source_artifacts.__dict__}, sort_keys=True); dossier_id = "dossier:" + hashlib.sha256(seed.encode()).hexdigest()[:24]
        return Dossier(dossier_id, AI_RISK_CLASSIFICATION, assessment_id, organization_id, version, "INCOMPLETE" if missing else "COMPLETE", source_artifacts, {key: context.get(key) for key in self.REQUIRED}, tuple(evidence_appendix), missing, {"dossierSchemaVersion": "1.0.0"})
