import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";
import { buildMfaVerifyApiBody } from "./mfa-verify-proxy";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { problem: { code: AUTH_ERROR_CODES.sessionInvalid } },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const apiResponse = await fetch(`${apiBaseUrl}/auth/mfa/verify-otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildMfaVerifyApiBody(sessionToken, body)),
    cache: "no-store",
  });
  const payload: unknown = await apiResponse.json().catch(() => null);

  return NextResponse.json(payload, { status: apiResponse.status });
}
