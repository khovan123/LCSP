import { HttpStatus, Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  GITHUB_INTEGRATION_EVENT_TYPES,
  GITHUB_REPOSITORY_PERMISSION_LEVELS,
} from "@lcsp/contracts/github-integration";

import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { RepositoryConnection } from "../../../domain/entities/repository-connection.entity.js";
import {
  GITHUB_APP_INSTALL_STATE_REPOSITORY,
  type GitHubAppInstallStateRepository,
} from "../../ports/persistence/github-app-install-state.repository.js";
import {
  REPOSITORY_CONNECTION_REPOSITORY,
  type RepositoryConnectionRepository,
} from "../../ports/persistence/repository-connection.repository.js";
import { GITHUB_INTEGRATION_ERROR_CODES } from "../../contracts/github-integration/github-app-callback.contract.js";
import type { GitHubAppCallbackDto } from "../../contracts/github-integration/github-app-callback.contract.js";
import { GitHubAppClient } from "../../../infrastructure/github/github-app.client.js";
import { GitHubAppCallbackCommand } from "./github-app-callback.command.js";

@CommandHandler(GitHubAppCallbackCommand)
export class GitHubAppCallbackHandler implements ICommandHandler<GitHubAppCallbackCommand> {
  constructor(
    @Inject(GITHUB_APP_INSTALL_STATE_REPOSITORY)
    private readonly installStateRepository: GitHubAppInstallStateRepository,
    @Inject(REPOSITORY_CONNECTION_REPOSITORY)
    private readonly repositoryConnectionRepository: RepositoryConnectionRepository,
    private readonly githubAppClient: GitHubAppClient,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(
    command: GitHubAppCallbackCommand,
  ): Promise<GitHubAppCallbackDto> {
    const installState = await this.installStateRepository.findByState(
      command.state,
    );
    if (!installState) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.githubStateInvalid,
        command.correlationId,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    await this.installStateRepository.deleteById(installState.id);

    if (installState.expiresAt.getTime() < Date.now()) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.githubStateInvalid,
        command.correlationId,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    let accessToken: string;
    try {
      accessToken = await this.githubAppClient.exchangeCodeForAccessToken(
        command.code,
      );
    } catch {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.githubCallbackInvalid,
        command.correlationId,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    let metadata: Awaited<
      ReturnType<GitHubAppClient["fetchInstallationMetadata"]>
    >;
    try {
      metadata = await this.githubAppClient.fetchInstallationMetadata({
        installationId: command.installationId,
        accessToken,
      });
    } catch {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.githubCallbackInvalid,
        command.correlationId,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    if (
      metadata.permissions.contents !== GITHUB_REPOSITORY_PERMISSION_LEVELS.read
    ) {
      throw problemException(
        GITHUB_INTEGRATION_ERROR_CODES.permissionsInsufficient,
        command.correlationId,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    const connection = RepositoryConnection.create({
      assessmentId: installState.assessmentId,
      organizationId: installState.organizationId,
      userId: installState.userId,
      installationId: command.installationId,
      repositoryId: metadata.repository.id,
      repositoryName: metadata.repository.name,
      repositoryFullName: metadata.repository.fullName,
      defaultBranch: metadata.repository.defaultBranch,
      permissions: metadata.permissions,
    });
    await this.repositoryConnectionRepository.save(connection);

    await this.auditWriter.write({
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.appConnected,
      actorId: installState.userId,
      organizationId: installState.organizationId,
      resourceType: AUDIT_RESOURCE_TYPES.repositoryConnection,
      resourceId: connection.id,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      payload: {
        connectionId: connection.id,
        repositoryFullName: connection.repositoryFullName,
        organizationId: installState.organizationId,
        userId: installState.userId,
        correlationId: command.correlationId,
      },
    });

    return {
      connection_id: connection.id,
      repository_name: connection.repositoryName,
      repository_full_name: connection.repositoryFullName,
      default_branch: connection.defaultBranch,
      status: connection.status,
      correlation_id: command.correlationId,
    };
  }
}
