import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";
import {
  getAcceptedInvitationLocation,
} from "@/lib/api/invitation-routing";
import {
  isAcceptInvitationApiSuccess,
  safeAcceptInvitationErrorCode,
} from "@/lib/api/invitation-proxy";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const apiResponse = await fetch(`${apiBaseUrl}/auth/accept-invitation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok || !isAcceptInvitationApiSuccess(payload)) {
    const status = apiResponse.ok ? 502 : apiResponse.status;
    return NextResponse.json(
      { problem: { code: safeAcceptInvitationErrorCode(payload) } },
      { status },
    );
  }

  const response = NextResponse.json({
    ok: true,
    location: getAcceptedInvitationLocation(payload.scope),
  });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    payload.session_token,
    sessionCookieOptions,
  );
  return response;
}
