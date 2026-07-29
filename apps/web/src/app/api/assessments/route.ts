import { NextRequest } from "next/server";

import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(request: NextRequest) {
  const mock = await mockJsonResponse("assessments.json");
  if (mock) return mock;

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const upstream = await upstreamRequest("/assessments", {
    bearerToken: session.token,
  });
  return upstreamJson(upstream);
}

export async function POST(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const payload = await request.json().catch(() => null);
  const upstream = await upstreamRequest("/assessments", {
    method: "POST",
    bearerToken: session.token,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return upstreamJson(upstream);
}
