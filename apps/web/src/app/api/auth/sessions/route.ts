import { NextRequest } from "next/server";

import { isMockModeEnabled } from "@/lib/server/fixtures/response";
import { successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function GET(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  if (isMockModeEnabled()) {
    return successJson({
      sessions: [
        {
          id: "mock-session-current",
          created_at: new Date("2026-07-31T19:00:00.000Z").toISOString(),
          updated_at: new Date("2026-07-31T20:30:00.000Z").toISOString(),
          expires_at: new Date("2026-08-14T20:30:00.000Z").toISOString(),
          revoked_at: null,
          mfa_verified_at: new Date("2026-07-31T19:20:00.000Z").toISOString(),
          is_current: true,
        },
        {
          id: "mock-session-older",
          created_at: new Date("2026-07-29T09:15:00.000Z").toISOString(),
          updated_at: new Date("2026-07-29T18:45:00.000Z").toISOString(),
          expires_at: new Date("2026-08-12T18:45:00.000Z").toISOString(),
          revoked_at: null,
          mfa_verified_at: new Date("2026-07-29T09:16:00.000Z").toISOString(),
          is_current: false,
        },
      ],
    });
  }

  const upstream = await upstreamRequest("/auth/sessions", {
    bearerToken: session.token,
  });
  return validatedUpstreamJson(upstream, sanitizeSessionsPayload);
}

function sanitizeSessionsPayload(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const sessions = (data as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions)) {
    return null;
  }

  return sessions.every((session) => {
    if (typeof session !== "object" || session === null) {
      return false;
    }

    const candidate = session as Record<string, unknown>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.created_at === "string" &&
      typeof candidate.updated_at === "string" &&
      typeof candidate.expires_at === "string" &&
      (typeof candidate.revoked_at === "string" || candidate.revoked_at === null) &&
      (typeof candidate.mfa_verified_at === "string" ||
        candidate.mfa_verified_at === null) &&
      typeof candidate.is_current === "boolean"
    );
  })
    ? { sessions }
    : null;
}
