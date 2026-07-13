import { Inject, NotFoundException } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import type { IQueryHandler } from "@nestjs/cqrs";

import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import {
  ASSESSMENT_REPOSITORY,
  type AssessmentRepository,
} from "../../ports/persistence/assessment.repository.js";
import type {
  AssessmentDetailDto,
  ReadinessState,
  WizardStatus,
} from "../../contracts/assessment/assessment-detail.contract.js";
import { GetAssessmentQuery } from "./get-assessment.query.js";

@QueryHandler(GetAssessmentQuery)
export class GetAssessmentHandler implements IQueryHandler<GetAssessmentQuery> {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(query: GetAssessmentQuery): Promise<AssessmentDetailDto> {
    const assessment = await this.assessmentRepository.findById(
      query.assessmentId,
    );

    if (!assessment || assessment.organizationId !== query.organizationId) {
      this.throwNotFound(query.correlationId);
    }

    if (
      query.subjectRole === "Manager" &&
      assessment.ownerId !== query.sessionUserId
    ) {
      this.throwNotFound(query.correlationId);
    }

    const wizardProfile = await this.prisma.wizardProfile.findUnique({
      where: { assessmentId: assessment.id },
    });
    const wizardStatus: WizardStatus = wizardProfile
      ? (wizardProfile.status as WizardStatus)
      : "NOT_STARTED";

    // classification_locked is unconditionally true until MW-evid-001 (Get Technical
    // Evidence Report Endpoint) creates TechnicalEvidenceReport — there is no accepted
    // report to check yet, so "locked" is the only correct answer, not a placeholder.
    const readinessState: ReadinessState = {
      classification_locked: true,
      lock_reason: "LOCKED_EVIDENCE_REQUIRED",
      missing_evidence: ["technical_evidence_report"],
    };

    return {
      assessment_id: assessment.id,
      name: assessment.name,
      status: assessment.status,
      owner_id: assessment.ownerId,
      organization_id: assessment.organizationId,
      wizard_status: wizardStatus,
      readiness_state: readinessState,
      next_action: nextActionFor(wizardStatus),
      created_at: assessment.createdAt.toISOString(),
      updated_at: assessment.updatedAt.toISOString(),
      correlation_id: query.correlationId,
    };
  }

  private throwNotFound(correlationId: string): never {
    throw new NotFoundException({
      error_code: ASSESSMENT_ERROR_CODES.notFound,
      correlation_id: correlationId,
    });
  }
}

function nextActionFor(wizardStatus: WizardStatus): string {
  switch (wizardStatus) {
    case "NOT_STARTED":
      return "Start the Wizard to describe how this AI system is used.";
    case "IN_PROGRESS":
      return "Continue the Wizard to complete your assessment.";
    case "SUBMITTED":
      return "Waiting for technical evidence before classification can proceed.";
    default:
      return "Continue the Wizard to complete your assessment.";
  }
}
