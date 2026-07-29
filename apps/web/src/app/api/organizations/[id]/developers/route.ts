import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";
const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token)
    return NextResponse.json(
      { problem: { code: "SESSION_INVALID" } },
      { status: 401 },
    );
  const { id } = await params;
  const response = await fetch(
    `${apiBaseUrl}/organizations/${encodeURIComponent(id)}/developers`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  return NextResponse.json(await response.json().catch(() => null), {
    status: response.status,
  });
}
