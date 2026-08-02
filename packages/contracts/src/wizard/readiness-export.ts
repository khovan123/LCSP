import { ANSWER_STATES } from "./wizard-answer.ts";
import type { ReadinessExportStatus } from "./events.ts";

export const READINESS_EXPORT_ARTIFACT_TYPES = {
  wizardReadinessExport: "WIZARD_READINESS_EXPORT",
} as const;

export const READINESS_EXPORT_LABELS = {
  wizardReadinessExport: "Wizard Readiness Export",
} as const;

export const READINESS_EXPORT_BADGES = {
  readinessOnly: "READINESS_ONLY",
} as const;

export const READINESS_CLASSIFICATION_STATUSES = {
  lockedEvidenceRequired: "LOCKED_EVIDENCE_REQUIRED",
} as const;

export const READINESS_EXPORT_GUARDRAIL_REASONS = {
  contractMismatch: "READINESS_EXPORT_CONTRACT_MISMATCH",
  overclaim: "READINESS_EXPORT_OVERCLAIM",
} as const;

export const READINESS_EXPORT_DOWNLOAD_STATES = {
  blocked: "BLOCKED",
  ready: "READY",
} as const;

export type ReadinessExportArtifactType =
  (typeof READINESS_EXPORT_ARTIFACT_TYPES)[keyof typeof READINESS_EXPORT_ARTIFACT_TYPES];
export type ReadinessExportLabel =
  (typeof READINESS_EXPORT_LABELS)[keyof typeof READINESS_EXPORT_LABELS];
export type ReadinessExportBadge =
  (typeof READINESS_EXPORT_BADGES)[keyof typeof READINESS_EXPORT_BADGES];
export type ReadinessClassificationStatus =
  (typeof READINESS_CLASSIFICATION_STATUSES)[keyof typeof READINESS_CLASSIFICATION_STATUSES];
export type ReadinessExportDownloadState =
  (typeof READINESS_EXPORT_DOWNLOAD_STATES)[keyof typeof READINESS_EXPORT_DOWNLOAD_STATES];

export interface ReadinessMissingEvidenceItem {
  type: string;
  label: string;
  description: string;
}

export const READINESS_UNKNOWN_QUESTIONS = {
  affectedSubjects: {
    questionId: "affectedSubjects",
    label: "Affected people require verification",
  },
  biometricData: {
    questionId: "biometricData",
    label: "Biometric data use requires verification",
  },
  dataTypes: {
    questionId: "dataTypes",
    label: "Data categories require verification",
  },
  externalLlmUsage: {
    questionId: "externalLlmUsage",
    label: "External AI provider use requires verification",
  },
  highImpactIndicators: {
    questionId: "highImpactIndicators",
    label: "Material-impact context requires verification",
  },
  humanReview: {
    questionId: "humanReview",
    label: "Human review requires verification",
  },
  prohibitedRiskSignals: {
    questionId: "prohibitedRiskSignals",
    label: "Special system behavior requires verification",
  },
  specialCategoryData: {
    questionId: "specialCategoryData",
    label: "Special-category data use requires verification",
  },
} as const;

export interface ReadinessUnresolvedUnknownItem {
  question_id: string;
  label: string;
  answer_state: typeof ANSWER_STATES.explicitUnknown;
}

export interface ReadinessExportMetadata {
  artifact_type: ReadinessExportArtifactType;
  label: ReadinessExportLabel;
  readiness_only: true;
  classification_status: ReadinessClassificationStatus;
  wizard_profile_version: number;
  assessment_id: string;
  generated_by: string;
  version: number;
  generated_at: string;
}

export interface ReadinessExportContent {
  artifact_type: ReadinessExportArtifactType;
  label: ReadinessExportLabel;
  badge: ReadinessExportBadge;
  title: ReadinessExportLabel;
  preview: string;
  metadata: ReadinessExportMetadata;
  missing_evidence: ReadinessMissingEvidenceItem[];
  unresolved_unknown_items: ReadinessUnresolvedUnknownItem[];
  preparation_guidance: string[];
  next_steps: string[];
}

export interface ReadinessExportResponse extends ReadinessExportContent {
  export_id: string;
  assessment_id: string;
  owner_id: string;
  status: ReadinessExportStatus;
  readiness_only: true;
  classification_status: ReadinessClassificationStatus;
  classification_locked: true;
  generated_at: string;
  version: number;
  correlation_id: string;
  download_state: ReadinessExportDownloadState;
  download_url: string | null;
  blocked_reason?: string;
}

export interface ReadinessExportHistoryItem {
  artifact_type: ReadinessExportArtifactType;
  export_id: string;
  assessment_id: string;
  owner_id: string;
  status: ReadinessExportStatus;
  label: ReadinessExportLabel;
  badge: ReadinessExportBadge;
  title: ReadinessExportLabel;
  preview: string;
  readiness_only: true;
  classification_status: ReadinessClassificationStatus;
  metadata: ReadinessExportMetadata | null;
  generated_at: string;
  version: number;
  download_state: ReadinessExportDownloadState;
  download_url: string | null;
}
