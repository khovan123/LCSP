import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { NextResponse } from "next/server";

import { resolvePublicOrigin } from "@/lib/http/request-origin";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";
const oauthProviders = new Set(["google", "github"]);

type OAuthStartSuccess = {
  ok: true;
  authorization_url: string;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = resolvePublicOrigin(request);
  const provider = requestUrl.searchParams.get("provider") ?? "github";

  if (!oauthProviders.has(provider)) {
    return NextResponse.json(
      { code: AUTH_ERROR_CODES.unsupportedProvider },
      { status: 400 },
    );
  }

  const redirectUri = new URL(
    `/api/auth/oauth/callback/${provider}`,
    publicOrigin,
  );
  const endpoint = new URL("/auth/oauth/start", apiBaseUrl);
  endpoint.searchParams.set("provider", provider);
  endpoint.searchParams.set("redirect_uri", redirectUri.toString());

  const apiResponse = await fetch(endpoint, { cache: "no-store" });
  const payload: unknown = await apiResponse.json().catch(() => null);

  if (!isOAuthStartSuccess(payload)) {
    return NextResponse.redirect(
      new URL("/sign-in?oauth=failed", publicOrigin),
    );
  }

  return NextResponse.redirect(payload.authorization_url);
}

function isOAuthStartSuccess(payload: unknown): payload is OAuthStartSuccess {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { ok?: unknown }).ok === true &&
    typeof (payload as { authorization_url?: unknown }).authorization_url ===
      "string"
  );
}
