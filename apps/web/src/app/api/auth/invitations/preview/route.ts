import { NextResponse } from "next/server";
import { ACCEPT_INVITATION_ERROR_CODES } from "@lcsp/contracts/auth";

import { safeInvitationPreviewErrorCode } from "@/lib/api/invitation-proxy";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const apiResponse = await fetch(`${apiBaseUrl}/auth/invitations/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok) {
    return NextResponse.json(
      { problem: { code: safeInvitationPreviewErrorCode(payload) } },
      { status: apiResponse.status },
    );
  }

  const preview = toDisplaySafePreview(payload);
  if (!preview) {
    return NextResponse.json(
      {
        problem: {
          code: ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(preview);
}

function toDisplaySafePreview(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as {
    organization?: { id?: unknown; name?: unknown };
    scope?: {
      type?: unknown;
      assessment?: { id?: unknown; name?: unknown } | null;
    };
    allowed_actions?: unknown;
    expires_at?: unknown;
  };
  if (
    typeof candidate.organization?.id !== "string" ||
    typeof candidate.organization.name !== "string" ||
    !Array.isArray(candidate.allowed_actions) ||
    !candidate.allowed_actions.every((action) => typeof action === "string") ||
    typeof candidate.expires_at !== "string"
  ) {
    return null;
  }

  const scope =
    candidate.scope?.type === "organization" &&
    candidate.scope.assessment === null
      ? { type: "organization" as const, assessment: null }
      : candidate.scope?.type === "assessment" &&
          typeof candidate.scope.assessment?.id === "string" &&
          typeof candidate.scope.assessment.name === "string"
        ? {
            type: "assessment" as const,
            assessment: {
              id: candidate.scope.assessment.id,
              name: candidate.scope.assessment.name,
            },
          }
        : null;
  if (!scope) {
    return null;
  }

  return {
    organization: {
      id: candidate.organization.id,
      name: candidate.organization.name,
    },
    scope,
    allowed_actions: candidate.allowed_actions,
    expires_at: candidate.expires_at,
  };
}
