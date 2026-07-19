import { NotFoundException } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import {
  REPOSITORY_SCAN_JOB_STATUSES,
  type RepositoryScanJobStatus,
  type RepositoryScanTriggerSource,
} from "@lcsp/contracts/github-integration";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { SCAN_ERROR_CODES, SCAN_JOB_GUIDANCE } from "@lcsp/contracts/scan";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import type { ScanJobStatusDto } from "../../contracts/scan/scan-job-status.contract.js";
import { GetScanJobQuery } from "./get-scan-job.query.js";

@QueryHandler(GetScanJobQuery)
export class GetScanJobHandler implements IQueryHandler<GetScanJobQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetScanJobQuery): Promise<ScanJobStatusDto> {
    if (
      query.subjectRole === SUBJECT_ROLES.developer &&
      query.scope !== query.assessmentId
    ) {
      this.notFound(query.correlationId);
    }

    const job = await this.prisma.repositoryScanJob.findFirst({
      where: {
        id: query.scanJobId,
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
      },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        triggerSource: true,
        attemptCount: true,
        createdAt: true,
        updatedAt: true,
        correlationId: true,
      },
    });

    if (!job) {
      this.notFound(query.correlationId);
    }

    const status = job.status as RepositoryScanJobStatus;
    return {
      scan_job_id: job.id,
      assessment_id: job.assessmentId,
      status,
      trigger_source: job.triggerSource as RepositoryScanTriggerSource,
      attempt_count: job.attemptCount,
      blocked_reason:
        status === REPOSITORY_SCAN_JOB_STATUSES.blocked
          ? SCAN_JOB_GUIDANCE.blockedReason
          : null,
      next_action: nextActionFor(status),
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString(),
      correlation_id: job.correlationId,
    };
  }

  private notFound(correlationId: string): never {
    throw new NotFoundException({
      error_code: SCAN_ERROR_CODES.jobNotFound,
      correlation_id: correlationId,
    });
  }
}

function nextActionFor(status: RepositoryScanJobStatus): string | null {
  switch (status) {
    case REPOSITORY_SCAN_JOB_STATUSES.queued:
      return SCAN_JOB_GUIDANCE.queuedNextAction;
    case REPOSITORY_SCAN_JOB_STATUSES.running:
      return SCAN_JOB_GUIDANCE.runningNextAction;
    case REPOSITORY_SCAN_JOB_STATUSES.failed:
      return SCAN_JOB_GUIDANCE.failedNextAction;
    case REPOSITORY_SCAN_JOB_STATUSES.blocked:
      return SCAN_JOB_GUIDANCE.blockedNextAction;
    case REPOSITORY_SCAN_JOB_STATUSES.completed:
      return null;
  }
}
