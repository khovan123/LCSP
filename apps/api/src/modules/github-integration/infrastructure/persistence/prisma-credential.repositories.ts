import { Injectable, Optional } from "@nestjs/common";
import {
  CredentialAuthorizationStatus as PrismaAuthorizationStatus,
  CredentialProvider as PrismaCredentialProvider,
  ProviderCredentialStatus as PrismaCredentialStatus,
  type Prisma,
} from "@prisma/client";
import {
  CREDENTIAL_AUTHORIZATION_STATUSES,
  CREDENTIAL_PROVIDERS,
  PROVIDER_CREDENTIAL_STATUSES,
  type CredentialAuthorizationStatus,
  type ProviderCredentialStatus,
} from "@lcsp/contracts/github-integration";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type {
  CredentialAuthorizationRepository,
  CredentialAuthorizationRecord,
} from "../../application/ports/persistence/credential-authorization.repository.js";
import type {
  ProviderCredentialRecord,
  ProviderCredentialRepository,
} from "../../application/ports/persistence/provider-credential.repository.js";

@Injectable()
export class PrismaProviderCredentialRepository implements ProviderCredentialRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly client: Prisma.TransactionClient = prisma,
  ) {}

  withTransaction(
    transaction: Prisma.TransactionClient,
  ): PrismaProviderCredentialRepository {
    return new PrismaProviderCredentialRepository(this.prisma, transaction);
  }

  async create(record: ProviderCredentialRecord): Promise<void> {
    await this.client.providerCredential.create({
      data: {
        ...record,
        provider: PrismaCredentialProvider.GITHUB,
        status: toCredentialStatus(record.status),
      },
    });
  }

  async findByIdForOrganization(
    id: string,
    organizationId: string,
  ): Promise<ProviderCredentialRecord | null> {
    const row = await this.client.providerCredential.findFirst({
      where: { id, organizationId },
    });
    return row
      ? {
          id: row.id,
          provider: CREDENTIAL_PROVIDERS.github,
          organizationId: row.organizationId,
          ownerUserId: row.ownerUserId,
          providerAccountId: row.providerAccountId,
          providerLogin: row.providerLogin,
          status: fromCredentialStatus(row.status),
          currentVersion: row.currentVersion,
          declaredExpiresAt: row.declaredExpiresAt,
          validatedAt: row.validatedAt,
        }
      : null;
  }

  async updateLifecycle(
    id: string,
    organizationId: string,
    status: ProviderCredentialStatus,
    safeFailureCode?: string,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.client.providerCredential.updateMany({
      where: { id, organizationId },
      data: {
        status: toCredentialStatus(status),
        lastFailureCode: safeFailureCode,
        invalidatedAt:
          status === PROVIDER_CREDENTIAL_STATUSES.invalid ? now : undefined,
        revocationRequestedAt:
          status === PROVIDER_CREDENTIAL_STATUSES.revoking ? now : undefined,
        revokedAt:
          status === PROVIDER_CREDENTIAL_STATUSES.revoked ? now : undefined,
      },
    });
    return result.count === 1;
  }

  async updateVersion(
    id: string,
    organizationId: string,
    expectedVersion: number,
    newVersion: number,
  ): Promise<boolean> {
    const result = await this.client.providerCredential.updateMany({
      where: { id, organizationId, currentVersion: expectedVersion },
      data: { currentVersion: newVersion },
    });
    return result.count === 1;
  }

  async markValidated(
    id: string,
    organizationId: string,
    at: Date,
  ): Promise<boolean> {
    return (
      (
        await this.client.providerCredential.updateMany({
          where: { id, organizationId },
          data: { validatedAt: at },
        })
      ).count === 1
    );
  }

  async markUsed(
    id: string,
    organizationId: string,
    version: number,
    at: Date,
  ): Promise<boolean> {
    return (
      (
        await this.client.providerCredential.updateMany({
          where: { id, organizationId, currentVersion: version },
          data: { lastUsedAt: at },
        })
      ).count === 1
    );
  }
}

