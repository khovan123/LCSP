import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { ForbiddenException } from "@nestjs/common";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { GetReadinessQuery } from "./get-readiness.query.js";
import type { ReadinessResponse } from "../../contracts/wizard/readiness.contract.js";
import { AssessmentNotFoundException } from "../../../domain/exceptions/wizard.exceptions.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { ReadinessEvaluatorService } from "../../services/wizard/readiness-evaluator.service.js";
import { WIZARD_STATUS_CODES } from "@lcsp/contracts/assessment";

@QueryHandler(GetReadinessQuery)
export class GetReadinessHandler
  implements IQueryHandler<GetReadinessQuery, ReadinessResponse>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly readinessEvaluator: ReadinessEvaluatorService,
  ) {}

  async execute(query: GetReadinessQuery): Promise<ReadinessResponse> {
    await this.assertReadAction(query);

    const { assessmentId, organizationId } = query;

    // Verify assessment exists and belongs to organization
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        organizationId,
      },
    });

    if (!assessment) {
      throw new AssessmentNotFoundException();
    }

    // Run parallel checks for related states
    const [wizardProfile, repoConnection, evidenceReport] = await Promise.all([
      this.prisma.wizardProfile.findUnique({
        where: { assessmentId },
      }),
      this.prisma.repositoryConnection.findFirst({
        where: { assessmentId },
      }),
      this.prisma.technicalEvidenceReport.findFirst({
        where: { assessmentId, status: "accepted" },
      }),
    ]);

    const wizardStatus = wizardProfile?.status ?? "NOT_STARTED";

    // Evaluate readiness logic
    const evaluation = this.readinessEvaluator.evaluate({
      hasRepositoryConnection: !!repoConnection,
      hasAcceptedTechnicalEvidence: !!evidenceReport,
      wizardStatus,
    });

    return {
      assessment_id: assessmentId,
      wizard_status: wizardStatus,
      classification_locked: evaluation.classification_locked,
      lock_reason: evaluation.lock_reason,
      missing_evidence: evaluation.missing_evidence,
      completed_steps: evaluation.completed_steps,
      next_action: evaluation.next_action,
      updated_at: new Date().toISOString(),
      correlation_id: query.correlationId,
    };
  }

  private async assertReadAction(query: GetReadinessQuery): Promise<void> {
    const { authorization } = query;
    const isManagerOrDev =
      authorization.subjectRole === SUBJECT_ROLES.manager ||
      authorization.subjectRole === SUBJECT_ROLES.developer;
    const hasReadAction =
      authorization.selectedAction === PBAC_ACTIONS.assessmentRead;
    const hasPolicy =
      authorization.policyId !== null && authorization.policyVersion !== null;

    if (isManagerOrDev && hasReadAction && hasPolicy) {
      return;
    }

    // Write audit log on denial
    await this.auditWriter.write({
      eventType: "assessment_readiness.read",
      actorId: query.userId,
      organizationId: query.organizationId,
      resourceType: "assessment",
      resourceId: query.assessmentId,
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      correlationId: query.correlationId,
      policyId: authorization.policyId,
      policyVersion: authorization.policyVersion,
      payload: {
        assessmentId: query.assessmentId,
        action: PBAC_ACTIONS.assessmentRead,
        result: AUDIT_DECISIONS.deny,
      },
    });

    throw new ForbiddenException({
      error_code: AUTH_ERROR_CODES.pbacDenied,
      correlation_id: query.correlationId,
    });
  }
}
