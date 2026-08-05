import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import {
  READINESS_EXPORT_ERROR_CODES,
  READINESS_EXPORT_STATUSES,
} from "@lcsp/contracts/wizard";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { ReadinessExportPdfService } from "../../services/wizard/readiness-export-pdf.service.js";
import { DownloadReadinessExportQuery } from "./download-readiness-export.query.js";
import type { ReadinessExportDownload } from "./download-readiness-export.query.js";
import type { ReadinessExportContent } from "../../contracts/wizard/readiness-export.contract.js";

@QueryHandler(DownloadReadinessExportQuery)
export class DownloadReadinessExportHandler implements IQueryHandler<
  DownloadReadinessExportQuery,
  ReadinessExportDownload
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: ReadinessExportPdfService,
  ) {}

  async execute(
    query: DownloadReadinessExportQuery,
  ): Promise<ReadinessExportDownload> {
    const record = await this.prisma.readinessExport.findFirst({
      where: {
        id: query.exportId,
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
        ownerId: query.ownerId,
        status: READINESS_EXPORT_STATUSES.generated,
      },
      select: { contentJson: true, version: true },
    });
    if (!record?.contentJson) {
      throw problemException(
        READINESS_EXPORT_ERROR_CODES.notFound,
        query.correlationId,
        { status: HttpStatus.NOT_FOUND },
      );
    }
    return {
      pdf: this.pdf.render(
        record.contentJson as unknown as ReadinessExportContent,
      ),
      version: record.version,
    };
  }
}
