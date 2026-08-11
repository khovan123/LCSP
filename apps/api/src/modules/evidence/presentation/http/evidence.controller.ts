import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
  Query,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { RequireAnyAction } from "../../../../platform/pbac/decorators/require-any-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import { AcceptTechnicalProfileCommand } from "../../application/commands/accept-technical-profile/accept-technical-profile.command.js";
import type { TechnicalProfileCallbackRequest } from "../../application/contracts/evidence/technical-profile-callback.contract.js";
import { GetEvidenceQuery } from "../../application/queries/get-evidence/get-evidence.query.js";
import { GetFindingDetailQuery } from "../../application/queries/get-finding-detail/get-finding-detail.query.js";
import { SearchEvidenceQuery } from "../../application/queries/search-evidence/search-evidence.query.js";
import {
  FINDING_DETAIL_INCLUDES,
  type FindingDetailInclude,
} from "../../application/contracts/evidence/finding-detail.contract.js";
import {
  SEARCH_EVIDENCE_CONFIDENCE,
  type SearchEvidenceConfidence,
} from "../../application/contracts/evidence/search-evidence.contract.js";
import { EVIDENCE_ERROR_CODES } from "@lcsp/contracts/evidence";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { HttpStatus } from "@nestjs/common";

@Controller("assessments")
export class EvidenceController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(":assessmentId/evidence")
  @UseGuards(PbacGuard)
  @RequireAnyAction(
    PBAC_ACTIONS.evidenceRead,
    PBAC_ACTIONS.evidenceReadRedacted,
  )
  async getEvidence(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.pbacContext;
    return resultEnvelope(
      await this.queryBus.execute(
        new GetEvidenceQuery(
          assessmentId,
          context.organizationId,
          context.scope,
          context.selectedAction,
          request.correlationId as string,
        ),
      ),
    );
  }

  @Get(":assessmentId/evidence-reports/:evidenceReportId/findings/:findingId")
  @UseGuards(PbacGuard)
  @RequireAnyAction(
    PBAC_ACTIONS.evidenceRead,
    PBAC_ACTIONS.evidenceReadRedacted,
  )
  async getFindingDetail(
    @Param("assessmentId") assessmentId: string,
    @Param("evidenceReportId") evidenceReportId: string,
    @Param("findingId") findingId: string,
    @Query("include") includeRaw: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const include = parseFindingDetailInclude(
      includeRaw,
      request.correlationId as string,
    );
    return resultEnvelope(
      await this.queryBus.execute(
        new GetFindingDetailQuery(
          assessmentId,
          request.pbacContext.organizationId,
          evidenceReportId,
          findingId,
          include,
          request.correlationId as string,
        ),
      ),
    );
  }

  @Get(":assessmentId/evidence-reports/:evidenceReportId/findings")
  @UseGuards(PbacGuard)
  @RequireAnyAction(
    PBAC_ACTIONS.evidenceRead,
    PBAC_ACTIONS.evidenceReadRedacted,
  )
  async searchEvidence(
    @Param("assessmentId") assessmentId: string,
    @Param("evidenceReportId") evidenceReportId: string,
    @Query("max_results") maxResultsRaw: string | undefined,
    @Query("finding_kinds") findingKindsRaw: string | undefined,
    @Query("providers") providersRaw: string | undefined,
    @Query("path_prefixes") pathPrefixesRaw: string | undefined,
    @Query("min_confidence") minConfidenceRaw: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const correlationId = request.correlationId as string;
    return resultEnvelope(
      await this.queryBus.execute(
        new SearchEvidenceQuery(
          assessmentId,
          request.pbacContext.organizationId,
          evidenceReportId,
          parseSearchMaxResults(maxResultsRaw, correlationId),
          correlationId,
          parseCsv(findingKindsRaw, correlationId),
          parseCsv(providersRaw, correlationId),
          parsePathPrefixes(pathPrefixesRaw, correlationId),
          parseSearchConfidence(minConfidenceRaw, correlationId),
        ),
      ),
    );
  }
}

