import { NextRequest } from "next/server";

import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(request: NextRequest) {
  const mockResponse = await mockJsonResponse("developers.json");
  if (mockResponse) return mockResponse;

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const upstream = await upstreamRequest("/workspace/developers", {
    bearerToken: session.token,
  });
  return upstreamJson(upstream);
}
