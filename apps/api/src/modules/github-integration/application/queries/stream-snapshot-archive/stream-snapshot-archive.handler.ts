import {
  BadGatewayException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import {
  GITHUB_INTEGRATION_ERROR_CODES,
  REPOSITORY_CONNECTION_STATUSES,
  REPOSITORY_SCAN_JOB_STATUSES,
} from "@lcsp/contracts/github-integration";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { StreamSnapshotArchiveQuery } from "./stream-snapshot-archive.query.js";
import { GitHubAppClient } from "../../../infrastructure/github/github-app.client.js";

type SnapshotScanJobRecord = {
  id: string;
  snapshotId: string;
  organizationId: string;
  status: string;
};

type RepositorySnapshotRecord = {
  id: string;
  organizationId: string;
  connectionId: string;
  repositoryFullName: string;
  commitSha: string;
  status: string;
};

type RepositoryConnectionRecord = {
  id: string;
  installationId: string;
  organizationId: string;
  status: string;
};

export type SnapshotArchiveStreamResult = {
  snapshotId: string;
  commitSha: string;
  repositoryFullName: string;
  contentType: string;
  resolvedUrl: string;
  stream: NodeJS.ReadableStream;
};

@QueryHandler(StreamSnapshotArchiveQuery)
export class StreamSnapshotArchiveHandler implements IQueryHandler<StreamSnapshotArchiveQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubAppClient: GitHubAppClient,
  ) {}

  async execute(
    query: StreamSnapshotArchiveQuery,
  ): Promise<SnapshotArchiveStreamResult> {
    const scanJob = await this.prisma.repositoryScanJob.findUnique({
      where: { id: query.scanJobId },
      select: {
        id: true,
        snapshotId: true,
        organizationId: true,
        status: true,
      },
    });

    if (!scanJob || scanJob.snapshotId !== query.snapshotId) {
      throw new ConflictException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotScanMismatch,
        correlation_id: query.correlationId,
      });
    }

    if (
      scanJob.status !== REPOSITORY_SCAN_JOB_STATUSES.queued &&
      scanJob.status !== REPOSITORY_SCAN_JOB_STATUSES.running
    ) {
      throw new ConflictException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotScanMismatch,
        correlation_id: query.correlationId,
      });
    }

    const snapshot = await this.prisma.repositorySnapshot.findUnique({
      where: { id: query.snapshotId },
      select: {
        id: true,
        organizationId: true,
        connectionId: true,
        repositoryFullName: true,
        commitSha: true,
        status: true,
      },
    });

    if (!snapshot || snapshot.organizationId !== scanJob.organizationId) {
      throw new NotFoundException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        correlation_id: query.correlationId,
      });
    }

    const connection = await this.prisma.repositoryConnection.findUnique({
      where: { id: snapshot.connectionId },
      select: {
        id: true,
        installationId: true,
        organizationId: true,
        status: true,
      },
    });

    if (
      !connection ||
      connection.organizationId !== snapshot.organizationId ||
      connection.status !== REPOSITORY_CONNECTION_STATUSES.active
    ) {
      throw new NotFoundException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotNotFound,
        correlation_id: query.correlationId,
      });
    }

    try {
      const archive = await this.githubAppClient.downloadRepositoryArchive({
        installationId: connection.installationId,
        repositoryFullName: snapshot.repositoryFullName,
        commitSha: snapshot.commitSha,
      });

      return {
        snapshotId: snapshot.id,
        commitSha: snapshot.commitSha,
        repositoryFullName: snapshot.repositoryFullName,
        contentType: archive.contentType,
        resolvedUrl: archive.resolvedUrl,
        stream: archive.stream,
      };
    } catch (error) {
      const reason = (error as Error).message;
      if (reason === "github_repository_archive_redirect_rejected") {
        throw new BadGatewayException({
          error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotRetrievalFailed,
          correlation_id: query.correlationId,
        });
      }

      throw new BadGatewayException({
        error_code: GITHUB_INTEGRATION_ERROR_CODES.snapshotRetrievalFailed,
        correlation_id: query.correlationId,
      });
    }
  }
}
