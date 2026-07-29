import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { DOCUMENT_ERROR_CODES } from "@lcsp/contracts/document";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireAnyAction } from "../../../../platform/pbac/decorators/require-any-action.decorator.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { RequestFinalReportCommand } from "../../application/commands/request-final-report/request-final-report.command.js";
import { RequestGapAnalysisCommand } from "../../application/commands/request-gap-analysis/request-gap-analysis.command.js";
import { GetDocumentQuery } from "../../application/queries/get-document/get-document.query.js";
import { ListDocumentsQuery } from "../../application/queries/list-documents/list-documents.query.js";
import { DocumentStorageService } from "../../infrastructure/storage/document-storage.service.js";

@Controller("assessments")
export class DocumentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storage: DocumentStorageService,
  ) {}

  @Post(":assessmentId/documents/final-report")
  @HttpCode(202)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.documentGenerate)
  async requestFinalReport(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const correlationId =
      typeof request.correlationId === "string"
        ? request.correlationId
        : crypto.randomUUID();

    return resultEnvelope(
      await this.commandBus.execute(
        new RequestFinalReportCommand(
          assessmentId,
          request.pbacContext.organizationId,
          request.pbacContext.userId,
          correlationId,
        ),
      ),
    );
  }

  @Post(":assessmentId/documents/gap-analysis")
  @HttpCode(202)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.documentGenerate)
  async requestGapAnalysis(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const correlationId =
      typeof request.correlationId === "string"
        ? request.correlationId
        : crypto.randomUUID();

    return resultEnvelope(
      await this.commandBus.execute(
        new RequestGapAnalysisCommand(
          assessmentId,
          request.pbacContext.organizationId,
          request.pbacContext.userId,
          correlationId,
        ),
      ),
    );
  }

  @Get(":assessmentId/documents/:documentRequestId")
  @UseGuards(PbacGuard)
  @RequireAnyAction(
    PBAC_ACTIONS.documentRead,
    PBAC_ACTIONS.documentReadRedacted,
  )
  async getDocument(
    @Param("assessmentId") assessmentId: string,
    @Param("documentRequestId") documentRequestId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.pbacContext;
    return resultEnvelope(
      await this.queryBus.execute(
        new GetDocumentQuery(
          assessmentId,
          documentRequestId,
          context.organizationId,
          context.scope,
          context.selectedAction,
          request.correlationId as string,
        ),
      ),
    );
  }

  @Get(":assessmentId/documents")
  @UseGuards(PbacGuard)
  @RequireAnyAction(
    PBAC_ACTIONS.documentRead,
    PBAC_ACTIONS.documentReadRedacted,
  )
  async listDocuments(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.pbacContext;
    return resultEnvelope(
      await this.queryBus.execute(
        new ListDocumentsQuery(
          assessmentId,
          context.organizationId,
          context.scope,
          context.selectedAction,
          request.correlationId as string,
        ),
      ),
    );
  }

  @Get(":assessmentId/documents/:documentRequestId/download")
  @Redirect(undefined, 302)
  downloadDocument(
    @Param("assessmentId") assessmentId: string,
    @Param("documentRequestId") documentRequestId: string,
    @Query("token") token?: string,
  ): { url: string } {
    if (!token) {
      throw new BadRequestException({
        error_code: DOCUMENT_ERROR_CODES.downloadUrlInvalid,
      });
    }

    const payload = this.storage.verifySignedDownloadToken(
      token,
      assessmentId,
      documentRequestId,
    );
    if (!payload) {
      throw new BadRequestException({
        error_code: DOCUMENT_ERROR_CODES.downloadUrlInvalid,
      });
    }

    return { url: payload.documentUrl };
  }
}
