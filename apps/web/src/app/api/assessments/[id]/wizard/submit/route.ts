import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { problem: { code: AUTH_ERROR_CODES.sessionInvalid } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const apiResponse = await fetch(
    `${apiBaseUrl}/assessments/${encodeURIComponent(id)}/wizard/submit`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const payload: unknown = await apiResponse.json().catch(() => null);
  return NextResponse.json(payload, { status: apiResponse.status });
}
