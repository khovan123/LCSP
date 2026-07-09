import { AUTH_ERROR_CODES, createProblemResult } from "@lcsp/contracts/auth";
import type { ConfigService } from "@nestjs/config";

import { OAuthState } from "../../../domain/models/auth-workspace.models.ts";
import { issueOAuthStateToken } from "../../../infrastructure/security/security.utils.ts";
import type { OAuthProviderRegistry } from "../../../infrastructure/oauth/oauth-provider.registry.ts";
import type { AuthProblemResult } from "../../contracts/auth-workspace/common.contract.ts";
import type { OAuthStartSuccess } from "../../contracts/auth-workspace/oauth.contract.ts";
import type { AuthWorkspaceRepositories } from "../../ports/persistence/auth-workspace-repositories.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import { OAuthStartCommand } from "./oauth-start.command.ts";

const OAUTH_STATE_TTL_MS = 10 * 60_000;

export class OAuthStartHandler {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    private readonly repositories: AuthWorkspaceRepositories,
    private readonly providerRegistry: OAuthProviderRegistry,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: OAuthStartCommand,
  ): Promise<AuthProblemResult | OAuthStartSuccess> {
    const { payload, requestMeta } = command;
    const { repositories } = this;
    const correlationId =
      requestMeta.correlation_id ?? this.support.createCorrelationId();

    const providerName = asNonEmptyString(payload?.provider);
    const redirectUri = asNonEmptyString(payload?.redirect_uri);

    if (!providerName || !redirectUri) {
      return createProblemResult(
        AUTH_ERROR_CODES.validationFailed,
        correlationId,
      );
    }

    const provider = this.providerRegistry.resolve(providerName);
    if (!provider) {
      await this.recordFailure(
        repositories,
        correlationId,
        AUTH_ERROR_CODES.unsupportedProvider,
      );
      return createProblemResult(
        AUTH_ERROR_CODES.unsupportedProvider,
        correlationId,
      );
    }

    const allowedRedirectUris = this.configService.get<string[]>(
      "oauth.allowedRedirectUris",
      [],
    );
    if (!allowedRedirectUris.includes(redirectUri)) {
      await this.recordFailure(
        repositories,
        correlationId,
        AUTH_ERROR_CODES.invalidRedirectUri,
      );
      return createProblemResult(
        AUTH_ERROR_CODES.invalidRedirectUri,
        correlationId,
      );
    }

    const state = issueOAuthStateToken();
    const nonce = issueOAuthStateToken();
    const oauthState = new OAuthState({
      id: repositories.oauthStates.nextId(),
      state,
      nonce,
      provider: providerName,
      redirectUri,
      expiresAt: this.support.now() + OAUTH_STATE_TTL_MS,
    });
    await repositories.oauthStates.save(oauthState);

    const authorizationUrl = provider.buildAuthorizationUrl({
      state,
      nonce,
      redirectUri,
    });

    await this.support.recordAudit(repositories, {
      event_type: "auth.oauth.start.succeeded",
      actor_id: null,
      organization_id: null,
      decision: "allow",
      correlation_id: correlationId,
      provider: providerName,
    });

    return {
      ok: true,
      correlation_id: correlationId,
      authorization_url: authorizationUrl,
    };
  }

  private async recordFailure(
    repositories: AuthWorkspaceRepositories,
    correlationId: string,
    reasonCode: string,
  ): Promise<void> {
    await this.support.recordAudit(repositories, {
      event_type: "auth.oauth.start.failed",
      actor_id: null,
      organization_id: null,
      decision: "deny",
      reason_code: reasonCode,
      correlation_id: correlationId,
    });
  }
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
