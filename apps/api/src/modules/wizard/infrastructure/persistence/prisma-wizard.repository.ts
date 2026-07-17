import { Injectable } from "@nestjs/common";
import type { PersistedWizardStatusCode } from "@lcsp/contracts/assessment";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { WizardProfileRepository } from "../../application/ports/persistence/wizard-profile.repository.js";
import { WizardProfileEntity } from "../../domain/entities/wizard-profile.entity.js";

@Injectable()
export class PrismaWizardRepository implements WizardProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async verifyAssessmentOwnership(
    assessmentId: string,
    orgId: string,
    ownerId: string,
  ): Promise<boolean> {
    const count = await this.prisma.assessment.count({
      where: {
        id: assessmentId,
        organizationId: orgId,
        ownerId: ownerId,
      },
    });
    return count > 0;
  }

  async findByAssessmentId(
    assessmentId: string,
  ): Promise<WizardProfileEntity | null> {
    const data = await this.prisma.wizardProfile.findUnique({
      where: { assessmentId },
    });
    if (!data) return null;
    return new WizardProfileEntity({
      id: data.id,
      assessmentId: data.assessmentId,
      organizationId: data.organizationId,
      ownerId: data.ownerId,
      version: data.version,
      status: data.status as PersistedWizardStatusCode,
      answers: data.answers as Record<string, any>,
      submittedAt: data.submittedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async upsertDraft(
    profile: WizardProfileEntity,
  ): Promise<WizardProfileEntity> {
    const data = await this.prisma.wizardProfile.upsert({
      where: { assessmentId: profile.assessmentId },
      update: {
        answers: profile.answers ?? {},
        version: profile.version,
        status: profile.status,
      },
      create: {
        id: profile.id, // Or let DB generate UUID if omitted, but Prisma upsert requires ID or will generate if it's in the schema. Assuming schema provides @default(uuid()).
        assessmentId: profile.assessmentId,
        organizationId: profile.organizationId,
        ownerId: profile.ownerId,
        version: profile.version,
        status: profile.status,
        answers: profile.answers ?? {},
      },
    });

    return new WizardProfileEntity({
      id: data.id,
      assessmentId: data.assessmentId,
      organizationId: data.organizationId,
      ownerId: data.ownerId,
      version: data.version,
      status: data.status as PersistedWizardStatusCode,
      answers: data.answers as Record<string, any>,
      submittedAt: data.submittedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
