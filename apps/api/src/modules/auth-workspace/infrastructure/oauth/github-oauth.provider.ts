import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  OAuthCallbackError,
  type OAuthAuthorizationRequest,
  type OAuthCallbackClaims,
  type OAuthCallbackInput,
  type OAuthProvider,
} from "./oauth-provider.interface.ts";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

// GitHub's classic OAuth2 has no signed ID token, so there is no externally
// asserted issuer/audience to verify. These are fixed, self-controlled
// constants (never attacker-influenced) reported purely so the shared
// callback validation path is exercised the same way it would be for a real
// OIDC provider.
const GITHUB_ISSUER = "https://github.com";

@Injectable()
export class GitHubOAuthProvider implements OAuthProvider {
  readonly name = "github";
  readonly expectedIssuer = GITHUB_ISSUER;

  constructor(private readonly configService: ConfigService) {}

  get expectedAudience(): string {
    return this.configService.get<string>("oauth.githubClientId", "");
  }

  buildAuthorizationUrl(request: OAuthAuthorizationRequest): string {
    const clientId = this.configService.get<string>("oauth.githubClientId", "");
    const url = new URL(GITHUB_AUTHORIZE_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", request.redirectUri);
    url.searchParams.set("state", request.state);
    url.searchParams.set("scope", "read:user user:email");
    return url.toString();
  }

  async handleCallback(
    input: OAuthCallbackInput,
  ): Promise<OAuthCallbackClaims> {
    const accessToken = await this.exchangeCodeForAccessToken(input);
    const providerAccountId = await this.fetchAccountId(accessToken);

    return {
      providerAccountId,
      email: null,
      emailVerified: false,
      nonce: null,
      issuer: GITHUB_ISSUER,
      audience: this.expectedAudience,
      expiresAt: null,
    };
  }

  private async exchangeCodeForAccessToken(
    input: OAuthCallbackInput,
  ): Promise<string> {
    const clientId = this.configService.get<string>("oauth.githubClientId", "");
    const clientSecret = this.configService.get<string>(
      "oauth.githubClientSecret",
      "",
    );

    let response: Response;
    try {
      response = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          redirect_uri: input.redirectUri,
        }),
      });
    } catch {
      throw new OAuthCallbackError("github_token_exchange_unreachable");
    }

    if (!response.ok) {
      throw new OAuthCallbackError("github_token_exchange_failed");
    }

    const body = (await response.json().catch(() => null)) as {
      access_token?: unknown;
    } | null;

    if (!body || typeof body.access_token !== "string" || !body.access_token) {
      throw new OAuthCallbackError("github_token_exchange_failed");
    }

    return body.access_token;
  }

  private async fetchAccountId(accessToken: string): Promise<string> {
    let response: Response;
    try {
      response = await fetch(GITHUB_USER_URL, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
          "user-agent": "lcsp-api",
        },
      });
    } catch {
      throw new OAuthCallbackError("github_user_fetch_unreachable");
    }

    if (!response.ok) {
      throw new OAuthCallbackError("github_user_fetch_failed");
    }

    const body = (await response.json().catch(() => null)) as {
      id?: unknown;
    } | null;

    if (!body || typeof body.id !== "number") {
      throw new OAuthCallbackError("github_user_fetch_failed");
    }

    return String(body.id);
  }
}
