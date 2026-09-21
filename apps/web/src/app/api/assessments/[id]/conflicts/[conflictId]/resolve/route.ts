import { NextRequest } from "next/server";
import { CONFLICT_RECORD_STATUSES, SCAN_ERROR_CODES } from "@lcsp/contracts/scan";

import {
  buildResolveConflictApiBody,
  sanitizeResolveConflictPayload,
} from "@/lib/api/conflict-client";
import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { problemJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conflictId: string }> },
) {
  const mock = await mockJsonResponse("conflict-resolve.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const body: unknown = await request.json().catch(() => null);
  const apiBody = buildResolveConflictApiBody(body);

  if (
    apiBody.resolution === CONFLICT_RECORD_STATUSES.dismissed &&
    (!apiBody.resolution_note || apiBody.resolution_note.trim().length === 0)
  ) {
    return problemJson(SCAN_ERROR_CODES.dismissReasonRequired, { status: 400 });
  }

  const { id, conflictId } = await params;
  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/conflicts/${encodeURIComponent(conflictId)}/resolve`,
    {
      method: "PATCH",
      bearerToken: session.token,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(apiBody),
    },
  );

  return validatedUpstreamJson(upstream, sanitizeResolveConflictPayload);
}