@Injectable()
export class PrismaCredentialAuthorizationRepository implements CredentialAuthorizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly client: Prisma.TransactionClient = prisma,
  ) {}

  withTransaction(
    transaction: Prisma.TransactionClient,
  ): PrismaCredentialAuthorizationRepository {
    return new PrismaCredentialAuthorizationRepository(
      this.prisma,
      transaction,
    );
  }

  async create(record: CredentialAuthorizationRecord): Promise<void> {
    await this.client.credentialAuthorization.create({
      data: { ...record, status: toAuthorizationStatus(record.status) },
    });
  }

  async findActiveForConnection(input: {
    connectionId: string;
    organizationId: string;
    repositoryFullName: string;
    assessmentId: string | null;
  }): Promise<CredentialAuthorizationRecord | null> {
    const row = await this.client.credentialAuthorization.findFirst({
      where: {
        organizationId: input.organizationId,
        repositoryFullName: input.repositoryFullName,
        status: PrismaAuthorizationStatus.ACTIVE,
        repositoryConnection: {
          is: { id: input.connectionId, organizationId: input.organizationId },
        },
        OR: [{ assessmentId: null }, { assessmentId: input.assessmentId }],
      },
    });
    return row ? authorizationRecord(row) : null;
  }

  async updateVersion(
    id: string,
    organizationId: string,
    expectedVersion: number,
    newVersion: number,
  ): Promise<boolean> {
    return (
      (
        await this.client.credentialAuthorization.updateMany({
          where: { id, organizationId, credentialVersion: expectedVersion },
          data: { credentialVersion: newVersion },
        })
      ).count === 1
    );
  }

  async revoke(id: string, organizationId: string, at: Date): Promise<boolean> {
    return (
      (
        await this.client.credentialAuthorization.updateMany({
          where: {
            id,
            organizationId,
            status: PrismaAuthorizationStatus.ACTIVE,
          },
          data: { status: PrismaAuthorizationStatus.REVOKED, revokedAt: at },
        })
      ).count === 1
    );
  }
}

function authorizationRecord(row: {
  id: string;
  providerCredentialId: string;
  organizationId: string;
  repositoryId: string;
  repositoryFullName: string;
  assessmentId: string | null;
  authorizedByUserId: string;
  status: PrismaAuthorizationStatus;
  credentialVersion: number;
  validatedAt: Date | null;
}): CredentialAuthorizationRecord {
  return { ...row, status: fromAuthorizationStatus(row.status) };
}

function toCredentialStatus(
  status: ProviderCredentialStatus,
): PrismaCredentialStatus {
  const values: Record<ProviderCredentialStatus, PrismaCredentialStatus> = {
    [PROVIDER_CREDENTIAL_STATUSES.pending]: PrismaCredentialStatus.PENDING,
    [PROVIDER_CREDENTIAL_STATUSES.active]: PrismaCredentialStatus.ACTIVE,
    [PROVIDER_CREDENTIAL_STATUSES.invalid]: PrismaCredentialStatus.INVALID,
    [PROVIDER_CREDENTIAL_STATUSES.expired]: PrismaCredentialStatus.EXPIRED,
    [PROVIDER_CREDENTIAL_STATUSES.revoking]: PrismaCredentialStatus.REVOKING,
    [PROVIDER_CREDENTIAL_STATUSES.revoked]: PrismaCredentialStatus.REVOKED,
    [PROVIDER_CREDENTIAL_STATUSES.storageError]:
      PrismaCredentialStatus.STORAGE_ERROR,
  };
  return values[status];
}
function fromCredentialStatus(
  status: PrismaCredentialStatus,
): ProviderCredentialStatus {
  const values: Record<PrismaCredentialStatus, ProviderCredentialStatus> = {
    [PrismaCredentialStatus.PENDING]: PROVIDER_CREDENTIAL_STATUSES.pending,
    [PrismaCredentialStatus.ACTIVE]: PROVIDER_CREDENTIAL_STATUSES.active,
    [PrismaCredentialStatus.INVALID]: PROVIDER_CREDENTIAL_STATUSES.invalid,
    [PrismaCredentialStatus.EXPIRED]: PROVIDER_CREDENTIAL_STATUSES.expired,
    [PrismaCredentialStatus.REVOKING]: PROVIDER_CREDENTIAL_STATUSES.revoking,
    [PrismaCredentialStatus.REVOKED]: PROVIDER_CREDENTIAL_STATUSES.revoked,
    [PrismaCredentialStatus.STORAGE_ERROR]:
      PROVIDER_CREDENTIAL_STATUSES.storageError,
  };
  return values[status];
}
function toAuthorizationStatus(
  status: CredentialAuthorizationStatus,
): PrismaAuthorizationStatus {
  const values: Record<
    CredentialAuthorizationStatus,
    PrismaAuthorizationStatus
  > = {
    [CREDENTIAL_AUTHORIZATION_STATUSES.active]:
      PrismaAuthorizationStatus.ACTIVE,
    [CREDENTIAL_AUTHORIZATION_STATUSES.revoking]:
      PrismaAuthorizationStatus.REVOKING,
    [CREDENTIAL_AUTHORIZATION_STATUSES.revoked]:
      PrismaAuthorizationStatus.REVOKED,
  };
  return values[status];
}
function fromAuthorizationStatus(
  status: PrismaAuthorizationStatus,
): CredentialAuthorizationStatus {
  const values: Record<
    PrismaAuthorizationStatus,
    CredentialAuthorizationStatus
  > = {
    [PrismaAuthorizationStatus.ACTIVE]:
      CREDENTIAL_AUTHORIZATION_STATUSES.active,
    [PrismaAuthorizationStatus.REVOKING]:
      CREDENTIAL_AUTHORIZATION_STATUSES.revoking,
    [PrismaAuthorizationStatus.REVOKED]:
      CREDENTIAL_AUTHORIZATION_STATUSES.revoked,
  };
  return values[status];
}