function parseFindingDetailInclude(
  value: string | undefined,
  correlationId: string,
): FindingDetailInclude[] {
  const include = value?.split(",").map((item) => item.trim()) ?? [];
  const allowed = new Set(Object.values(FINDING_DETAIL_INCLUDES));
  if (
    include.length === 0 ||
    include.length > Object.keys(FINDING_DETAIL_INCLUDES).length ||
    include.some((item) => !allowed.has(item as FindingDetailInclude)) ||
    new Set(include).size !== include.length
  ) {
    throw problemException(EVIDENCE_ERROR_CODES.notFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
  return include as FindingDetailInclude[];
}

function parseSearchMaxResults(
  value: string | undefined,
  correlationId: string,
): number {
  const maxResults = Number(value);
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
    throw problemException(EVIDENCE_ERROR_CODES.notFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
  return maxResults;
}

function parseCsv(value: string | undefined, correlationId: string): string[] {
  if (!value) return [];
  const result = value.split(",").map((item) => item.trim());
  if (result.some((item) => !item) || new Set(result).size !== result.length) {
    throw problemException(EVIDENCE_ERROR_CODES.notFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
  return result;
}

function parsePathPrefixes(
  value: string | undefined,
  correlationId: string,
): string[] {
  const paths = parseCsv(value, correlationId);
  if (
    paths.some(
      (path) =>
        path.startsWith("/") || path.includes("..") || !path.endsWith("/"),
    )
  ) {
    throw problemException(EVIDENCE_ERROR_CODES.notFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
  return paths;
}

function parseSearchConfidence(
  value: string | undefined,
  correlationId: string,
): SearchEvidenceConfidence | undefined {
  if (!value) return undefined;
  if (
    !Object.values(SEARCH_EVIDENCE_CONFIDENCE).includes(
      value as SearchEvidenceConfidence,
    )
  ) {
    throw problemException(EVIDENCE_ERROR_CODES.notFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
  return value as SearchEvidenceConfidence;
}

@Controller("internal/evidence")
export class InternalEvidenceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post("technical-profile-callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async acceptTechnicalProfile(
    @Body() payload: TechnicalProfileCallbackRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new AcceptTechnicalProfileCommand(
          payload,
          correlationId?.trim() || randomUUID(),
        ),
      ),
    );
  }

  @Get("reports/:evidenceReportId")
  @UseGuards(WorkerApiKeyGuard)
  async getTechnicalEvidenceReport(
    @Param("evidenceReportId") evidenceReportId: string,
  ) {
    const report = await this.prisma.technicalEvidenceReport.findUnique({
      where: { id: evidenceReportId },
      select: {
        id: true,
        scanJobId: true,
        assessmentId: true,
        organizationId: true,
        snapshotId: true,
        toolsVersion: true,
        configHash: true,
        evidencePayload: true,
        privacyFlags: true,
        schemaVersion: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
    if (!report) {
      throw new NotFoundException("TechnicalEvidenceReport not found");
    }

    return {
      id: report.id,
      scan_job_id: report.scanJobId,
      assessment_id: report.assessmentId,
      organization_id: report.organizationId,
      snapshot_id: report.snapshotId,
      tools_version: report.toolsVersion,
      config_hash: report.configHash,
      evidence_payload: report.evidencePayload,
      privacy_flags: report.privacyFlags,
      schema_version: report.schemaVersion,
      status: String(report.status).toLowerCase(),
      rejection_reason: report.rejectionReason,
      created_at: report.createdAt.toISOString(),
    };
  }

  @Get("technical-profiles/:technicalProfileId")
  @UseGuards(WorkerApiKeyGuard)
  async getTechnicalProfile(
    @Param("technicalProfileId") technicalProfileId: string,
  ) {
    const profile = await this.prisma.technicalProfile.findUnique({
      where: { id: technicalProfileId },
      select: {
        id: true,
        evidenceReportId: true,
        assessmentId: true,
        organizationId: true,
        schemaVersion: true,
        providerVersion: true,
        profileData: true,
        privacyFlags: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
    });
    if (!profile) {
      throw new NotFoundException("TechnicalProfile not found");
    }

    const profileData = isRecord(profile.profileData)
      ? profile.profileData
      : {};
    return {
      ...profileData,
      id: profile.id,
      technical_profile_id: profile.id,
      evidence_report_id: profile.evidenceReportId,
      assessment_id: profile.assessmentId,
      organization_id: profile.organizationId,
      schema_version: profile.schemaVersion,
      provider_version: profile.providerVersion,
      privacy_flags: profile.privacyFlags,
      status: String(profile.status).toLowerCase(),
      rejection_reason: profile.rejectionReason,
      created_at: profile.createdAt.toISOString(),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
