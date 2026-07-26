import type { MissingEvidenceItem } from "./readiness.contract.js";
import type { READINESS_EXPORT_STATUSES } from "@lcsp/contracts/wizard";

export type ReadinessExportStatus =
  (typeof READINESS_EXPORT_STATUSES)[keyof typeof READINESS_EXPORT_STATUSES];

export interface ReadinessExportContent {
  label: "Wizard Readiness Export";
  badge: "READINESS_ONLY";
  title: "Wizard Readiness Export";
  preview: string;
  metadata: {
    label: "Wizard Readiness Export";
    readiness_only: true;
    assessment_id: string;
    wizard_profile_version: number;
    owner_id: string;
    version: number;
    generated_at: string;
  };
  missing_evidence: MissingEvidenceItem[];
  unresolved_unknowns: string[];
  preparation_guidance: string[];
  next_steps: string[];
}

export interface ReadinessExportResponse {
  export_id: string;
  assessment_id: string;
  owner_id: string;
  status: ReadinessExportStatus;
  label: "Wizard Readiness Export";
  classification_locked: true;
  missing_evidence: MissingEvidenceItem[];
  unresolved_unknowns: string[];
  preparation_guidance: string[];
  generated_at: string;
  version: number;
  correlation_id: string;
  blocked_reason?: string;
}
