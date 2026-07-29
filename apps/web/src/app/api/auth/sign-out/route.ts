import { NextRequest, NextResponse } from "next/server";

import { MOCK_WORKSPACE_COOKIE_NAME } from "@/lib/mocks/mock-workspace";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await fetch(`${apiBaseUrl}/auth/revoke-session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken }),
      cache: "no-store",
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(MOCK_WORKSPACE_COOKIE_NAME);
  return response;
}
