import { NextRequest } from "next/server";
import { CONFLICT_RECORD_STATUSES } from "@lcsp/contracts/scan";

import { sanitizeConflictListPayload } from "@/lib/api/conflict-client";
import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { buildPaginationQuery } from "@/lib/server/query-params";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mock = await mockJsonResponse("conflicts.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const query = buildPaginationQuery(request.nextUrl, {
    extra: { status: CONFLICT_RECORD_STATUSES.pending },
  });

  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/conflicts?${query.toString()}`,
    { bearerToken: session.token },
  );

  return validatedUpstreamJson(upstream, sanitizeConflictListPayload);
}
