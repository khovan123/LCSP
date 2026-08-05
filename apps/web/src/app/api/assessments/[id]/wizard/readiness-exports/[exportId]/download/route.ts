import { NextResponse, type NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamBinaryRequest,
  upstreamJson,
} from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id, exportId } = await params;
  const upstream = await upstreamBinaryRequest(
    `/assessments/${encodeURIComponent(id)}/wizard/readiness-exports/${encodeURIComponent(exportId)}/download`,
    { bearerToken: session.token },
  );
  if (!upstream.ok || upstream.body === null) {
    return upstreamJson(upstream);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": upstream.contentType ?? "application/pdf",
      ...(upstream.contentDisposition
        ? { "content-disposition": upstream.contentDisposition }
        : {}),
    },
  });
}
