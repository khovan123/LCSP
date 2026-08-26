import { NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

/**
 * POST /api/assessments/[id]/scan
 * Triggers a new multi-repo scan for the assessment, using the saved
 * AssessmentRepositoryScope and architecture declarations.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/architecture-scope/trigger`,
    {
      method: "POST",
      bearerToken: session.token,
      headers: { "Content-Type": "application/json" },
    },
  );
  return upstreamJson(upstream);
}
