import { NextRequest } from "next/server";

import type { GraphApiSuccessResponse } from "@/features/evidence/types/evidence-graph.types";
import { readMockJson } from "@/lib/server/fixtures/response";
import { successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const scope = request.nextUrl.searchParams.get("scope") ?? "overview";
  const clusterId = request.nextUrl.searchParams.get("clusterId");

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_EVIDENCE_GRAPH_MOCK === "true"
  ) {
    const mock = await readMockJson<GraphApiSuccessResponse>(
      "evidence-graph.json",
    );

    return successJson({
      ...mock.data,
      meta: {
        ...mock.data.meta,
        assessmentId: id,
        scope: scope === "detail" ? "detail" : "overview",
      },
      correlationId: `mock-${id}`,
    });
  }

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const query = new URLSearchParams({ scope });
  if (clusterId) query.set("clusterId", clusterId);

  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/evidence-graph?${query.toString()}`,
    { bearerToken: session.token },
  );

  return upstreamJson(upstream);
}
