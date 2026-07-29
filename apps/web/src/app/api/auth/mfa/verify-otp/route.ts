import { NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";
import { buildMfaVerifyApiBody } from "./mfa-verify-proxy";

export async function POST(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const body: unknown = await request.json().catch(() => null);
  const upstream = await upstreamRequest("/auth/mfa/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildMfaVerifyApiBody(session.token, body)),
  });

  return upstreamJson(upstream);
}
