import { NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  upstreamJson,
} from "@/lib/server/upstream-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;

  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/mock-evidence`,
    {
      method: "POST",
      bearerToken: session.token,
    },
  );

  return upstreamJson(upstream);
}
