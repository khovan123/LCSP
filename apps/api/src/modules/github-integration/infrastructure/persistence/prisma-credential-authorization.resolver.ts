import { Inject, Injectable } from "@nestjs/common";
import {
  CredentialAuthorizationStatus,
  ProviderCredentialStatus,
  RepositoryAuthenticationMode,
  RepositoryConnectionStatus,
} from "@prisma/client";
import {
  GITHUB_CREDENTIAL_ERROR_CODES,
  GITHUB_CREDENTIAL_OPERATIONS,
  type GitHubCredentialErrorCode,
} from "@lcsp/contracts/github-integration";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type {
  CredentialAuthorizationResolverPort,
  CredentialOperationContext,
  CredentialRevocationPlan,
  RotationAuthority,
} from "../../application/ports/security/credential-authorization-resolver.port.js";
import {
  CREDENTIAL_STORE,
  type CredentialStorePort,
  type SecretLocator,
} from "../../application/ports/security/credential-store.port.js";
import { CredentialLease } from "../../application/security/credential-lease.js";

export class CredentialResolutionError extends Error {
  readonly code: GitHubCredentialErrorCode;
  constructor(code: GitHubCredentialErrorCode) {
    super(code);
    this.name = "CredentialResolutionError";
    this.code = code;
  }
}

/** Persistence-backed resolver. It is registered only as an internal foundation and is not used by production handlers. */
@Injectable()
export class PrismaCredentialAuthorizationResolver implements CredentialAuthorizationResolverPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CREDENTIAL_STORE) private readonly store: CredentialStorePort,
  ) {}

  async resolveForConnection(
    context: CredentialOperationContext,
    connectionId: string,
    expectedRepositoryFullName: string,
  ): Promise<CredentialLease> {
    const connection = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: connectionId,
        userId: context.userId,
        status: RepositoryConnectionStatus.ACTIVE,
        authenticationMode: {
          in: [
            RepositoryAuthenticationMode.GITHUB_CLI_CREDENTIAL,
            RepositoryAuthenticationMode.GITLAB_CLI_CREDENTIAL,
          ],
        },
      },
      include: {
        credentialAuthorization: {
          include: { providerCredential: { include: { secrets: true } } },
        },
      },
    });
    const authorization = connection?.credentialAuthorization;
    const credential = authorization?.providerCredential;
    const now = new Date();
    if (
      !connection ||
      !authorization ||
      !credential ||
      connection.repositoryFullName !== expectedRepositoryFullName ||
      authorization.repositoryId !== connection.repositoryId ||
      authorization.repositoryFullName !== expectedRepositoryFullName ||
      authorization.status !== CredentialAuthorizationStatus.ACTIVE ||
      (authorization.assessmentId !== null &&
        authorization.assessmentId !== context.assessmentId) ||
      authorization.credentialVersion !== credential.currentVersion ||
      credential.ownerUserId !== context.userId ||
      (!isConnectionConsumption(context.operation) &&
        context.actorId !== null &&
        credential.ownerUserId !== context.actorId)
    ) {
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      );
    }
    if (
      credential.status === ProviderCredentialStatus.EXPIRED ||
      (credential.declaredExpiresAt !== null &&
        credential.declaredExpiresAt <= now)
    ) {
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialExpired,
      );
    }
    if (credential.status !== ProviderCredentialStatus.ACTIVE) {
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      );
    }
    const secret = credential.secrets.find(
      (candidate) =>
        candidate.credentialVersion === credential.currentVersion &&
        candidate.destroyedAt === null,
    );
    if (!secret)
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      );
    try {
      const plaintext = await this.store.read(secret.id as SecretLocator);
      const credentialExpiry =
        credential.declaredExpiresAt?.getTime() ?? now.getTime() + 300_000;
      return new CredentialLease(plaintext, {
        internalCredentialId: credential.id,
        credentialVersion: credential.currentVersion,
        repositoryFullName: connection.repositoryFullName,
        expiresAt: new Date(
          Math.min(credentialExpiry, now.getTime() + 300_000),
        ),
      });
    } catch {
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.providerClientUnavailable,
      );
    }
  }

  async markInvalid(
    connectionId: string,
    credentialVersion: number,
    safeReason: GitHubCredentialErrorCode,
  ): Promise<void> {
    const connection = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: connectionId,
        authenticationMode: {
          in: [
            RepositoryAuthenticationMode.GITHUB_CLI_CREDENTIAL,
            RepositoryAuthenticationMode.GITLAB_CLI_CREDENTIAL,
          ],
        },
      },
      include: {
        credentialAuthorization: { include: { providerCredential: true } },
      },
    });
    const authorization = connection?.credentialAuthorization;
    if (!authorization || authorization.credentialVersion !== credentialVersion)
      return;
    await this.prisma.providerCredential.updateMany({
      where: {
        id: authorization.providerCredentialId,
        ownerUserId: authorization.providerCredential.ownerUserId,
        currentVersion: credentialVersion,
      },
      data: {
        status: ProviderCredentialStatus.INVALID,
        invalidatedAt: new Date(),
        lastFailureCode: safeReason,
      },
    });
  }

  async assertRotationAuthority(
    context: CredentialOperationContext,
    connectionId: string,
  ): Promise<RotationAuthority> {
    const row = await this.authorizedBinding(context, connectionId);
    return {
      connectionId,
      userId: context.userId,
      repositoryFullNames: [row.repositoryFullName],
      expectedCredentialVersion: row.credentialVersion,
    };
  }

  async revokeForConnection(
    context: CredentialOperationContext,
    connectionId: string,
  ): Promise<CredentialRevocationPlan> {
    const row = await this.authorizedBinding(context, connectionId);
    await this.prisma.credentialAuthorization.updateMany({
      where: {
        id: row.id,
        status: CredentialAuthorizationStatus.ACTIVE,
      },
      data: { status: CredentialAuthorizationStatus.REVOKING },
    });
    return {
      connectionId,
      userId: context.userId,
      repositoryFullNames: [row.repositoryFullName],
      expectedCredentialVersion: row.credentialVersion,
      affectedConnectionIds: [connectionId],
    };
  }

  private async authorizedBinding(
    context: CredentialOperationContext,
    connectionId: string,
  ) {
    const row = await this.prisma.credentialAuthorization.findFirst({
      where: {
        repositoryConnection: {
          is: {
            id: connectionId,
            userId: context.userId,
            authenticationMode: {
              in: [
                RepositoryAuthenticationMode.GITHUB_CLI_CREDENTIAL,
                RepositoryAuthenticationMode.GITLAB_CLI_CREDENTIAL,
              ],
            },
          },
        },
        providerCredential: {
          ownerUserId: context.userId,
        },
        status: CredentialAuthorizationStatus.ACTIVE,
      },
    });
    if (!row)
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      );
    return row;
  }
}

function isConnectionConsumption(
  operation: CredentialOperationContext["operation"],
): boolean {
  return (
    operation === GITHUB_CREDENTIAL_OPERATIONS.pinSnapshot ||
    operation === GITHUB_CREDENTIAL_OPERATIONS.retrieveArchive
  );
}
