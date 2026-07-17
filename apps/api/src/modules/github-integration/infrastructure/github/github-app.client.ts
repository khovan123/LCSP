import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const GITHUB_APP_INSTALL_BASE_URL = "https://github.com/apps";
const GITHUB_APP_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE_URL = "https://api.github.com";

export class GitHubAppClientError extends Error {}

export interface GitHubAppInstallationMetadata {
  permissions: Record<string, string>;
  repository: {
    id: string;
    name: string;
    fullName: string;
    defaultBranch: string;
  };
}

@Injectable()
export class GitHubAppClient {
  constructor(private readonly configService: ConfigService) {}

  buildInstallationUrl(input: { state: string; redirectUri: string }): string {
    const appSlug = this.configService.get<string>("github.appSlug", "");
    const url = new URL(
      `${GITHUB_APP_INSTALL_BASE_URL}/${appSlug}/installations/new`,
    );
    url.searchParams.set("state", input.state);
    url.searchParams.set("redirect_uri", input.redirectUri);
    return url.toString();
  }

  async exchangeCodeForAccessToken(code: string): Promise<string> {
    const clientId = this.configService.get<string>("github.clientId", "");
    const clientSecret = this.configService.get<string>(
      "github.clientSecret",
      "",
    );

    let response: Response;
    try {
      response = await fetch(GITHUB_APP_TOKEN_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });
    } catch {
      throw new GitHubAppClientError("github_app_token_exchange_unreachable");
    }

    if (!response.ok) {
      throw new GitHubAppClientError("github_app_token_exchange_failed");
    }

    const body = (await response.json().catch(() => null)) as {
      access_token?: unknown;
    } | null;

    if (!body || typeof body.access_token !== "string" || !body.access_token) {
      throw new GitHubAppClientError("github_app_token_exchange_failed");
    }

    return body.access_token;
  }

  async fetchInstallationMetadata(input: {
    installationId: string;
    accessToken: string;
  }): Promise<GitHubAppInstallationMetadata> {
    const installation = await this.getJson<{
      permissions?: unknown;
    }>(
      `${GITHUB_API_BASE_URL}/user/installations/${input.installationId}`,
      input.accessToken,
    );

    if (
      !installation ||
      typeof installation.permissions !== "object" ||
      installation.permissions === null
    ) {
      throw new GitHubAppClientError("github_app_installation_fetch_failed");
    }

    const repositories = await this.getJson<{
      repositories?: Array<{
        id?: unknown;
        name?: unknown;
        full_name?: unknown;
        default_branch?: unknown;
      }>;
    }>(
      `${GITHUB_API_BASE_URL}/user/installations/${input.installationId}/repositories`,
      input.accessToken,
    );

    const repository = repositories?.repositories?.[0];
    if (
      !repository ||
      typeof repository.id !== "number" ||
      typeof repository.name !== "string" ||
      typeof repository.full_name !== "string" ||
      typeof repository.default_branch !== "string"
    ) {
      throw new GitHubAppClientError("github_app_repository_fetch_failed");
    }

    return {
      permissions: installation.permissions as Record<string, string>,
      repository: {
        id: String(repository.id),
        name: repository.name,
        fullName: repository.full_name,
        defaultBranch: repository.default_branch,
      },
    };
  }

  private async getJson<T>(
    url: string,
    accessToken: string,
  ): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
          "user-agent": "lcsp-api",
        },
      });
    } catch {
      throw new GitHubAppClientError("github_app_metadata_fetch_unreachable");
    }

    if (!response.ok) {
      throw new GitHubAppClientError("github_app_metadata_fetch_failed");
    }

    return (await response.json().catch(() => null)) as T | null;
  }
}
