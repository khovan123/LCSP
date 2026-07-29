import { NextRequest, NextResponse } from "next/server";

import { mockJsonResponse } from "@/lib/mocks/mock-response";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const mock = await mockJsonResponse("assessments.json");
  if (mock) return mock;

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ problem: { code: "SESSION_INVALID" } }, { status: 401 });
  }
  const apiResponse = await fetch(`${apiBaseUrl}/assessments`, {
    headers: { authorization: `Bearer ${sessionToken}` },
    cache: "no-store",
  });
  return NextResponse.json(await apiResponse.json().catch(() => null), {
    status: apiResponse.status,
  });
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ problem: { code: "SESSION_INVALID" } }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const apiResponse = await fetch(`${apiBaseUrl}/assessments`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return NextResponse.json(await apiResponse.json().catch(() => null), {
    status: apiResponse.status,
  });
}
