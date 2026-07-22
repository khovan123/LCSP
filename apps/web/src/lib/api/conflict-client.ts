import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment/codes";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { SCAN_ERROR_CODES } from "@lcsp/contracts/scan/codes";

export type ConflictStatus = "PENDING" | "RESOLVED" | "DISMISSED" | (string & {});

export type ConflictSummary = {
  conflict_id: string;
  conflict_type: string;
  conflict_score: number;
  score_explanation: string;
  status: ConflictStatus;
  evidence_refs: string[];
  created_at: string;
};

export type ConflictListResult = {
  conflicts: ConflictSummary[];
  total: number;
  page: number;
  page_size: number;
  correlation_id?: string;
};

export type ResolveConflictPayload = {
  resolution: "RESOLVED" | "DISMISSED";
  resolution_note?: string;
};

export type ResolveConflictResult = {
  conflict_id: string;
  status: "RESOLVED" | "DISMISSED";
  resolved_at: string;
  all_conflicts_resolved: boolean;
  correlation_id?: string;
};

export type ConflictListOutcome =
  | { kind: "loaded"; data: ConflictListResult }
  | { kind: "empty" }
  | { kind: "redirect"; location: string }
  | { kind: "access_revoked" }
  | { kind: "error" };

export type ResolveConflictOutcome =
  | { kind: "resolved"; data: ResolveConflictResult }
  | { kind: "validation_error"; reason: "dismiss_reason_required" }
  | { kind: "redirect"; location: string }
  | { kind: "access_revoked" }
  | { kind: "already_resolved" }
  | { kind: "not_found" }
  | { kind: "error" };

type ApiProblemPayload = {
  code?: string;
  error_code?: string;
  problem?: {
    code?: string;
    error_code?: string;
  };
};

export async function getPendingConflicts(
  assessmentId: string,
): Promise<ConflictListOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/conflicts?status=PENDING`,
    {
      credentials: "same-origin",
      cache: "no-store",
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  return toConflictListOutcome(payload, response.ok, response.status);
}

export async function resolveConflict(
  assessmentId: string,
  conflictId: string,
  request: ResolveConflictPayload,
): Promise<ResolveConflictOutcome> {
  if (
    request.resolution === "DISMISSED" &&
    (!request.resolution_note || request.resolution_note.trim().length === 0)
  ) {
    return {
      kind: "validation_error",
      reason: "dismiss_reason_required",
    };
  }

  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/conflicts/${encodeURIComponent(conflictId)}/resolve`,
    {
      method: "PATCH",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  const payload: unknown = await response.json().catch(() => null);
  return toResolveConflictOutcome(payload, response.ok, response.status);
}

export function toConflictListOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
): ConflictListOutcome {
  if (ok) {
    const data = sanitizeConflictListPayload(payload);
    if (!data) {
      return { kind: "error" };
    }
    if (data.conflicts.length === 0) {
      return { kind: "empty" };
    }
    return { kind: "loaded", data };
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
  if (status === 404 && code === ASSESSMENT_ERROR_CODES.notFound) {
    return { kind: "empty" };
  }

  return { kind: "error" };
}

export function toResolveConflictOutcome(
  payload: unknown,
  ok: boolean,
  status: number,
): ResolveConflictOutcome {
  if (ok) {
    const data = sanitizeResolveConflictPayload(payload);
    return data ? { kind: "resolved", data } : { kind: "error" };
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
  if (status === 409 && code === SCAN_ERROR_CODES.conflictAlreadyResolved) {
    return { kind: "already_resolved" };
  }
  if (status === 404 && code === SCAN_ERROR_CODES.conflictNotFound) {
    return { kind: "not_found" };
  }

  return { kind: "error" };
}

export function sanitizeConflictListPayload(
  payload: unknown,
): ConflictListResult | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as {
    conflicts?: unknown;
    total?: unknown;
    page?: unknown;
    page_size?: unknown;
    correlation_id?: unknown;
  };

  if (!Array.isArray(candidate.conflicts)) {
    return null;
  }

  const projected = candidate.conflicts.map(projectConflictSummary);
  if (!projected.every((item) => item !== null)) {
    return null;
  }
  const conflicts = projected as ConflictSummary[];

  if (
    typeof candidate.total !== "number" ||
    typeof candidate.page !== "number" ||
    typeof candidate.page_size !== "number"
  ) {
    return null;
  }

  return {
    conflicts,
    total: candidate.total,
    page: candidate.page,
    page_size: candidate.page_size,
    correlation_id:
      typeof candidate.correlation_id === "string"
        ? candidate.correlation_id
        : undefined,
  };
}

export function sanitizeResolveConflictPayload(
  payload: unknown,
): ResolveConflictResult | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as {
    conflict_id?: unknown;
    status?: unknown;
    resolved_at?: unknown;
    all_conflicts_resolved?: unknown;
    correlation_id?: unknown;
  };

  if (
    typeof candidate.conflict_id !== "string" ||
    (candidate.status !== "RESOLVED" && candidate.status !== "DISMISSED") ||
    typeof candidate.resolved_at !== "string" ||
    typeof candidate.all_conflicts_resolved !== "boolean"
  ) {
    return null;
  }

  return {
    conflict_id: candidate.conflict_id,
    status: candidate.status,
    resolved_at: candidate.resolved_at,
    all_conflicts_resolved: candidate.all_conflicts_resolved,
    correlation_id:
      typeof candidate.correlation_id === "string"
        ? candidate.correlation_id
        : undefined,
  };
}

export function buildResolveConflictApiBody(body: unknown): ResolveConflictPayload {
  const request =
    typeof body === "object" && body !== null
      ? (body as { resolution?: unknown; resolution_note?: unknown })
      : {};

  return {
    resolution:
      request.resolution === "DISMISSED" ? "DISMISSED" : "RESOLVED",
    resolution_note:
      typeof request.resolution_note === "string"
        ? request.resolution_note
        : undefined,
  };
}

function projectConflictSummary(payload: unknown): ConflictSummary | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as {
    conflict_id?: unknown;
    conflict_type?: unknown;
    conflict_score?: unknown;
    score_explanation?: unknown;
    status?: unknown;
    evidence_refs?: unknown;
    created_at?: unknown;
  };

  if (
    typeof candidate.conflict_id !== "string" ||
    typeof candidate.conflict_type !== "string" ||
    typeof candidate.conflict_score !== "number" ||
    typeof candidate.score_explanation !== "string" ||
    typeof candidate.status !== "string" ||
    !Array.isArray(candidate.evidence_refs) ||
    !candidate.evidence_refs.every((item) => typeof item === "string") ||
    typeof candidate.created_at !== "string"
  ) {
    return null;
  }

  return {
    conflict_id: candidate.conflict_id,
    conflict_type: candidate.conflict_type,
    conflict_score: candidate.conflict_score,
    score_explanation: candidate.score_explanation,
    status: candidate.status,
    evidence_refs: candidate.evidence_refs,
    created_at: candidate.created_at,
  };
}

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const problem = payload as ApiProblemPayload;
  return (
    problem.problem?.code ??
    problem.problem?.error_code ??
    problem.code ??
    problem.error_code
  );
}
