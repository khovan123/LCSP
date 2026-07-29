import { NextRequest, NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";
import { mockJsonResponse } from "@/lib/mocks/mock-response";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const mock = await mockJsonResponse("developer-task.json");
  if (mock) return mock;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { problem: { code: AUTH_ERROR_CODES.sessionInvalid } },
      { status: 401 },
    );
  }

  const apiResponse = await fetch(`${apiBaseUrl}/workspace/developer-task`, {
    headers: { authorization: `Bearer ${sessionToken}` },
    cache: "no-store",
  });
  const payload: unknown = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(payload, { status: apiResponse.status });
  }

  const context = toDisplaySafeContext(payload);
  return context
    ? NextResponse.json(context, { status: apiResponse.status })
    : NextResponse.json(
        { problem: { code: "UPSTREAM_RESPONSE_INVALID" } },
        { status: 502 },
      );
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
