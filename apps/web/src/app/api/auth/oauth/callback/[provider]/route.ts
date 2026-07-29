import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";
import { resolvePublicOrigin } from "@/lib/http/request-origin";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";
const oauthProviders = new Set(["google", "github"]);

type OAuthCallbackSuccess = {
  ok: true;
  session_token: string;
  mfa_required?: boolean;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const requestUrl = new URL(request.url);
  const publicOrigin = resolvePublicOrigin(request);
  const { provider } = await context.params;

  if (!oauthProviders.has(provider)) {
    return NextResponse.redirect(
      new URL("/sign-in?oauth=failed", publicOrigin),
    );
  }

  const endpoint = new URL("/auth/oauth/callback", apiBaseUrl);
  endpoint.searchParams.set("provider", provider);
  copySearchParam(requestUrl, endpoint, "code");
  copySearchParam(requestUrl, endpoint, "state");

  const apiResponse = await fetch(endpoint, { cache: "no-store" });
  const payload: unknown = await apiResponse.json().catch(() => null);

  if (!isOAuthCallbackSuccess(payload)) {
    return NextResponse.redirect(
      new URL("/sign-in?oauth=failed", publicOrigin),
    );
  }

  const destination = payload.mfa_required ? "/mfa/verify" : "/workspace";
  const response = NextResponse.redirect(new URL(destination, publicOrigin));
  response.cookies.set(
    SESSION_COOKIE_NAME,
    payload.session_token,
    sessionCookieOptions,
  );
  return response;
}

function copySearchParam(source: URL, destination: URL, name: string) {
  const value = source.searchParams.get(name);
  if (value) {
    destination.searchParams.set(name, value);
  }
}

function isOAuthCallbackSuccess(
  payload: unknown,
): payload is OAuthCallbackSuccess {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { ok?: unknown }).ok === true &&
    typeof (payload as { session_token?: unknown }).session_token === "string"
  );
}
