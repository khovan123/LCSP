import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
  READINESS_EXPORT_BADGES,
  READINESS_EXPORT_DOWNLOAD_STATES,
  READINESS_EXPORT_LABELS,
  READINESS_EXPORT_STATUSES,
  type ReadinessExportContent,
  type ReadinessExportHistoryItem,
} from "@lcsp/contracts/wizard";

import { fromPrismaReadinessExportStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AssessmentNotFoundException } from "../../../domain/exceptions/wizard.exceptions.js";
import { ReadinessExportGuardrailService } from "../../services/wizard/readiness-export-guardrail.service.js";
import { ListReadinessExportsQuery } from "./list-readiness-exports.query.js";

@QueryHandler(ListReadinessExportsQuery)
export class ListReadinessExportsHandler implements IQueryHandler<
  ListReadinessExportsQuery,
  ReadinessExportHistoryItem[]
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardrail: ReadinessExportGuardrailService,
  ) {}

  async execute(
    query: ListReadinessExportsQuery,
  ): Promise<ReadinessExportHistoryItem[]> {
    this.assertManagerExportAction(query);
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: query.assessmentId,
        organizationId: query.organizationId,
        ownerId: query.ownerId,
      },
      select: { id: true },
    });
    if (!assessment) {
      throw new AssessmentNotFoundException(query.correlationId);
    }

    const records = await this.prisma.readinessExport.findMany({
      where: {
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
        ownerId: query.ownerId,
      },
      orderBy: { version: "desc" },
    });

    return records.map((record) => {
      const status = fromPrismaReadinessExportStatus(record.status);
      const content = record.contentJson as ReadinessExportContent | null;
      const ready =
        status === READINESS_EXPORT_STATUSES.generated &&
        content !== null &&
        this.guardrail.check(content).passed;

      return {
        artifact_type: READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
        export_id: record.id,
        assessment_id: record.assessmentId,
        owner_id: record.ownerId,
        status: ready ? status : READINESS_EXPORT_STATUSES.blocked,
        label: READINESS_EXPORT_LABELS.wizardReadinessExport,
        badge: READINESS_EXPORT_BADGES.readinessOnly,
        title: READINESS_EXPORT_LABELS.wizardReadinessExport,
        preview: ready ? content.preview : "Readiness-only export unavailable.",
        readiness_only: true,
        classification_status:
          READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired,
        metadata: ready ? content.metadata : null,
        generated_at: record.generatedAt.toISOString(),
        version: record.version,
        download_state: ready
          ? READINESS_EXPORT_DOWNLOAD_STATES.ready
          : READINESS_EXPORT_DOWNLOAD_STATES.blocked,
        download_url: ready
          ? `/assessments/${encodeURIComponent(record.assessmentId)}/wizard/readiness-exports/${encodeURIComponent(record.id)}/download`
          : null,
      };
    });
  }

  private assertManagerExportAction(query: ListReadinessExportsQuery): void {
    const allowed =
      query.authorization.subjectRole === SUBJECT_ROLES.manager &&
      query.authorization.selectedAction === PBAC_ACTIONS.wizardExport &&
      query.authorization.policyId !== null &&
      query.authorization.policyVersion !== null;
    if (!allowed) {
      throw problemException(AUTH_ERROR_CODES.pbacDenied, query.correlationId, {
        status: HttpStatus.FORBIDDEN,
      });
    }
  }
}
