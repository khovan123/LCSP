import { HttpStatus, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  RepositoryAuthenticationMode,
  RepositoryConnectionStatus,
} from "@prisma/client";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  CREDENTIAL_AUTHORIZATION_STATUSES,
  CREDENTIAL_PROVIDERS,
  GITHUB_INTEGRATION_ERROR_CODES,
  GITHUB_INTEGRATION_EVENT_TYPES,
  PROVIDER_CREDENTIAL_STATUSES,
  REPOSITORY_CONNECTION_STATUSES,
} from "@lcsp/contracts/github-integration";

import type { AppConfig } from "../../../../../config/config.types.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import type { GitHubCliRepositoryConnectionDto } from "../../contracts/github-integration/github-cli-connect.contract.js";
import {
  GITHUB_REPOSITORY_PROVIDER,
  type GitHubIdentity,
  type GitHubRepositoryMetadata,
  type GitHubRepositoryProviderPort,
} from "../../ports/github-repository-provider.port.js";
import type { CredentialStorageContext } from "../../ports/security/credential-store.port.js";
import { CredentialLease } from "../../security/credential-lease.js";
import { PrismaCredentialPersistenceUnitOfWork } from "../../../infrastructure/persistence/prisma-credential-persistence.unit-of-work.js";
import {
  assertCredential,
  GITHUB_REPOSITORY_PATTERN,
  mapProviderFailure,
} from "../github-cli-connect.support.js";
import { ConnectGitHubCliRepositoryCommand } from "./connect-github-cli-repository.command.js";

const INITIAL_CREDENTIAL_VERSION = 1;
const ENVELOPE_VERSION = 1;

