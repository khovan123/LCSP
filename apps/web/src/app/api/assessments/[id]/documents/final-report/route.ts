import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { sanitizeDocumentRequestPayload } from "@/lib/api/document-client";
import { mockJsonResponse } from "@/lib/mocks/mock-response";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mock = await mockJsonResponse("document-action.json");
  if (mock) return mock;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { problem: { code: AUTH_ERROR_CODES.sessionInvalid } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const apiResponse = await fetch(
    `${apiBaseUrl}/assessments/${encodeURIComponent(id)}/documents/final-report`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: "no-store",
    },
  );

  const payload: unknown = await apiResponse.json().catch(() => null);
  if (apiResponse.ok) {
    const sanitized = sanitizeDocumentRequestPayload(payload);
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
