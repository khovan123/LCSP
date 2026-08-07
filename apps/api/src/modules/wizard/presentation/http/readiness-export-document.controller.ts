import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { randomUUID } from "node:crypto";

import { DownloadReadinessExportQuery } from "../../application/queries/download-readiness-export/download-readiness-export.query.js";
import type {
  ReadinessExportFormat,
  ReadinessExportLocale,
} from "../../application/services/wizard/readiness-export-document.service.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import type { Response } from "express";

@Controller("assessments")
export class ReadinessExportDocumentController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(
    ":assessmentId/wizard/readiness-exports/:exportId/download/:format/:locale",
  )
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardExport)
  async download(
    @Param("assessmentId") assessmentId: string,
    @Param("exportId") exportId: string,
    @Param("format") requestedFormat: string,
    @Param("locale") requestedLocale: string,
    @Req() req: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const format = parseFormat(requestedFormat);
    const locale = parseLocale(requestedLocale);
    const { userId, organizationId } = req.pbacContext;
    const download = await this.queryBus.execute(
      new DownloadReadinessExportQuery(
        assessmentId,
        exportId,
        organizationId,
        userId,
        req.correlationId || randomUUID(),
        format,
        locale,
      ),
    );

    response.setHeader("Content-Type", download.mediaType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="wizard-readiness-export-${locale}-v${download.version}.${download.extension}"`,
    );
    response.setHeader("Cache-Control", "private, no-store");
    response.end(download.document);
  }
}

function parseFormat(value: string): ReadinessExportFormat {
  const normalized = value.toLowerCase();
  if (normalized === "pdf" || normalized === "docx") return normalized;
  throw new BadRequestException("format must be either pdf or docx");
}

function parseLocale(value: string): ReadinessExportLocale {
  const normalized = value.toLowerCase();
  if (normalized === "en" || normalized === "vi") return normalized;
  throw new BadRequestException("locale must be either en or vi");
}
