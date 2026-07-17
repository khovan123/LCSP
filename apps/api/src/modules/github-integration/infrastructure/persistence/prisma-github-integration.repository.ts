import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { RepositoryConnectionRepository } from "../../application/ports/persistence/repository-connection.repository.js";
import { RepositoryConnection } from "../../domain/entities/repository-connection.entity.js";

@Injectable()
export class PrismaRepositoryConnectionRepository implements RepositoryConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(connection: RepositoryConnection): Promise<void> {
    await this.prisma.repositoryConnection.create({
      data: {
        id: connection.id,
        assessmentId: connection.assessmentId,
        organizationId: connection.organizationId,
        userId: connection.userId,
        installationId: connection.installationId,
        repositoryId: connection.repositoryId,
        repositoryName: connection.repositoryName,
        repositoryFullName: connection.repositoryFullName,
        defaultBranch: connection.defaultBranch,
        permissions: connection.permissions,
        status: connection.status,
        connectedAt: connection.connectedAt,
        revokedAt: connection.revokedAt,
      },
    });
  }
}
