import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

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
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(assessment: Assessment): Promise<void> {
    await this.prisma.assessment.upsert({
      where: { id: assessment.id },
      create: {
        id: assessment.id,
        organizationId: assessment.organizationId,
        ownerId: assessment.ownerId,
        name: assessment.name,
        description: assessment.description,
        status: assessment.status,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      },
      update: {
        name: assessment.name,
        description: assessment.description,
        status: assessment.status,
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
      ...(criteria.status ? { status: criteria.status } : {}),
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
      status: record.status as AssessmentStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
