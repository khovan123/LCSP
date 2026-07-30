import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AssessmentStatus as PrismaAssessmentStatus } from "@prisma/client";

import {
  fromPrismaAssessmentStatus,
  toPrismaAssessmentStatus,
} from "../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type {
  AssessmentListCriteria,
  AssessmentListResult,
  AssessmentRepository,
} from "../../application/ports/persistence/assessment.repository.js";
import { Assessment } from "../../domain/entities/assessment.entity.js";
import type { AssessmentStatus } from "../../domain/entities/assessment.entity.js";

type AssessmentRecord = {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: PrismaAssessmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(assessment: Assessment): Promise<void> {
    await this.saveWithClient(this.prisma, assessment);
  }

  async saveInTx(
    assessment: Assessment,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.saveWithClient(tx, assessment);
  }

  private async saveWithClient(
    client: Prisma.TransactionClient,
    assessment: Assessment,
  ): Promise<void> {
    await client.assessment.upsert({
      where: { id: assessment.id },
      create: {
        id: assessment.id,
        organizationId: assessment.organizationId,
        ownerId: assessment.ownerId,
        name: assessment.name,
        description: assessment.description,
        status: toPrismaAssessmentStatus(assessment.status),
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      },
      update: {
        name: assessment.name,
        description: assessment.description,
        status: toPrismaAssessmentStatus(assessment.status),
      },
    });
  }

  async findById(id: string): Promise<Assessment | null> {
    const record = await this.prisma.assessment.findUnique({ where: { id } });

    return record ? this.toDomain(record) : null;
  }

  async findMany(
    criteria: AssessmentListCriteria,
  ): Promise<AssessmentListResult> {
    const where: Prisma.AssessmentWhereInput = {
      organizationId: criteria.organizationId,
      ...(criteria.ownerId ? { ownerId: criteria.ownerId } : {}),
      ...(criteria.assessmentId ? { id: criteria.assessmentId } : {}),
      ...(criteria.status
        ? { status: toPrismaAssessmentStatus(criteria.status) }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
    };
  }

  private toDomain(record: AssessmentRecord): Assessment {
    return Assessment.rehydrate({
      id: record.id,
      organizationId: record.organizationId,
      ownerId: record.ownerId,
      name: record.name,
      description: record.description,
      status: fromPrismaAssessmentStatus(record.status),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
