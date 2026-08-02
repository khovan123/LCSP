import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  ANSWER_STATES,
  READINESS_EXPORT_ARTIFACT_TYPES,
  READINESS_EXPORT_BADGES,
  READINESS_EXPORT_LABELS,
  READINESS_EXPORT_STATUSES,
} from "@lcsp/contracts/wizard";
import type {
  ReadinessExportHistoryItem,
  ReadinessUnresolvedUnknownItem,
} from "@lcsp/contracts/wizard";
import type { MessageKey } from "@lcsp/i18n";

import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";
import { apiRequest } from "./api-request.ts";
import { API_OUTCOME_KINDS } from "./outcome-kinds.ts";

export type ReadinessExportResult = {
  artifact_type: string;
  export_id: string;
  assessment_id: string;
  owner_id: string;
  status: string;
  label: string;
  badge: string;
  title: string;
  preview: string;
  metadata: {
    artifact_type: string;
    label: string;
    readiness_only: boolean;
    classification_status: string;
    wizard_profile_version: number;
    assessment_id: string;
    generated_by: string;
    version: number;
    generated_at: string;
  };
  readiness_only: boolean;
  classification_status: string;
  classification_locked: boolean;
  missing_evidence: Array<{
    type: string;
    label: string;
    description: string;
  }>;
  unresolved_unknown_items: Array<{
    question_id: string;
    label: string;
    answer_state: string;
  }>;
  preparation_guidance: string[];
  generated_at: string;
  version: number;
  correlation_id: string;
  blocked_reason?: string;
  download_state: string;
  download_url: string | null;
};

export type ReadinessExportOutcome =
  | { kind: typeof API_OUTCOME_KINDS.created; data: ReadinessExportResult }
  | { kind: typeof API_OUTCOME_KINDS.redirect; location: string }
  | {
      kind: typeof API_OUTCOME_KINDS.blocked;
      titleKey: MessageKey;
      detailKey: MessageKey;
    }
  | {
      kind: typeof API_OUTCOME_KINDS.error;
      titleKey: MessageKey;
      detailKey: MessageKey;
    };

export async function requestReadinessExport(
  assessmentId: string,
): Promise<ReadinessExportOutcome> {
  const { payload, ok, status, problemCode } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/wizard/readiness-export`,
    {
      method: "POST",
      cache: "no-store",
    },
  );

  return toReadinessExportOutcome(payload, ok, status, problemCode);
}

export async function getReadinessExportHistory(
  assessmentId: string,
): Promise<ReadinessExportHistoryItem[]> {
  const { payload, ok } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/wizard/readiness-exports`,
    { cache: "no-store" },
  );
  if (!ok) return [];

  return sanitizeReadinessExportHistoryPayload(payload) ?? [];
}

export function toReadinessExportOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
  problemCode?: string,
): ReadinessExportOutcome {
  const result = sanitizeReadinessExportPayload(payload);
  if (ok && result?.status === READINESS_EXPORT_STATUSES.generated) {
    return { kind: API_OUTCOME_KINDS.created, data: result };
  }

  if (ok && result?.status === READINESS_EXPORT_STATUSES.blocked) {
    return {
      kind: API_OUTCOME_KINDS.blocked,
      titleKey: "pages.readiness.exportBlockedTitle",
      detailKey: "pages.readiness.exportBlockedDetail",
    };
  }

  if (
    status === 401 ||
    problemCode === AUTH_ERROR_CODES.authRequired ||
    problemCode === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: PUBLIC_ENTRY_ROUTES.signIn,
    };
  }

  return {
    kind: API_OUTCOME_KINDS.error,
    titleKey: "pages.readiness.exportErrorTitle",
    detailKey: "pages.readiness.exportErrorDetail",
  };
}

export function sanitizeReadinessExportPayload(
  payload: unknown,
): ReadinessExportResult | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Partial<ReadinessExportResult>;
  return typeof candidate.export_id === "string" &&
    typeof candidate.artifact_type === "string" &&
    typeof candidate.assessment_id === "string" &&
    typeof candidate.owner_id === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.badge === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.preview === "string" &&
    typeof candidate.metadata === "object" &&
    candidate.metadata !== null &&
    candidate.metadata.readiness_only === true &&
    typeof candidate.readiness_only === "boolean" &&
    typeof candidate.classification_status === "string" &&
    typeof candidate.classification_locked === "boolean" &&
    Array.isArray(candidate.missing_evidence) &&
    Array.isArray(candidate.unresolved_unknown_items) &&
    candidate.unresolved_unknown_items.every(isUnresolvedUnknownItem) &&
    Array.isArray(candidate.preparation_guidance) &&
    candidate.preparation_guidance.every((item) => typeof item === "string") &&
    typeof candidate.generated_at === "string" &&
    typeof candidate.version === "number" &&
    typeof candidate.correlation_id === "string" &&
    typeof candidate.download_state === "string" &&
    (typeof candidate.download_url === "string" ||
      candidate.download_url === null)
    ? (candidate as ReadinessExportResult)
    : null;
}

export function sanitizeReadinessExportHistoryPayload(
  payload: unknown,
): ReadinessExportHistoryItem[] | null {
  if (!Array.isArray(payload)) return null;
  return payload.filter(isReadinessExportHistoryItem);
}

function isReadinessExportHistoryItem(
  payload: unknown,
): payload is ReadinessExportHistoryItem {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as Partial<ReadinessExportHistoryItem>;
  return (
    candidate.artifact_type ===
      READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport &&
    typeof candidate.export_id === "string" &&
    typeof candidate.assessment_id === "string" &&
    typeof candidate.owner_id === "string" &&
    typeof candidate.status === "string" &&
    candidate.label === READINESS_EXPORT_LABELS.wizardReadinessExport &&
    candidate.badge === READINESS_EXPORT_BADGES.readinessOnly &&
    candidate.title === READINESS_EXPORT_LABELS.wizardReadinessExport &&
    candidate.readiness_only === true &&
    typeof candidate.generated_at === "string" &&
    typeof candidate.version === "number" &&
    typeof candidate.download_state === "string" &&
    (typeof candidate.download_url === "string" ||
      candidate.download_url === null)
  );
}

function isUnresolvedUnknownItem(
  payload: unknown,
): payload is ReadinessUnresolvedUnknownItem {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as Partial<ReadinessUnresolvedUnknownItem>;
  return (
    typeof candidate.question_id === "string" &&
    typeof candidate.label === "string" &&
    candidate.answer_state === ANSWER_STATES.explicitUnknown
  );
}
