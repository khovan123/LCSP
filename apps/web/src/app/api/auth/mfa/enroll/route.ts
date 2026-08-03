import { NextRequest } from "next/server";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  if (isMockModeEnabled()) {
    return successJson({
      totp_uri: "otpauth://totp/LCSP:minhpnq1807%40gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=LCSP",
    });
  }

  const upstream = await upstreamRequest("/auth/mfa/enroll", {
    method: "POST",
    bearerToken: session.token,
  });

  return upstreamJson(upstream);
}
