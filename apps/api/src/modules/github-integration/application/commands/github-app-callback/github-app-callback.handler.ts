import { BadRequestException, Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
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
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.githubStateInvalid,
        correlation_id: command.correlationId,
      });
    }

    await this.installStateRepository.deleteById(installState.id);

    if (installState.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.githubStateInvalid,
        correlation_id: command.correlationId,
      });
    }

    let accessToken: string;
    try {
      accessToken = await this.githubAppClient.exchangeCodeForAccessToken(
        command.code,
      );
    } catch {
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.githubCallbackInvalid,
        correlation_id: command.correlationId,
      });
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
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.githubCallbackInvalid,
        correlation_id: command.correlationId,
      });
    }

    if (metadata.permissions.contents !== "read") {
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.permissionsInsufficient,
        correlation_id: command.correlationId,
      });
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
      eventType: "GITHUB_APP_CONNECTED",
      actorId: installState.userId,
      organizationId: installState.organizationId,
      resourceType: "RepositoryConnection",
      resourceId: connection.id,
      correlationId: command.correlationId,
      decision: "allow",
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