@CommandHandler(ConnectGitHubCliRepositoryCommand)
export class ConnectGitHubCliRepositoryHandler implements ICommandHandler<ConnectGitHubCliRepositoryCommand> {
  constructor(
    @Inject(GITHUB_REPOSITORY_PROVIDER)
    private readonly provider: GitHubRepositoryProviderPort,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
    private readonly unitOfWork: PrismaCredentialPersistenceUnitOfWork,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(
    command: ConnectGitHubCliRepositoryCommand,
  ): Promise<GitHubCliRepositoryConnectionDto> {
    this.assertEnabledAndManager(command.subjectRole, command.correlationId);
    assertCredential(command.credential, command.correlationId);
    const repositoryFullName = command.repositoryFullName.trim();
    if (!GITHUB_REPOSITORY_PATTERN.test(repositoryFullName))
      this.invalid(command.correlationId);
    const declaredExpiresAt = this.parseExpiry(
      command.credentialExpiresAt,
      command.correlationId,
    );
    if (command.assessmentId) {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: command.assessmentId,
          organizationId: command.organizationId,
          ownerId: command.userId,
        },
        select: { id: true },
      });
      if (!assessment) this.invalid(command.correlationId);
    }

    const providerCredentialId = crypto.randomUUID();
    const lease = new CredentialLease(command.credential, {
      internalCredentialId: providerCredentialId,
      credentialVersion: INITIAL_CREDENTIAL_VERSION,
      repositoryFullName,
      expiresAt: new Date(
        Math.min(
          Date.now() + 2 * 60_000,
          declaredExpiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
        ),
      ),
    });
    try {
      const { identity, repository } = await this.validateProviderSource(
        lease,
        repositoryFullName,
        command.correlationId,
      );

      const duplicate = await this.prisma.repositoryConnection.findFirst({
        where: {
          organizationId: command.organizationId,
          userId: command.userId,
          repositoryId: repository.id,
          assessmentId: command.assessmentId ?? null,
          authenticationMode:
            RepositoryAuthenticationMode.GITHUB_CLI_CREDENTIAL,
          status: RepositoryConnectionStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (duplicate) {
        throw problemException(
          GITHUB_INTEGRATION_ERROR_CODES.connectionAlreadyExists,
          command.correlationId,
          { status: HttpStatus.CONFLICT },
        );
      }

      const authorizationId = crypto.randomUUID();
      const connectionId = crypto.randomUUID();
      const validatedAt = new Date();
      const storageContext: CredentialStorageContext = {
        provider: CREDENTIAL_PROVIDERS.github,
        providerCredentialId,
        organizationId: command.organizationId,
        ownerUserId: command.userId,
        credentialVersion: INITIAL_CREDENTIAL_VERSION,
        envelopeVersion: ENVELOPE_VERSION,
      };
      await this.unitOfWork.execute(async (transaction) => {
        await transaction.providerCredentials.create({
          id: providerCredentialId,
          provider: CREDENTIAL_PROVIDERS.github,
          organizationId: command.organizationId,
          ownerUserId: command.userId,
          providerAccountId: BigInt(identity.id),
          providerLogin: identity.login,
          status: PROVIDER_CREDENTIAL_STATUSES.active,
          currentVersion: INITIAL_CREDENTIAL_VERSION,
          declaredExpiresAt,
          validatedAt,
        });
        await transaction.credentialStore.store(
          command.credential,
          storageContext,
        );
        await transaction.authorizations.create({
          id: authorizationId,
          providerCredentialId,
          organizationId: command.organizationId,
          repositoryId: repository.id,
          repositoryFullName: repository.fullName,
          assessmentId: command.assessmentId ?? null,
          authorizedByUserId: command.userId,
          status: CREDENTIAL_AUTHORIZATION_STATUSES.active,
          credentialVersion: INITIAL_CREDENTIAL_VERSION,
          validatedAt,
        });
        await transaction.database.repositoryConnection.create({
          data: {
            id: connectionId,
            assessmentId: command.assessmentId ?? null,
            organizationId: command.organizationId,
            userId: command.userId,
            installationId: null,
            authenticationMode:
              RepositoryAuthenticationMode.GITHUB_CLI_CREDENTIAL,
            credentialAuthorizationId: authorizationId,
            repositoryId: repository.id,
            repositoryName: repository.name,
            repositoryFullName: repository.fullName,
            defaultBranch: repository.defaultBranch,
            permissions: {},
            status: RepositoryConnectionStatus.ACTIVE,
            connectedAt: validatedAt,
          },
        });
      });
      await this.auditWriter.write({
        eventType: GITHUB_INTEGRATION_EVENT_TYPES.cliRepositoryConnected,
        actorId: command.userId,
        organizationId: command.organizationId,
        assessmentId: command.assessmentId ?? null,
        resourceType: AUDIT_RESOURCE_TYPES.repositoryConnection,
        resourceId: connectionId,
        correlationId: command.correlationId,
        sessionId: command.sessionId,
        decision: AUDIT_DECISIONS.allow,
        payload: {
          repositoryId: repository.id,
          repositoryFullName: repository.fullName,
          providerAccountId: identity.id,
          providerLogin: identity.login,
        },
      });

      return {
        connection_id: connectionId,
        repository: {
          repository_id: repository.id,
          name: repository.name,
          full_name: repository.fullName,
          default_branch: repository.defaultBranch,
          private: repository.private,
        },
        authenticated_account: { id: identity.id, login: identity.login },
        connection_status: REPOSITORY_CONNECTION_STATUSES.active,
        credential_status: PROVIDER_CREDENTIAL_STATUSES.active,
        declared_expires_at: declaredExpiresAt?.toISOString() ?? null,
        connected_at: validatedAt.toISOString(),
      };
    } finally {
      lease.dispose();
    }
  }

  private assertEnabledAndManager(role: string, correlationId: string): void {
    if (
      !this.config.get("githubCredentialPersistence", { infer: true }).enabled
    ) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.cliConnectDisabled,
        correlationId,
        { status: HttpStatus.NOT_FOUND },
      );
    }
    if (role !== SUBJECT_ROLES.manager) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.connectionNotFound,
        correlationId,
        { status: HttpStatus.FORBIDDEN },
      );
    }
  }

  private async validateProviderSource(
    lease: CredentialLease,
    repositoryFullName: string,
    correlationId: string,
  ): Promise<{
    identity: GitHubIdentity;
    repository: GitHubRepositoryMetadata;
  }> {
    try {
      const identity = await this.provider.validateIdentity(lease);
      const repository = await this.provider.validateRepositoryAccess(
        lease,
        repositoryFullName,
      );
      if (
        repository.fullName !== repositoryFullName ||
        !repository.defaultBranch
      ) {
        this.invalid(correlationId);
      }
      await this.provider.resolveCommit(
        lease,
        repository.fullName,
        repository.defaultBranch,
      );
      return { identity, repository };
    } catch (error: unknown) {
      mapProviderFailure(error, correlationId);
    }
  }

  private parseExpiry(
    value: string | undefined,
    correlationId: string,
  ): Date | null {
    if (value === undefined) return null;
    const parsed = new Date(value);
    if (
      !/^\d{4}-\d{2}-\d{2}T/u.test(value) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.getTime() <= Date.now()
    ) {
      this.invalid(correlationId);
    }
    return parsed;
  }

  private invalid(correlationId: string): never {
    throw problemException(
      GITHUB_INTEGRATION_ERROR_CODES.credentialRequestInvalid,
      correlationId,
      { status: HttpStatus.BAD_REQUEST },
    );
  }
}
