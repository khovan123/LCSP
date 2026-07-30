import { NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const { id } = await params;
  const body = await request.text();
  const upstream = await upstreamRequest(
    `/organizations/${encodeURIComponent(id)}/invitations`,
    {
      method: "POST",
      bearerToken: session.token,
      headers: { "content-type": "application/json" },
      body,
    },
  );
  return upstreamJson(upstream);
}
