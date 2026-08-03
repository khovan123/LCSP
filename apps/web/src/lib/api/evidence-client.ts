import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  EVIDENCE_ERROR_CODES,
  EVIDENCE_SEVERITIES,
} from "@lcsp/contracts/evidence";

import type {
  DeveloperFinding,
  EvidenceOutcome,
} from "../../features/developer-task/types/developer-task.types.ts";
import { apiRequest } from "./api-request.ts";
import { API_OUTCOME_KINDS, API_REDIRECT_LOCATIONS } from "./outcome-kinds.ts";
import { getMfaRedirectLocation, getProblemCode } from "./problem-envelope.ts";

export async function getTechnicalEvidence(
  assessmentId: string,
): Promise<EvidenceOutcome> {
  const { payload, ok, status, problemCode } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/evidence`,
    { cache: "no-store" },
  );

  return toEvidenceOutcome(payload, ok, status, problemCode);
}

export function toEvidenceOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
  problemCode = getProblemCode(payload),
): EvidenceOutcome {
  if (ok) {
    const findings = readDeveloperFindings(payload);
    return findings
      ? { kind: API_OUTCOME_KINDS.loaded, findings }
      : { kind: API_OUTCOME_KINDS.error };
  }

  if (problemCode === AUTH_ERROR_CODES.mfaRequired) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: getMfaRedirectLocation(payload),
    };
  }
  if (status === 401 || problemCode === AUTH_ERROR_CODES.sessionInvalid) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: API_REDIRECT_LOCATIONS.signIn,
    };
  }
  if (status === 403 || problemCode === AUTH_ERROR_CODES.pbacDenied) {
    return { kind: API_OUTCOME_KINDS.accessRevoked };
  }
  if (status === 404 && problemCode === EVIDENCE_ERROR_CODES.notFound) {
    return { kind: API_OUTCOME_KINDS.empty };
  }

  return { kind: API_OUTCOME_KINDS.error };
}

export function sanitizeEvidencePayload(payload: unknown): unknown {
  const findings = readDeveloperFindings(payload);
  return findings ? { findings } : null;
}

function readDeveloperFindings(payload: unknown): DeveloperFinding[] | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const findings = (payload as { findings?: unknown }).findings;
  if (!Array.isArray(findings)) {
    return null;
  }

  const projected = findings.map(projectDeveloperFinding);
  return projected.every((finding) => finding !== null)
    ? (projected as DeveloperFinding[])
    : null;
}

function projectDeveloperFinding(payload: unknown): DeveloperFinding | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as DeveloperFinding;
  if (
    typeof candidate.finding_id !== "string" ||
    typeof candidate.tool !== "string" ||
    typeof candidate.finding_type !== "string" ||
    !isSeverity(candidate.severity) ||
    typeof candidate.description !== "string"
  ) {
    return null;
  }

  return {
    finding_id: candidate.finding_id,
    tool: candidate.tool,
    finding_type: candidate.finding_type,
    severity: candidate.severity,
    description: candidate.description,
  };
}

function isSeverity(value: unknown): value is DeveloperFinding["severity"] {
  return (
    value === EVIDENCE_SEVERITIES.low ||
    value === EVIDENCE_SEVERITIES.medium ||
    value === EVIDENCE_SEVERITIES.high
  );
}
