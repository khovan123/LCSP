import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  GITHUB_INTEGRATION_ERROR_CODES,
  GITHUB_INTEGRATION_EVENT_TYPES,
  REPOSITORY_CONNECTION_STATUSES,
} from "@lcsp/contracts/github-integration";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { RepositorySnapshot } from "../../../domain/entities/repository-snapshot.entity.js";
import { GitHubAppClient } from "../../../infrastructure/github/github-app.client.js";
import type { PinSnapshotDto } from "../../contracts/github-integration/pin-snapshot.contract.js";
import {
  REPOSITORY_CONNECTION_REPOSITORY,
  type RepositoryConnectionRepository,
} from "../../ports/persistence/repository-connection.repository.js";
import {
  REPOSITORY_SNAPSHOT_REPOSITORY,
  type RepositorySnapshotRepository,
} from "../../ports/persistence/repository-snapshot.repository.js";
import { PinSnapshotCommand } from "./pin-snapshot.command.js";

@CommandHandler(PinSnapshotCommand)
export class PinSnapshotHandler implements ICommandHandler<PinSnapshotCommand> {
  constructor(
    @Inject(REPOSITORY_CONNECTION_REPOSITORY)
    private readonly connectionRepository: RepositoryConnectionRepository,
    @Inject(REPOSITORY_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepository: RepositorySnapshotRepository,
    private readonly githubAppClient: GitHubAppClient,
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(command: PinSnapshotCommand): Promise<PinSnapshotDto> {
    const connectionId = clean(command.connectionId);
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: command.assessmentId },
      select: { id: true, organizationId: true, ownerId: true },
    });
    const connection = connectionId
      ? await this.connectionRepository.findById(connectionId)
      : null;

    if (
      !assessment ||
      assessment.organizationId !== command.organizationId ||
      !connection ||
      connection.organizationId !== command.organizationId ||
      connection.status !== REPOSITORY_CONNECTION_STATUSES.active ||
      (connection.assessmentId !== null &&
        connection.assessmentId !== command.assessmentId)
    ) {
      await this.auditDenied(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.connectionNotFound,
      );
      throw new NotFoundException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.connectionNotFound,
        correlation_id: command.correlationId,
      });
    }

    const isManagerOwner =
      command.subjectRole === SUBJECT_ROLES.manager &&
      assessment.ownerId === command.actorId;
    const isScopedDeveloper =
      command.subjectRole === SUBJECT_ROLES.developer &&
      command.scope === command.assessmentId;
    if (!isManagerOwner && !isScopedDeveloper) {
      await this.auditDenied(command, AUTH_ERROR_CODES.pbacDenied);
      throw new ForbiddenException({
        error_code: AUTH_ERROR_CODES.pbacDenied,
        correlation_id: command.correlationId,
      });
    }

    const branch = clean(command.branch);
    const ref = clean(command.ref);
    const commitSha = clean(command.commitSha);
    if (commitSha && !/^[0-9a-f]{40}$/i.test(commitSha)) {
      await this.auditDenied(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.refNotResolvable,
      );
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.refNotResolvable,
        correlation_id: command.correlationId,
      });
    }
    const revision = commitSha ?? ref ?? branch ?? connection.defaultBranch;

    let resolved: Awaited<ReturnType<GitHubAppClient["resolveCommit"]>>;
    try {
      resolved = await this.githubAppClient.resolveCommit({
        installationId: connection.installationId,
        repositoryFullName: connection.repositoryFullName,
        revision,
      });
    } catch {
      await this.auditDenied(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.refNotResolvable,
      );
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.refNotResolvable,
        correlation_id: command.correlationId,
      });
    }

    if (resolved.repositoryFullName !== connection.repositoryFullName) {
      await this.auditDenied(
        command,
        GITHUB_INTEGRATION_ERROR_CODES.refOutOfScope,
      );
      throw new BadRequestException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.refOutOfScope,
        correlation_id: command.correlationId,
      });
    }

    const snapshot = RepositorySnapshot.create({
      assessmentId: command.assessmentId,
      organizationId: command.organizationId,
      connectionId: connection.id,
      repositoryId: connection.repositoryId,
      repositoryFullName: connection.repositoryFullName,
      branch,
      ref,
      commitSha: resolved.sha,
      providerMetadata: {
        authorDate: resolved.authorDate,
        committerDate: resolved.committerDate,
        htmlUrl: resolved.htmlUrl,
        requestedRevision: revision,
      },
      actorId: command.actorId,
    });

    await this.snapshotRepository.saveWithCreatedEvent(snapshot, {
      aggregateType: "RepositorySnapshot",
      aggregateId: snapshot.id,
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.snapshotCreated,
      payload: {
        snapshotId: snapshot.id,
        assessmentId: snapshot.assessmentId,
        commitSha: snapshot.commitSha,
        connectionId: snapshot.connectionId,
        correlationId: command.correlationId,
      },
    });

    await this.auditWriter.write({
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.snapshotCreatedAudit,
      actorId: command.actorId,
      organizationId: command.organizationId,
      resourceType: "RepositorySnapshot",
      resourceId: snapshot.id,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.allow,
      payload: {
        snapshotId: snapshot.id,
        assessmentId: snapshot.assessmentId,
        commitSha: snapshot.commitSha,
        connectionId: snapshot.connectionId,
        correlationId: command.correlationId,
      },
    });

    return {
      snapshot_id: snapshot.id,
      repository_full_name: snapshot.repositoryFullName,
      commit_sha: snapshot.commitSha,
      branch: snapshot.branch,
      status: snapshot.status,
      created_at: snapshot.createdAt.toISOString(),
      correlation_id: command.correlationId,
    };
  }

  private async auditDenied(
    command: PinSnapshotCommand,
    reasonCode: string,
  ): Promise<void> {
    await this.auditWriter.write({
      eventType: GITHUB_INTEGRATION_EVENT_TYPES.snapshotPinFailedAudit,
      actorId: command.actorId,
      organizationId: command.organizationId,
      resourceType: "RepositoryConnection",
      resourceId: clean(command.connectionId) ?? command.assessmentId,
      correlationId: command.correlationId,
      decision: AUDIT_DECISIONS.deny,
      payload: {
        assessmentId: command.assessmentId,
        connectionId: command.connectionId,
        reasonCode,
        correlationId: command.correlationId,
      },
    });
  }
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
