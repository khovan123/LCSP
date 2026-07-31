import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(request: Request) {
  if (isMockModeEnabled()) {
    const body = (await request.json().catch(() => null)) as
      | { token?: unknown }
      | null;
    if (body?.token !== "mock-recovery-token") {
      return problemJson(AUTH_ERROR_CODES.recoveryInvalid, { status: 400 });
    }
    return successJson({ confirmed: true });
  }
  const body = await request.text();
  const upstream = await upstreamRequest("/auth/recovery/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

  return upstreamJson(upstream);
}
