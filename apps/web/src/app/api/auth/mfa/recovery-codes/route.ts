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
      recovery_codes: [
        "ABCD-EFGH-IJKL",
        "MNPR-STUV-WXYZ",
        "2345-6789-ABCD",
      ],
    });
  }

  const upstream = await upstreamRequest("/auth/mfa/recovery-codes", {
    method: "POST",
    bearerToken: session.token,
  });

  return upstreamJson(upstream);
}
