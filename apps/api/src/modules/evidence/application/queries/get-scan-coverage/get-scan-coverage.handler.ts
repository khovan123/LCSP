import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  AGENTIC_TOOL_COVERAGE_STATES,
  AGENTIC_TOOL_EVENT_TYPES,
  AGENTIC_TOOL_NAMES,
  AGENTIC_TOOL_STATUSES,
  EVIDENCE_ERROR_CODES,
} from "@lcsp/contracts/evidence";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";
import { toPrismaEvidenceAcceptanceStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import {
  SCAN_COVERAGE_DISPOSITIONS,
  SCAN_COVERAGE_MAX_RESULTS,
  type ScanCoverageResponse,
} from "../../contracts/evidence/scan-coverage.contract.js";
import { GetScanCoverageQuery } from "./get-scan-coverage.query.js";

@QueryHandler(GetScanCoverageQuery)
export class GetScanCoverageHandler implements IQueryHandler<
  GetScanCoverageQuery,
  ScanCoverageResponse
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(query: GetScanCoverageQuery): Promise<ScanCoverageResponse> {
    const report = await this.prisma.technicalEvidenceReport.findFirst({
      where: {
        id: query.evidenceReportId,
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
        status: toPrismaEvidenceAcceptanceStatus(
          TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
        ),
      },
      select: { id: true, evidencePayload: true },
    });
    const coverage = coverageData(report?.evidencePayload);
    if (!report || !coverage) {
      throw problemException(
        EVIDENCE_ERROR_CODES.notFound,
        query.correlationId,
        { status: HttpStatus.NOT_FOUND },
      );
    }

    const cursorPath = query.cursor ? decodeCursor(query.cursor) : null;
    const all = coverage.files
      .filter((item) => matchesSelectors(item, query))
      .sort((a, b) => a.path.localeCompare(b.path));
    const afterCursor = cursorPath
      ? all.filter((item) => item.path.localeCompare(cursorPath) > 0)
      : all;
    const limit = Math.min(
      SCAN_COVERAGE_MAX_RESULTS,
      Math.max(1, query.maxResults),
    );
    const files = afterCursor.slice(0, limit);
    const truncated = afterCursor.length > files.length;
    const nextCursor =
      truncated && files.length > 0
        ? encodeCursor(files[files.length - 1].path)
        : null;
    const counts = {
      total: all.length,
      analyzed: all.filter(
        (item) => item.disposition === SCAN_COVERAGE_DISPOSITIONS.analyzed,
      ).length,
      skipped: all.filter(
        (item) => item.disposition === SCAN_COVERAGE_DISPOSITIONS.skipped,
      ).length,
      limited: all.filter(
        (item) => item.disposition === SCAN_COVERAGE_DISPOSITIONS.limited,
      ).length,
    };
    const response: ScanCoverageResponse = {
      status: AGENTIC_TOOL_STATUSES.ready,
      tool_name: AGENTIC_TOOL_NAMES.getScanCoverage,
      tool_version: "1.0.0",
      config_hash: "sha256:scan-coverage-v1",
      correlation_id: query.correlationId,
      artifact_versions: { technical_evidence_report_id: report.id },
      provenance_ref: `tool-execution:${query.correlationId}`,
      coverage_state:
        counts.limited > 0
          ? AGENTIC_TOOL_COVERAGE_STATES.limited
          : AGENTIC_TOOL_COVERAGE_STATES.sufficient,
      evidence_refs: files.map((item) => `coverage:file:${item.path}`),
      limitations: files
        .filter(
          (item) => item.disposition === SCAN_COVERAGE_DISPOSITIONS.limited,
        )
        .flatMap((item) => item.limitation_refs),
      result: {
        files,
        counts,
        next_cursor: nextCursor,
        truncated,
      },
    };
    await this.auditWriter.write({
      eventType: AGENTIC_TOOL_EVENT_TYPES.scanCoverageRead,
      actorId: null,
      organizationId: query.organizationId,
      assessmentId: query.assessmentId,
      resourceType: AUDIT_RESOURCE_TYPES.technicalEvidenceReport,
      resourceId: report.id,
      correlationId: query.correlationId,
      decision: AUDIT_DECISIONS.allow,
      result: response.status,
      payload: {
        toolName: response.tool_name,
        reportRef: `report:${report.id}`,
        resultCount: files.length,
        truncated,
      },
    });
    return response;
  }
}

function matchesSelectors(
  item: ScanCoverageResponse["result"]["files"][number],
  query: GetScanCoverageQuery,
): boolean {
  if (
    query.pathPrefixes.length > 0 &&
    !query.pathPrefixes.some((prefix) => item.path.startsWith(prefix))
  ) {
    return false;
  }
  if (
    query.languages.length > 0 &&
    !query.languages.some(
      (language) => language.toLowerCase() === item.language.toLowerCase(),
    )
  ) {
    return false;
  }
  if (
    query.dispositions.length > 0 &&
    !query.dispositions.includes(item.disposition)
  ) {
    return false;
  }
  return true;
}

function encodeCursor(path: string): string {
  return Buffer.from(path, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): string | null {
  try {
    const path = Buffer.from(cursor, "base64url").toString("utf8");
    if (!path || encodeCursor(path) !== cursor.replace(/=+$/u, "")) return null;
    return path;
  } catch {
    return null;
  }
}

function coverageData(
  payload: unknown,
): { files: ScanCoverageResponse["result"]["files"] } | null {
  const root = record(payload);
  const coverage = root && record(root.scan_coverage);
  if (!coverage || !Array.isArray(coverage.files)) return null;
  return {
    files: coverage.files.flatMap(
      (value): ScanCoverageResponse["result"]["files"] => {
        const file = record(value);
        const path = file && text(file.file_path);
        const language = file && text(file.language);
        const support = file && text(file.support_level);
        if (!path || !language || !support) return [];
        const limited = file.coverage_limitation === true;
        const skipped = support === "SKIP";
        const reason = text(file.skip_reason);
        return [
          {
            path,
            language,
            support_level: support,
            disposition: limited
              ? SCAN_COVERAGE_DISPOSITIONS.limited
              : skipped
                ? SCAN_COVERAGE_DISPOSITIONS.skipped
                : SCAN_COVERAGE_DISPOSITIONS.analyzed,
            limitation_refs: reason ? [`limitation:${reason}`] : [],
          },
        ];
      },
    ),
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
