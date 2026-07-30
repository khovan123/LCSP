import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { AUDIT_ERROR_CODES } from "@lcsp/contracts/audit";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import type { AuditExportArtifact } from "../../contracts/audit/audit-export.contract.js";
import { GetAuditExportArtifactQuery } from "./get-audit-export-artifact.query.js";

@QueryHandler(GetAuditExportArtifactQuery)
export class GetAuditExportArtifactHandler implements IQueryHandler<GetAuditExportArtifactQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetAuditExportArtifactQuery,
  ): Promise<AuditExportArtifact> {
    const exportRequest = await this.prisma.auditExportRequest.findFirst({
      where: {
        id: query.exportRequestId,
        organizationId: query.organizationId,
      },
      select: {
        contentJson: true,
      },
    });

    if (!exportRequest || !isAuditExportArtifact(exportRequest.contentJson)) {
      throw problemException(
        AUDIT_ERROR_CODES.exportNotFound,
        query.correlationId,
        {
          status: HttpStatus.NOT_FOUND,
        },
      );
    }

    return exportRequest.contentJson;
  }
}

function isAuditExportArtifact(value: unknown): value is AuditExportArtifact {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<AuditExportArtifact>;
  return (
    typeof candidate.export_request_id === "string" &&
    typeof candidate.organization_id === "string" &&
    typeof candidate.version === "number" &&
    typeof candidate.generated_at === "string" &&
    typeof candidate.total_events === "number" &&
    typeof candidate.checksum_sha256 === "string" &&
    Array.isArray(candidate.events)
  );
}
