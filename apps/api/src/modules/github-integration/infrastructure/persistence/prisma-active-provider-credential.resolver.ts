import { Inject, Injectable } from "@nestjs/common";
import { CredentialProvider, ProviderCredentialStatus } from "@prisma/client";
import { CREDENTIAL_PROVIDERS } from "@lcsp/contracts/github-integration";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import {
  ACTIVE_PROVIDER_CREDENTIAL_RESOLVER,
  type ActiveProviderCredentialMetadata,
  type ActiveProviderCredentialResolver,
} from "../../application/ports/security/active-provider-credential.resolver.js";
import {
  CREDENTIAL_STORE,
  type CredentialStorePort,
  type SecretLocator,
} from "../../application/ports/security/credential-store.port.js";
import { CredentialLease } from "../../application/security/credential-lease.js";
import { CredentialResolutionError } from "./prisma-credential-authorization.resolver.js";
import { GITHUB_CREDENTIAL_ERROR_CODES } from "@lcsp/contracts/github-integration";

@Injectable()
export class PrismaActiveProviderCredentialResolver implements ActiveProviderCredentialResolver {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CREDENTIAL_STORE) private readonly store: CredentialStorePort,
  ) {}

  async findMetadata(input: {
    organizationId: string;
    userId: string;
    provider: CredentialProvider;
  }): Promise<ActiveProviderCredentialMetadata | null> {
    const row = await this.prisma.providerCredential.findFirst({
      where: {
        organizationId: input.organizationId,
        ownerUserId: input.userId,
        provider: input.provider,
        status: ProviderCredentialStatus.ACTIVE,
        isActive: true,
      },
      orderBy: [{ validatedAt: "desc" }, { id: "desc" }],
    });
    return row
      ? {
          id: row.id,
          provider:
            row.provider === CredentialProvider.GITLAB
              ? CREDENTIAL_PROVIDERS.gitlab
              : CREDENTIAL_PROVIDERS.github,
          providerAccountId: row.providerAccountId.toString(),
          providerLogin: row.providerLogin,
          currentVersion: row.currentVersion,
        }
      : null;
  }

  async resolveLease(input: {
    organizationId: string;
    userId: string;
    provider: CredentialProvider;
    repositoryFullName: string;
  }): Promise<CredentialLease> {
    const metadata = await this.findMetadata(input);
    if (!metadata)
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      );
    const row = await this.prisma.providerCredentialSecret.findFirst({
      where: {
        providerCredentialId: metadata.id,
        credentialVersion: metadata.currentVersion,
        destroyedAt: null,
      },
    });
    if (!row)
      throw new CredentialResolutionError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      );
    const secret = await this.store.read(row.id as SecretLocator);
    return new CredentialLease(secret, {
      internalCredentialId: metadata.id,
      credentialVersion: metadata.currentVersion,
      repositoryFullName: input.repositoryFullName,
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });
  }
}
