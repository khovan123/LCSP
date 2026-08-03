import * as crypto from "node:crypto";

import { HttpStatus } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
  AUDIT_RESOURCE_TYPES,
} from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { WIZARD_STATUS_CODES } from "@lcsp/contracts/assessment";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";
import {
  READINESS_EXPORT_ERROR_CODES,
  READINESS_EXPORT_STATUSES,
  WIZARD_EVENT_TYPES,
  type WizardAnswer,
} from "@lcsp/contracts/wizard";
import { Prisma } from "@prisma/client";

import {
  fromPrismaWizardStatus,
  toPrismaEvidenceAcceptanceStatus,
  toPrismaReadinessExportStatus,
} from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AssessmentNotFoundException } from "../../../domain/exceptions/wizard.exceptions.js";
import type {
  ReadinessExportContent,
  ReadinessExportResponse,
} from "../../contracts/wizard/readiness-export.contract.js";
import { ReadinessEvaluatorService } from "../../services/wizard/readiness-evaluator.service.js";
import { ReadinessExportGuardrailService } from "../../services/wizard/readiness-export-guardrail.service.js";
import { GenerateReadinessExportCommand } from "./generate-readiness-export.command.js";

const READINESS_EXPORT_LABEL = "Wizard Readiness Export";

@CommandHandler(GenerateReadinessExportCommand)
export class GenerateReadinessExportHandler implements ICommandHandler<
  GenerateReadinessExportCommand,
  ReadinessExportResponse
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly readinessEvaluator: ReadinessEvaluatorService,
    private readonly guardrail: ReadinessExportGuardrailService,
  ) {}

  async execute(
    command: GenerateReadinessExportCommand,
  ): Promise<ReadinessExportResponse> {
    await this.assertManagerExportAction(command);

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: command.assessmentId,
        organizationId: command.organizationId,
        ownerId: command.ownerId,
      },
      select: {
        id: true,
        organizationId: true,
        ownerId: true,
      },
    });
    if (!assessment) {
      throw new AssessmentNotFoundException(command.correlationId);
    }

    const [wizardProfile, repositoryConnection, technicalEvidence, latest] =
      await Promise.all([
        this.prisma.wizardProfile.findUnique({
          where: { assessmentId: command.assessmentId },
          select: {
            id: true,
            version: true,
            status: true,
            answers: true,
          },
        }),
        this.prisma.repositoryConnection.findFirst({
          where: { assessmentId: command.assessmentId },
          select: { id: true },
        }),
        this.prisma.technicalEvidenceReport.findFirst({
          where: {
            assessmentId: command.assessmentId,
            organizationId: command.organizationId,
            status: toPrismaEvidenceAcceptanceStatus(
              TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
            ),
          },
          select: { id: true },
        }),
        this.prisma.readinessExport.findFirst({
          where: { assessmentId: command.assessmentId },
          orderBy: { version: "desc" },
          select: { version: true },
        }),
      ]);

    if (!wizardProfile) {
      throw problemException(
        READINESS_EXPORT_ERROR_CODES.wizardNotSubmitted,
        command.correlationId,
        { status: HttpStatus.UNPROCESSABLE_ENTITY },
      );
    }
    const wizardStatus = fromPrismaWizardStatus(wizardProfile.status);
    if (wizardStatus !== WIZARD_STATUS_CODES.submitted) {
      throw problemException(
        READINESS_EXPORT_ERROR_CODES.wizardNotSubmitted,
        command.correlationId,
        { status: HttpStatus.UNPROCESSABLE_ENTITY },
      );
    }

    if (technicalEvidence) {
      throw problemException(
        READINESS_EXPORT_ERROR_CODES.requiresLockedClassification,
        command.correlationId,
        { status: HttpStatus.CONFLICT },
      );
    }

    const version = (latest?.version ?? 0) + 1;
    const generatedAt = new Date();
    const readiness = this.readinessEvaluator.evaluate({
      hasRepositoryConnection: !!repositoryConnection,
      hasAcceptedTechnicalEvidence: false,
      wizardStatus,
      wizardAnswers: Array.isArray(wizardProfile.answers)
        ? (wizardProfile.answers as WizardAnswer[])
        : [],
    });
    const content = this.buildContent(
      command,
      wizardProfile.version,
      version,
      generatedAt,
      readiness.missing_evidence,
      readiness.unresolved_unknown_items.map((item) => item.label),
      readiness.next_action,
    );
    const guardrailResult = this.guardrail.check(content);
    const status = guardrailResult.passed
      ? READINESS_EXPORT_STATUSES.generated
      : READINESS_EXPORT_STATUSES.blocked;
    const exportId = crypto.randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.readinessExport.create({
        data: {
          id: exportId,
          assessmentId: command.assessmentId,
          organizationId: command.organizationId,
          ownerId: command.ownerId,
          version,
          status: toPrismaReadinessExportStatus(status),
          contentJson: guardrailResult.passed
            ? (content as unknown as Prisma.InputJsonValue)
            : undefined,
          blockedReason: guardrailResult.blockedReason,
          generatedAt,
        },
      });

      await this.auditWriter.writeInTx(
        {
          eventType: guardrailResult.passed
            ? WIZARD_EVENT_TYPES.readinessExportGenerated
            : WIZARD_EVENT_TYPES.readinessExportBlocked,
          actorId: command.ownerId,
          organizationId: command.organizationId,
          resourceType: AUDIT_RESOURCE_TYPES.readinessExport,
          resourceId: exportId,
          assessmentId: command.assessmentId,
          decision: guardrailResult.passed
            ? AUDIT_DECISIONS.allow
            : AUDIT_DECISIONS.deny,
          reasonCode: guardrailResult.blockedReason,
          correlationId: command.correlationId,
          policyId: command.authorization.policyId,
          policyVersion: command.authorization.policyVersion,
          redactionStatus: AUDIT_REDACTION_STATUSES.none,
          payload: {
            exportId,
            assessmentId: command.assessmentId,
            status,
            version,
            correlationId: command.correlationId,
            ...(guardrailResult.blockedReason
              ? { blockedReason: guardrailResult.blockedReason }
              : {}),
          },
        },
        tx,
      );
    });

    return {
      export_id: exportId,
      assessment_id: command.assessmentId,
      owner_id: command.ownerId,
      status,
      label: READINESS_EXPORT_LABEL,
      classification_locked: true,
      missing_evidence: content.missing_evidence,
      unresolved_unknowns: content.unresolved_unknowns,
      preparation_guidance: content.preparation_guidance,
      generated_at: generatedAt.toISOString(),
      version,
      correlation_id: command.correlationId,
      ...(guardrailResult.blockedReason
        ? { blocked_reason: guardrailResult.blockedReason }
        : {}),
    };
  }

  private buildContent(
    command: GenerateReadinessExportCommand,
    wizardProfileVersion: number,
    version: number,
    generatedAt: Date,
    missingEvidence: ReadinessExportContent["missing_evidence"],
    unresolvedUnknowns: string[],
    nextAction: string,
  ): ReadinessExportContent {
    return {
      label: READINESS_EXPORT_LABEL,
      badge: "READINESS_ONLY",
      title: READINESS_EXPORT_LABEL,
      preview:
        "Readiness-only preparation summary for evidence collection and next steps.",
      metadata: {
        label: READINESS_EXPORT_LABEL,
        readiness_only: true,
        assessment_id: command.assessmentId,
        wizard_profile_version: wizardProfileVersion,
        owner_id: command.ownerId,
        version,
        generated_at: generatedAt.toISOString(),
      },
      missing_evidence: missingEvidence,
      unresolved_unknowns: unresolvedUnknowns,
      preparation_guidance: [
        "Keep the wizard answers current while technical evidence is collected.",
        "Resolve unknown items before requesting downstream evaluation.",
        nextAction,
      ],
      next_steps: [
        "Connect the repository if it is not connected.",
        "Run the technical evidence scan when repository access is ready.",
        "Review unresolved unknown items with the assessment owner.",
      ],
    };
  }

  private async assertManagerExportAction(
    command: GenerateReadinessExportCommand,
  ): Promise<void> {
    const allowed =
      command.authorization.subjectRole === SUBJECT_ROLES.manager &&
      command.authorization.selectedAction === PBAC_ACTIONS.wizardExport &&
      command.authorization.policyId !== null &&
      command.authorization.policyVersion !== null;

    if (allowed) return;

    await this.auditWriter.write({
      eventType: WIZARD_EVENT_TYPES.readinessExportGenerated,
      actorId: command.ownerId,
      organizationId: command.organizationId,
      resourceType: AUDIT_RESOURCE_TYPES.readinessExport,
      resourceId: null,
      assessmentId: command.assessmentId,
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      correlationId: command.correlationId,
      policyId: command.authorization.policyId,
      policyVersion: command.authorization.policyVersion,
      payload: {
        assessmentId: command.assessmentId,
        action: PBAC_ACTIONS.wizardExport,
        result: AUDIT_DECISIONS.deny,
      },
    });

    throw problemException(AUTH_ERROR_CODES.pbacDenied, command.correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }
}
