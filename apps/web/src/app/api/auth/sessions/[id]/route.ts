import { NextRequest } from "next/server";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id } = await context.params;

  if (isMockModeEnabled()) {
    return successJson({ revoked_session_id: id });
  }

  const upstream = await upstreamRequest(
    `/auth/sessions/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      bearerToken: session.token,
    },
  );
  return validatedUpstreamJson(upstream, sanitizeRevokedSessionPayload);
}

function sanitizeRevokedSessionPayload(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  return typeof candidate.revoked_session_id === "string" ? candidate : null;
}
