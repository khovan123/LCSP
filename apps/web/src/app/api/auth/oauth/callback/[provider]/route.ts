import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";
import { resolvePublicOrigin } from "@/lib/http/request-origin";
import { upstreamRequest, upstreamUrl } from "@/lib/server/upstream-request";

const oauthProviders = new Set(["google", "github"]);

type OAuthCallbackSuccess = {
  session_token: string;
  mfa_required?: boolean;
  mfa_enrolled?: boolean;
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

  const endpoint = upstreamUrl("/auth/oauth/callback");
  endpoint.searchParams.set("provider", provider);
  copySearchParam(requestUrl, endpoint, "code");
  copySearchParam(requestUrl, endpoint, "state");

  const upstream = await upstreamRequest(endpoint);

  if (!isOAuthCallbackSuccess(upstream.data)) {
    return NextResponse.redirect(
      new URL("/sign-in?oauth=failed", publicOrigin),
    );
  }

  const destination = upstream.data.mfa_required ? "/mfa/verify" : "/workspace";
  const response = NextResponse.redirect(new URL(destination, publicOrigin));
  response.cookies.set(
    SESSION_COOKIE_NAME,
    upstream.data.session_token,
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
    typeof (payload as { session_token?: unknown }).session_token === "string"
  );
}
