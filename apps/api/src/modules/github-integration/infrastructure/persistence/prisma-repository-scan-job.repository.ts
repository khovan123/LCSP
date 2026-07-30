import { Injectable } from "@nestjs/common";

import type { OutboxMessageInput } from "@lcsp/contracts/outbox";

import {
  fromPrismaRepositoryScanJobStatus,
  fromPrismaRepositoryScanTriggerSource,
  toPrismaRepositoryScanJobStatus,
  toPrismaRepositoryScanTriggerSource,
} from "../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { OutboxRepository } from "../../../../platform/outbox/outbox.repository.js";
import type { RepositoryScanJobRepository } from "../../application/ports/persistence/repository-scan-job.repository.js";
import { RepositoryScanJob } from "../../domain/entities/repository-scan-job.entity.js";

@Injectable()
export class PrismaRepositoryScanJobRepository implements RepositoryScanJobRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async findByIdempotencyKey(key: string): Promise<RepositoryScanJob | null> {
    const record = await this.prisma.repositoryScanJob.findUnique({
      where: { idempotencyKey: key },
    });
    if (!record) return null;
    return RepositoryScanJob.rehydrate({
      ...record,
      triggerSource: fromPrismaRepositoryScanTriggerSource(
        record.triggerSource,
      ),
      status: fromPrismaRepositoryScanJobStatus(record.status),
    });
  }

  async saveWithTriggeredEvent(
    job: RepositoryScanJob,
    event: OutboxMessageInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.repositoryScanJob.create({
        data: {
          id: job.id,
          assessmentId: job.assessmentId,
          snapshotId: job.snapshotId,
          organizationId: job.organizationId,
          idempotencyKey: job.idempotencyKey,
          triggerSource: toPrismaRepositoryScanTriggerSource(job.triggerSource),
          status: toPrismaRepositoryScanJobStatus(job.status),
          attemptCount: job.attemptCount,
          correlationId: job.correlationId,
          blockedReason: job.blockedReason,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        },
      });
      await this.outbox.enqueue(event, tx);
    });
  }
}
