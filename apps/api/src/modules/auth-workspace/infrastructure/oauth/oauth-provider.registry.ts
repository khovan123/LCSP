import { Injectable } from "@nestjs/common";

import { GitHubOAuthProvider } from "./github-oauth.provider.ts";
import { GoogleOAuthProvider } from "./google-oauth.provider.ts";
import type { OAuthProvider } from "./oauth-provider.interface.ts";

@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: ReadonlyMap<string, OAuthProvider>;

  constructor(
    githubProvider: GitHubOAuthProvider,
    googleProvider: GoogleOAuthProvider,
  ) {
    const providers: [string, OAuthProvider][] = [
      [githubProvider.name, githubProvider],
    ];
    if (googleProvider.isConfigured) {
      providers.push([googleProvider.name, googleProvider]);
    }
    this.providers = new Map(providers);
  }

  resolve(name: string): OAuthProvider | null {
    return this.providers.get(name) ?? null;
  }
}
