import { ACCEPT_INVITATION_ERROR_CODES } from "@lcsp/contracts/auth";

import { safeInvitationPreviewErrorCode } from "@/lib/server/invitations/invitation-upstream-response";
import {
  problemJson,
  successJson,
} from "@/lib/server/problem-json";
import { upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const upstream = await upstreamRequest("/auth/invitations/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return problemJson(safeInvitationPreviewErrorCode(upstream.result), {
      status: upstream.status,
    });
  }

  const preview = toDisplaySafePreview(upstream.data);
  if (!preview) {
    return problemJson(ACCEPT_INVITATION_ERROR_CODES.invitationInvalid, {
      status: 502,
    });
  }

  return successJson(preview);
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
