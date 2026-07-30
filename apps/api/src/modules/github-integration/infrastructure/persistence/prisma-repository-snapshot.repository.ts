import { Injectable } from "@nestjs/common";

import type { OutboxMessageInput } from "@lcsp/contracts/outbox";

import { toPrismaRepositorySnapshotStatus } from "../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { OutboxRepository } from "../../../../platform/outbox/outbox.repository.js";
import type { RepositorySnapshotRepository } from "../../application/ports/persistence/repository-snapshot.repository.js";
import type { RepositorySnapshot } from "../../domain/entities/repository-snapshot.entity.js";

@Injectable()
export class PrismaRepositorySnapshotRepository implements RepositorySnapshotRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async saveWithCreatedEvent(
    snapshot: RepositorySnapshot,
    event: OutboxMessageInput,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.repositorySnapshot.create({
        data: {
          id: snapshot.id,
          assessmentId: snapshot.assessmentId,
          organizationId: snapshot.organizationId,
          connectionId: snapshot.connectionId,
          repositoryId: snapshot.repositoryId,
          repositoryFullName: snapshot.repositoryFullName,
          branch: snapshot.branch,
          ref: snapshot.ref,
          commitSha: snapshot.commitSha,
          providerMetadata: snapshot.providerMetadata,
          actorId: snapshot.actorId,
          status: toPrismaRepositorySnapshotStatus(snapshot.status),
          createdAt: snapshot.createdAt,
        },
      });
      await this.outbox.enqueue(event, tx);
    });
  }
}
