import { NextRequest } from "next/server";

import { sanitizeEvidencePayload } from "@/lib/api/evidence-client";
import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mock = await mockJsonResponse("evidence.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/evidence`,
    { bearerToken: session.token },
  );

  return validatedUpstreamJson(upstream, sanitizeEvidencePayload);
}
