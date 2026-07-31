import { NextRequest } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";
import { buildMfaVerifyApiBody } from "./mfa-verify-proxy";

export async function POST(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const body: unknown = await request.json().catch(() => null);
  if (isMockModeEnabled()) {
    const otp =
      typeof body === "object" && body !== null
        ? (body as { otp?: unknown }).otp
        : undefined;
    if (session.token !== "mock-session:mfa-pending") {
      return problemJson(AUTH_ERROR_CODES.sessionInvalid, { status: 401 });
    }
    if (otp !== "123456") {
      return problemJson(AUTH_ERROR_CODES.mfaInvalid, { status: 403 });
    }

    const response = successJson({ verified: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "mock-session:manager",
      sessionCookieOptions,
    );
    return response;
  }
  const upstream = await upstreamRequest("/auth/mfa/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildMfaVerifyApiBody(session.token, body)),
  });

  return upstreamJson(upstream);
}
