import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { AssessmentRepository } from "../../application/ports/persistence/assessment.repository.js";
import { Assessment } from "../../domain/entities/assessment.entity.js";
import type { AssessmentStatus } from "../../domain/entities/assessment.entity.js";

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

    if (!record) {
      return null;
    }

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
