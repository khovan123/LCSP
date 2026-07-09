import { Injectable } from "@nestjs/common";

import { GitHubOAuthProvider } from "./github-oauth.provider.ts";
import type { OAuthProvider } from "./oauth-provider.interface.ts";

@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: ReadonlyMap<string, OAuthProvider>;

  constructor(githubProvider: GitHubOAuthProvider) {
    this.providers = new Map([[githubProvider.name, githubProvider]]);
  }

  resolve(name: string): OAuthProvider | null {
    return this.providers.get(name) ?? null;
  }
}
