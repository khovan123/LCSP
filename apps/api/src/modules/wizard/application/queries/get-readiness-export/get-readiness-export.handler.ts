import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  READINESS_EXPORT_ERROR_CODES,
  READINESS_EXPORT_STATUSES,
  type ReadinessExportContent,
} from "@lcsp/contracts/wizard";

import { fromPrismaReadinessExportStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { ReadinessExportGuardrailService } from "../../services/wizard/readiness-export-guardrail.service.js";
import { GetReadinessExportQuery } from "./get-readiness-export.query.js";

@QueryHandler(GetReadinessExportQuery)
export class GetReadinessExportHandler implements IQueryHandler<
  GetReadinessExportQuery,
  ReadinessExportContent
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardrail: ReadinessExportGuardrailService,
  ) {}

  async execute(
    query: GetReadinessExportQuery,
  ): Promise<ReadinessExportContent> {
    this.assertManagerExportAction(query);
    const record = await this.prisma.readinessExport.findFirst({
      where: {
        id: query.exportId,
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
        ownerId: query.ownerId,
      },
    });

    const content = record?.contentJson as ReadinessExportContent | null;
    const ready =
      record !== null &&
      record !== undefined &&
      fromPrismaReadinessExportStatus(record.status) ===
        READINESS_EXPORT_STATUSES.generated &&
      content !== null &&
      content.metadata.assessment_id === record.assessmentId &&
      content.metadata.generated_by === record.ownerId &&
      content.metadata.version === record.version &&
      content.metadata.generated_at === record.generatedAt.toISOString() &&
      this.guardrail.check(content).passed;
    if (!ready) {
      throw problemException(
        READINESS_EXPORT_ERROR_CODES.notDownloadable,
        query.correlationId,
        { status: HttpStatus.CONFLICT },
      );
    }

    return content;
  }

  private assertManagerExportAction(query: GetReadinessExportQuery): void {
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
