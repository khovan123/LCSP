import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { EVIDENCE_ERROR_CODES } from "@lcsp/contracts/evidence";

import type {
  DeveloperFinding,
  EvidenceOutcome,
} from "../../features/developer-task/types/developer-task.types.ts";

export async function getTechnicalEvidence(
  assessmentId: string,
): Promise<EvidenceOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/evidence`,
    { credentials: "same-origin", cache: "no-store" },
  );
  const payload: unknown = await response.json().catch(() => null);

  return toEvidenceOutcome(payload, response.ok, response.status);
}

export function toEvidenceOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
): EvidenceOutcome {
  if (ok) {
    const findings = readDeveloperFindings(payload);
    return findings ? { kind: "loaded", findings } : { kind: "error" };
  }

  const code = getProblemCode(payload);
  if (code === AUTH_ERROR_CODES.mfaRequired) {
    return { kind: "redirect", location: "/mfa/verify" };
  }
  if (status === 401 || code === AUTH_ERROR_CODES.sessionInvalid) {
    return { kind: "redirect", location: "/sign-in" };
  }
  if (status === 403 || code === AUTH_ERROR_CODES.pbacDenied) {
    return { kind: "access_revoked" };
  }
  if (status === 404 && code === EVIDENCE_ERROR_CODES.notFound) {
    return { kind: "empty" };
  }

  return { kind: "error" };
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
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidate = payload as {
    code?: string;
    error_code?: string;
    problem?: { code?: string; error_code?: string };
  };
  return (
    candidate.problem?.code ??
    candidate.problem?.error_code ??
    candidate.code ??
    candidate.error_code
  );
}
