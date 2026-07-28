import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { AUDIT_ERROR_CODES } from "@lcsp/contracts/audit";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import type { Response } from "express";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type {
  AuditExportArtifact,
  AuditExportRequestDto,
  AuditExportStatusDto,
} from "../../application/contracts/audit/audit-export.contract.js";
import { ExportAuditTrailCommand } from "../../application/commands/export-audit-trail/export-audit-trail.command.js";
import { GetAuditExportArtifactQuery } from "../../application/queries/get-audit-export-artifact/get-audit-export-artifact.query.js";
import { GetAuditExportQuery } from "../../application/queries/get-audit-export/get-audit-export.query.js";
import { ListAuditEventsQuery } from "../../application/queries/list-audit-events/list-audit-events.query.js";
import { AuditExportStorageService } from "../../infrastructure/storage/audit-export-storage.service.js";

interface AuditExportBody {
  from_date: string;
  to_date: string;
}

@Controller("organizations/:orgId/audit-events")
export class AuditController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storage: AuditExportStorageService,
  ) {}

  @Get()
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.auditRead)
  async listAuditEvents(
    @Param("orgId") organizationId: string,
    @Query("event_type") eventType: string | undefined,
    @Query("actor_id") actorId: string | undefined,
    @Query("from_date") fromDate: string | undefined,
    @Query("to_date") toDate: string | undefined,
    @Query("page") page: string | undefined,
    @Query("page_size") pageSize: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.pbacContext;

    return this.queryBus.execute(
      new ListAuditEventsQuery(
        organizationId,
        context.organizationId,
        eventType,
        actorId,
        fromDate,
        toDate,
        page === undefined ? undefined : Number(page),
        pageSize === undefined ? undefined : Number(pageSize),
        request.correlationId as string,
      ),
    );
  }

  @Post("export")
  @HttpCode(202)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.auditExport)
  async exportAuditTrail(
    @Param("orgId") organizationId: string,
    @Body() body: AuditExportBody,
    @Req() request: AuthenticatedRequest,
  ): Promise<AuditExportRequestDto> {
    const correlationId =
      typeof request.correlationId === "string"
        ? request.correlationId
        : crypto.randomUUID();

    return this.commandBus.execute(
      new ExportAuditTrailCommand(
        organizationId,
        request.pbacContext.organizationId,
        request.pbacContext.userId,
        body.from_date,
        body.to_date,
        correlationId,
      ),
    );
  }

  @Get("export/:exportRequestId")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.auditExport)
  async getAuditExport(
    @Param("orgId") organizationId: string,
    @Param("exportRequestId") exportRequestId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<AuditExportStatusDto> {
    return this.queryBus.execute(
      new GetAuditExportQuery(
        organizationId,
        request.pbacContext.organizationId,
        exportRequestId,
        request.correlationId as string,
      ),
    );
  }

  @Get("export/:exportRequestId/download")
  async downloadAuditExport(
    @Param("orgId") organizationId: string,
    @Param("exportRequestId") exportRequestId: string,
    @Query("token") token: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    if (!token) {
      throw new BadRequestException({
        error_code: AUDIT_ERROR_CODES.downloadUrlInvalid,
      });
    }

    const payload = this.storage.verifySignedDownloadToken(
      token,
      organizationId,
      exportRequestId,
    );
    if (!payload) {
      throw new BadRequestException({
        error_code: AUDIT_ERROR_CODES.downloadUrlInvalid,
      });
    }

    const artifact: AuditExportArtifact = await this.queryBus.execute(
      new GetAuditExportArtifactQuery(
        organizationId,
        exportRequestId,
        crypto.randomUUID(),
      ),
    );

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-trail-export-${exportRequestId}.json"`,
    );
    response.send(JSON.stringify(artifact, null, 2));
  }
}
