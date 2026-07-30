import { NextRequest } from "next/server";

import { mockJsonResponse } from "@/lib/server/fixtures/response";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";

export async function GET(request: NextRequest) {
  const mock = await mockJsonResponse("developer-task.json");
  if (mock) return mock;
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const upstream = await upstreamRequest("/workspace/developer-task", {
    bearerToken: session.token,
  });

  return validatedUpstreamJson(upstream, toDisplaySafeContext);
}

function toDisplaySafeContext(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;
  const candidate = payload as {
    organization?: { id?: unknown; name?: unknown };
    scope?: {
      type?: unknown;
      assessment?: { id?: unknown; name?: unknown } | null;
    };
    granted_actions?: unknown;
  };
  if (
    typeof candidate.organization?.id !== "string" ||
    candidate.organization.id.trim().length === 0 ||
    typeof candidate.organization.name !== "string" ||
    candidate.organization.name.trim().length === 0 ||
    !Array.isArray(candidate.granted_actions) ||
    !candidate.granted_actions.every((action) => typeof action === "string")
  ) {
    return null;
  }

  const scope =
    candidate.scope?.type === "organization" &&
    candidate.scope.assessment === null
      ? { type: "organization" as const, assessment: null }
      : candidate.scope?.type === "assessment" &&
          typeof candidate.scope.assessment?.id === "string" &&
          candidate.scope.assessment.id.trim().length > 0 &&
          typeof candidate.scope.assessment.name === "string" &&
          candidate.scope.assessment.name.trim().length > 0
        ? {
            type: "assessment" as const,
            assessment: {
              id: candidate.scope.assessment.id,
              name: candidate.scope.assessment.name,
            },
          }
        : null;
  return scope
    ? {
        organization: {
          id: candidate.organization.id,
          name: candidate.organization.name,
        },
        scope,
        granted_actions: candidate.granted_actions,
      }
    : null;
}
