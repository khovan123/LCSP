import { NextRequest } from "next/server";

import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mockResponse = await mockJsonResponse("developers.json");
  if (mockResponse) return mockResponse;

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const { id } = await params;
  const upstream = await upstreamRequest(
    `/organizations/${encodeURIComponent(id)}/developers`,
    { bearerToken: session.token },
  );
  return upstreamJson(upstream);
}
