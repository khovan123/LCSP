import { NextRequest } from "next/server";

import { sanitizeReadinessExportPayload } from "@/lib/api/readiness-export-client";
import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mock = await mockJsonResponse("readiness-export.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/wizard/readiness-export`,
    {
      method: "POST",
      bearerToken: session.token,
    },
  );

  return validatedUpstreamJson(upstream, sanitizeReadinessExportPayload);
}
