import { Inject, NotFoundException } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import type { IQueryHandler } from "@nestjs/cqrs";

import {
  ASSESSMENT_ERROR_CODES,
  ASSESSMENT_LOCK_REASONS,
  ASSESSMENT_MISSING_EVIDENCE_CODES,
  ASSESSMENT_NEXT_ACTION_KEYS,
  WIZARD_STATUS_CODES,
  type AssessmentNextActionKey,
} from "@lcsp/contracts/assessment";
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
      query.subjectRole === SUBJECT_ROLES.manager &&
      assessment.ownerId !== query.sessionUserId
    ) {
      this.throwNotFound(query.correlationId);
    }

    const wizardProfile = await this.prisma.wizardProfile.findUnique({
      where: { assessmentId: assessment.id },
    });
    const wizardStatus: WizardStatus = wizardProfile
      ? (wizardProfile.status as WizardStatus)
      : WIZARD_STATUS_CODES.notStarted;

    // classification_locked is unconditionally true until MW-evid-001 (Get Technical
    // Evidence Report Endpoint) creates TechnicalEvidenceReport — there is no accepted
    // report to check yet, so "locked" is the only correct answer, not a placeholder.
    const readinessState: ReadinessState = {
      classification_locked: true,
      lock_reason: ASSESSMENT_LOCK_REASONS.evidenceRequired,
      missing_evidence: [
        ASSESSMENT_MISSING_EVIDENCE_CODES.technicalEvidenceReport,
      ],
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

function nextActionFor(wizardStatus: WizardStatus): AssessmentNextActionKey {
  switch (wizardStatus) {
    case WIZARD_STATUS_CODES.notStarted:
      return ASSESSMENT_NEXT_ACTION_KEYS.wizardNotStarted;
    case WIZARD_STATUS_CODES.inProgress:
      return ASSESSMENT_NEXT_ACTION_KEYS.wizardInProgress;
    case WIZARD_STATUS_CODES.submitted:
      return ASSESSMENT_NEXT_ACTION_KEYS.wizardSubmitted;
    default:
      return ASSESSMENT_NEXT_ACTION_KEYS.wizardInProgress;
  }
}
