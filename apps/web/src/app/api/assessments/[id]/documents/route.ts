import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ problem: { code: "SESSION_INVALID" } }, { status: 401 });
  }

  const { id } = await params;
  const apiResponse = await fetch(`${apiBaseUrl}/assessments/${encodeURIComponent(id)}/documents`, {
    headers: { authorization: `Bearer ${sessionToken}` },
    cache: "no-store",
  });

  const payload: unknown = await apiResponse.json().catch(() => null);
  return NextResponse.json(payload, { status: apiResponse.status });
}
