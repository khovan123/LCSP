import { NextRequest } from "next/server";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(request: NextRequest) {
  if (isMockModeEnabled()) {
    return successJson({ ok: true });
  }

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const body = await request.text();
  const upstream = await upstreamRequest("/workspace/invitations", {
    method: "POST",
    bearerToken: session.token,
    headers: { "content-type": "application/json" },
    body,
  });
  return upstreamJson(upstream);
}
