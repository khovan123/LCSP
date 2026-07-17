import { createSign } from "node:crypto";

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

export interface GitHubResolvedCommit {
  sha: string;
  repositoryFullName: string;
  htmlUrl: string;
  authorDate: string | null;
  committerDate: string | null;
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

  async resolveCommit(input: {
    installationId: string;
    repositoryFullName: string;
    revision: string;
  }): Promise<GitHubResolvedCommit> {
    const accessToken = await this.createInstallationAccessToken(
      input.installationId,
    );
    const commit = await this.getJson<{
      sha?: unknown;
      url?: unknown;
      html_url?: unknown;
      commit?: {
        author?: { date?: unknown };
        committer?: { date?: unknown };
      };
    }>(
      `${GITHUB_API_BASE_URL}/repos/${input.repositoryFullName}/commits/${encodeURIComponent(input.revision)}`,
      accessToken,
    );
    const expectedApiPrefix = `${GITHUB_API_BASE_URL}/repos/${input.repositoryFullName}/commits/`;
    const expectedHtmlPrefix = `https://github.com/${input.repositoryFullName}/commit/`;

    if (
      !commit ||
      typeof commit.sha !== "string" ||
      !/^[0-9a-f]{40}$/i.test(commit.sha) ||
      typeof commit.url !== "string" ||
      !commit.url.startsWith(expectedApiPrefix) ||
      typeof commit.html_url !== "string" ||
      !commit.html_url.startsWith(expectedHtmlPrefix)
    ) {
      throw new GitHubAppClientError("github_commit_resolution_failed");
    }

    return {
      sha: commit.sha.toLowerCase(),
      repositoryFullName: input.repositoryFullName,
      htmlUrl: commit.html_url,
      authorDate: optionalString(commit.commit?.author?.date),
      committerDate: optionalString(commit.commit?.committer?.date),
    };
  }

  private async createInstallationAccessToken(
    installationId: string,
  ): Promise<string> {
    const body = await this.postJson<{ token?: unknown }>(
      `${GITHUB_API_BASE_URL}/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
      this.createAppJwt(),
    );
    if (!body || typeof body.token !== "string" || !body.token) {
      throw new GitHubAppClientError(
        "github_installation_token_creation_failed",
      );
    }
    return body.token;
  }

  private createAppJwt(): string {
    const appId = this.configService.get<string>("github.appId", "");
    const privateKey = this.configService
      .get<string>("github.privateKey", "")
      .replace(/\\n/g, "\n");
    if (!appId || !privateKey) {
      throw new GitHubAppClientError("github_app_credentials_missing");
    }

    const issuedAt = Math.floor(Date.now() / 1000) - 60;
    const header = encodeJwtPart({ alg: "RS256", typ: "JWT" });
    const payload = encodeJwtPart({
      iat: issuedAt,
      exp: issuedAt + 600,
      iss: appId,
    });
    const unsignedToken = `${header}.${payload}`;

    try {
      const signer = createSign("RSA-SHA256");
      signer.update(unsignedToken);
      signer.end();
      return `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;
    } catch {
      throw new GitHubAppClientError("github_app_credentials_invalid");
    }
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

  private async postJson<T>(
    url: string,
    bearerToken: string,
  ): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${bearerToken}`,
          accept: "application/vnd.github+json",
          "user-agent": "lcsp-api",
        },
      });
    } catch {
      throw new GitHubAppClientError("github_app_api_unreachable");
    }

    if (!response.ok) {
      throw new GitHubAppClientError("github_app_api_request_failed");
    }
    return (await response.json().catch(() => null)) as T | null;
  }
}

function encodeJwtPart(value: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
