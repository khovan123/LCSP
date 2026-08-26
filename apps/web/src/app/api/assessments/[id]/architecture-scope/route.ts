import { NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/architecture-scope`,
    { bearerToken: session.token },
  );
  return upstreamJson(upstream);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/architecture-scope`,
    {
      method: "POST",
      bearerToken: session.token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return upstreamJson(upstream);
}
