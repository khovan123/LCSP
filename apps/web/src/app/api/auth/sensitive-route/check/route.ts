import { NextRequest } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import { problemJson, successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamJson,
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";
import { isMockModeEnabled } from "@/lib/server/fixtures/response";

type SensitiveRouteCheckPayload = {
  method?: unknown;
  path?: unknown;
  route?: unknown;
};

type SensitiveRouteCheckResponse = {
  is_sensitive: boolean;
  route_id: string | null;
  reauth_required: boolean;
  verified_at: string | null;
  expires_at: string | null;
};

export async function POST(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as
    | SensitiveRouteCheckPayload
    | null;
  if (!body || !isValidPayload(body)) {
    return problemJson(AUTH_ERROR_CODES.validationFailed, { status: 400 });
  }

  if (isMockModeEnabled()) {
    return successJson({
      is_sensitive: true,
      route_id: null,
      reauth_required: true,
      verified_at: null,
      expires_at: null,
    });
  }

  const upstream = await upstreamRequest("/auth/sensitive-route/check", {
    method: "POST",
    bearerToken: session.token,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return upstreamJson(upstream);
  }

  return validatedUpstreamJson(upstream, sanitizeSensitiveRouteCheck);
}

function isValidPayload(payload: SensitiveRouteCheckPayload) {
  const method = typeof payload.method === "string" ? payload.method : "";
  const route =
    typeof payload.path === "string"
      ? payload.path
      : typeof payload.route === "string"
        ? payload.route
        : "";

  return method.trim().length > 0 && route.trim().length > 0;
}

function sanitizeSensitiveRouteCheck(
  payload: unknown,
): SensitiveRouteCheckResponse | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const value = payload as Partial<SensitiveRouteCheckResponse>;
  return typeof value.is_sensitive === "boolean" &&
    isNullableString(value.route_id) &&
    typeof value.reauth_required === "boolean" &&
    isNullableString(value.verified_at) &&
    isNullableString(value.expires_at)
    ? {
        is_sensitive: value.is_sensitive,
        route_id: value.route_id,
        reauth_required: value.reauth_required,
        verified_at: value.verified_at,
        expires_at: value.expires_at,
      }
    : null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
