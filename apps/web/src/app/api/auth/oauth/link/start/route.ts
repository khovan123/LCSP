import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { NextRequest, NextResponse } from "next/server";

import { resolvePublicOrigin } from "@/lib/http/request-origin";
import { problemJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamRequest, upstreamUrl } from "@/lib/server/upstream-request";

const oauthProviders = new Set(["google", "github"]);

type OAuthLinkStartSuccess = {
  authorization_url: string;
};

export async function GET(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const requestUrl = new URL(request.url);
  const publicOrigin = resolvePublicOrigin(request);
  const provider = requestUrl.searchParams.get("provider") ?? "github";

  if (!oauthProviders.has(provider)) {
    return problemJson(AUTH_ERROR_CODES.unsupportedProvider, { status: 400 });
  }

  const redirectUri = new URL(
    `/api/auth/oauth/link/callback/${provider}`,
    publicOrigin,
  );
  const endpoint = upstreamUrl("/auth/oauth/link/start");
  endpoint.searchParams.set("provider", provider);
  endpoint.searchParams.set("redirect_uri", redirectUri.toString());

  const upstream = await upstreamRequest(endpoint, {
    bearerToken: session.token,
  });

  if (!isOAuthLinkStartSuccess(upstream.data)) {
    return NextResponse.redirect(
      new URL(
        "/workspace/settings?section=account&oauth_link=failed",
        publicOrigin,
      ),
    );
  }

  return NextResponse.redirect(upstream.data.authorization_url);
}

function isOAuthLinkStartSuccess(
  payload: unknown,
): payload is OAuthLinkStartSuccess {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { authorization_url?: unknown }).authorization_url ===
      "string"
  );
}
