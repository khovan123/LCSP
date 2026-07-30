import { NextRequest } from "next/server";

import { sanitizeDocumentRequestPayload } from "@/lib/api/document-client";
import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const mock = await mockJsonResponse("document-action.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await params;
  const upstream = await upstreamRequest(
    `/assessments/${encodeURIComponent(id)}/documents/gap-analysis`,
    {
      method: "POST",
      bearerToken: session.token,
    },
  );

  return validatedUpstreamJson(upstream, sanitizeDocumentRequestPayload);
}
