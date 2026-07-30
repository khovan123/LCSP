import { NextRequest } from "next/server";

import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mock = await mockJsonResponse("wizard-action.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/wizard/draft`,
    {
      method: "PUT",
      bearerToken: session.token,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return upstreamJson(upstream);
}
