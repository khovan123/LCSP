import { BadRequestException, Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import { ConfigService } from "@nestjs/config";

import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import { GITHUB_INTEGRATION_ERROR_CODES } from "@lcsp/contracts/github-integration";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GitHubAppInstallState } from "../../../domain/entities/github-app-install-state.entity.js";
import { GitHubAppClient } from "../../../infrastructure/github/github-app.client.js";
import {
  GITHUB_APP_INSTALL_STATE_REPOSITORY,
  type GitHubAppInstallStateRepository,
} from "../../ports/persistence/github-app-install-state.repository.js";
import type { GitHubAppStartDto } from "../../contracts/github-integration/github-app-start.contract.js";
import { GitHubAppStartCommand } from "./github-app-start.command.js";

const INSTALL_STATE_TTL_MS = 10 * 60_000;

@CommandHandler(GitHubAppStartCommand)
export class GitHubAppStartHandler implements ICommandHandler<GitHubAppStartCommand> {
  constructor(
    @Inject(GITHUB_APP_INSTALL_STATE_REPOSITORY)
    private readonly installStateRepository: GitHubAppInstallStateRepository,
    private readonly githubAppClient: GitHubAppClient,
    private readonly auditWriter: AuditWriterService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: GitHubAppStartCommand): Promise<GitHubAppStartDto> {
    const redirectUri = command.redirectUri?.trim();
    const allowedRedirectUris = this.configService.get<string[]>(
      "github.allowedRedirectUris",
      [],
    );

    if (!redirectUri || !allowedRedirectUris.includes(redirectUri)) {
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.invalidRedirectUri,
        correlation_id: command.correlationId,
      });
    }

    if (command.assessmentId) {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: command.assessmentId },
      });

      if (!assessment || assessment.organizationId !== command.organizationId) {
        throw new BadRequestException({
          error_code: ASSESSMENT_ERROR_CODES.notFound,
          correlation_id: command.correlationId,
        });
      }
    }

    const installState = GitHubAppInstallState.create({
      organizationId: command.organizationId,
      userId: command.userId,
      redirectUri,
      assessmentId: command.assessmentId ?? null,
      ttlMs: INSTALL_STATE_TTL_MS,
    });
    await this.installStateRepository.save(installState);

    const installationUrl = this.githubAppClient.buildInstallationUrl({
      state: installState.state,
      redirectUri,
    });

    await this.auditWriter.write({
      eventType: "GITHUB_APP_INSTALL_STARTED",
      actorId: command.userId,
      organizationId: command.organizationId,
      resourceType: "GitHubAppInstallState",
      resourceId: installState.id,
      correlationId: command.correlationId,
      decision: "allow",
      payload: {
        userId: command.userId,
        organizationId: command.organizationId,
        assessmentId: command.assessmentId ?? null,
        correlationId: command.correlationId,
      },
    });

    return {
      installation_url: installationUrl,
      correlation_id: command.correlationId,
    };
  }
}
