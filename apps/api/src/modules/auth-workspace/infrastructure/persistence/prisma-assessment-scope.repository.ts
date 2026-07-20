import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type {
  AssessmentScopeDisplay,
  AssessmentScopeRepository,
} from "../../application/ports/persistence/assessment-scope.repository.ts";

@Injectable()
export class PrismaAssessmentScopeRepository implements AssessmentScopeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async belongsToOrganization(
    assessmentId: string,
    organizationId: string,
  ): Promise<boolean> {
    const count = await this.prisma.assessment.count({
      where: { id: assessmentId, organizationId },
    });
    return count === 1;
  }

  findDisplayByIdAndOrganization(
    assessmentId: string,
    organizationId: string,
  ): Promise<AssessmentScopeDisplay | null> {
    return this.prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      select: { id: true, organizationId: true, name: true },
    });
  }
}
