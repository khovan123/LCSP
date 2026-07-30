import { NextRequest } from "next/server";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (isMockModeEnabled()) {
    return successJson({ ok: true });
  }

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const { userId } = await params;
  const upstream = await upstreamRequest(
    `/workspace/memberships/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      bearerToken: session.token,
    },
  );
  return upstreamJson(upstream);
}
