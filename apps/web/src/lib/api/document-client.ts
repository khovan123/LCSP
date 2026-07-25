import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { DOCUMENT_ERROR_CODES } from "@lcsp/contracts/document";
import type { MessageKey } from "@lcsp/i18n";

import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";

export type DocumentRequestOutcome =
  | { kind: "requested"; data: DocumentRequestResult }
  | { kind: "redirect"; location: string }
  | { kind: "error"; titleKey: MessageKey; detailKey: MessageKey }
  | { kind: "blocked"; titleKey: MessageKey; detailKey: MessageKey };

export type DocumentRequestResult = {
  document_request_id: string;
  status: string;
  document_type: string;
  correlation_id: string;
};

export async function requestFinalReport(
  assessmentId: string,
): Promise<DocumentRequestOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/documents/final-report`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const payload: unknown = await response.json().catch(() => null);
  return toDocumentRequestOutcome(payload, response.ok, response.status);
}

export async function requestGapAnalysis(
  assessmentId: string,
): Promise<DocumentRequestOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/documents/gap-analysis`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const payload: unknown = await response.json().catch(() => null);
  return toDocumentRequestOutcome(payload, response.ok, response.status);
}

export function toDocumentRequestOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
): DocumentRequestOutcome {
  if (ok && isDocumentRequestResult(payload)) {
    return { kind: "requested", data: payload };
  }

  const code = getProblemCode(payload);
  if (status === 401 || code === AUTH_ERROR_CODES.sessionInvalid) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  if (status === 409 && code === DOCUMENT_ERROR_CODES.classificationGuardrailNotPassed) {
    return {
      kind: "blocked",
      titleKey: "pages.classification.errorTitle",
      detailKey: "pages.classification.documentGuardrailBlocked",
    };
  }

  return {
    kind: "error",
    titleKey: "pages.classification.errorTitle",
    detailKey: "pages.classification.errorDetail",
  };
}

function isDocumentRequestResult(payload: unknown): payload is DocumentRequestResult {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as DocumentRequestResult;
  return (
    typeof candidate.document_request_id === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.document_type === "string" &&
    typeof candidate.correlation_id === "string"
  );
}

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const problem = payload as {
    code?: string;
    error_code?: string;
    problem?: { code?: string; error_code?: string };
  };
  return (
    problem.problem?.code ??
    problem.problem?.error_code ??
    problem.code ??
    problem.error_code
  );
}

export function sanitizeDocumentRequestPayload(
  payload: unknown,
): DocumentRequestResult | null {
  return isDocumentRequestResult(payload) ? payload : null;
}
