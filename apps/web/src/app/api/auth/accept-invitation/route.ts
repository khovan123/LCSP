import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";
import { getAcceptedInvitationLocation } from "@/lib/server/invitations/accepted-invitation-location";
import {
  isAcceptInvitationApiSuccess,
  safeAcceptInvitationErrorCode,
} from "@/lib/server/invitations/invitation-upstream-response";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const upstream = await upstreamRequest("/auth/accept-invitation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return problemJson(safeAcceptInvitationErrorCode(upstream.result), {
      status: upstream.status,
    });
  }

  if (!isAcceptInvitationApiSuccess(upstream.data)) {
    return problemJson(safeAcceptInvitationErrorCode(upstream.result), {
      status: 502,
    });
  }

  const response = successJson({
    location: getAcceptedInvitationLocation(upstream.data.scope),
  });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    upstream.data.session_token,
    sessionCookieOptions,
  );
  return response;
}
