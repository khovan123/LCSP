import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import {
  buildResolveConflictApiBody,
  sanitizeResolveConflictPayload,
} from "@/lib/api/conflict-client";
import { mockJsonResponse } from "@/lib/mocks/mock-response";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conflictId: string }> },
) {
  const mock = await mockJsonResponse("conflict-resolve.json");
  if (mock) return mock;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { problem: { code: AUTH_ERROR_CODES.sessionInvalid } },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const apiBody = buildResolveConflictApiBody(body);

  if (
    apiBody.resolution === "DISMISSED" &&
    (!apiBody.resolution_note || apiBody.resolution_note.trim().length === 0)
  ) {
    return NextResponse.json(
      { problem: { code: "DISMISS_REASON_REQUIRED" } },
      { status: 400 },
    );
  }

  const { id, conflictId } = await params;
  const apiResponse = await fetch(
    `${apiBaseUrl}/assessments/${encodeURIComponent(id)}/conflicts/${encodeURIComponent(conflictId)}/resolve`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(apiBody),
      cache: "no-store",
    },
  );

  const payload: unknown = await apiResponse.json().catch(() => null);

  if (apiResponse.ok) {
    const sanitized = sanitizeResolveConflictPayload(payload);
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
