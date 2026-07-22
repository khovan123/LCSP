import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { sanitizeConflictListPayload } from "@/lib/api/conflict-client";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function GET(
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
  const status = request.nextUrl.searchParams.get("status") ?? "PENDING";
  const page = request.nextUrl.searchParams.get("page") ?? "1";
  const pageSize = request.nextUrl.searchParams.get("page_size") ?? "20";

  const query = new URLSearchParams({
    status,
    page,
    page_size: pageSize,
  });

  const apiResponse = await fetch(
    `${apiBaseUrl}/assessments/${encodeURIComponent(id)}/conflicts?${query.toString()}`,
    {
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: "no-store",
    },
  );

  const payload: unknown = await apiResponse.json().catch(() => null);

  if (apiResponse.ok) {
    const sanitized = sanitizeConflictListPayload(payload);
    if (!sanitized) {
      return NextResponse.json(
        { problem: { code: "UPSTREAM_RESPONSE_INVALID" } },
        { status: 502 },
      );
    }

    return NextResponse.json(sanitized, { status: apiResponse.status });
  }

  return NextResponse.json(payload, { status: apiResponse.status });
}
