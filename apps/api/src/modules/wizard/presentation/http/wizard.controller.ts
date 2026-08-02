import {
  Controller,
  Put,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import type { Response } from "express";

import type { SaveWizardDraftRequest } from "../../application/contracts/wizard/wizard-draft.contract.js";
import type { SubmitWizardRequest } from "../../application/contracts/wizard/wizard-submit.contract.js";
import { SaveWizardDraftCommand } from "../../application/commands/save-wizard-draft/save-wizard-draft.command.js";
import { SubmitWizardCommand } from "../../application/commands/submit-wizard/submit-wizard.command.js";
import { GenerateReadinessExportCommand } from "../../application/commands/generate-readiness-export/generate-readiness-export.command.js";
import { GetReadinessQuery } from "../../application/queries/get-readiness/get-readiness.query.js";
import { GetReadinessExportQuery } from "../../application/queries/get-readiness-export/get-readiness-export.query.js";
import { ListReadinessExportsQuery } from "../../application/queries/list-readiness-exports/list-readiness-exports.query.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { randomUUID } from "node:crypto";
import { ReadinessExportPdfService } from "../../infrastructure/pdf/readiness-export-pdf.service.js";
import type { ReadinessExportContent } from "@lcsp/contracts/wizard";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";

@Controller("assessments")
export class WizardController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly readinessExportPdf: ReadinessExportPdfService,
  ) {}

  @Put(":assessmentId/wizard/draft")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardWrite)
  async saveWizardDraft(
    @Param("assessmentId") assessmentId: string,
    @Body() body: SaveWizardDraftRequest,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return resultEnvelope(
      await this.commandBus.execute(
        new SaveWizardDraftCommand(
          assessmentId,
          organizationId,
          userId,
          body.answers,
          correlationId,
          {
            subjectRole: pbacContext.subjectRole,
            selectedAction: pbacContext.selectedAction,
            policyId: pbacContext.policyId,
            policyVersion: pbacContext.policyVersion,
          },
        ),
      ),
    );
  }

  @Post(":assessmentId/wizard/submit")
  @HttpCode(200)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardSubmit)
  async submitWizard(
    @Param("assessmentId") assessmentId: string,
    @Body() body: SubmitWizardRequest,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return resultEnvelope(
      await this.commandBus.execute(
        new SubmitWizardCommand(
          assessmentId,
          organizationId,
          userId,
          body.answers,
          correlationId,
          {
            subjectRole: pbacContext.subjectRole,
            selectedAction: pbacContext.selectedAction,
            policyId: pbacContext.policyId,
            policyVersion: pbacContext.policyVersion,
          },
        ),
      ),
    );
  }

  @Get(":assessmentId/readiness")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.assessmentRead)
  async getReadiness(
    @Param("assessmentId") assessmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return resultEnvelope(
      await this.queryBus.execute(
        new GetReadinessQuery(
          assessmentId,
          organizationId,
          userId,
          correlationId,
          {
            subjectRole: pbacContext.subjectRole,
            selectedAction: pbacContext.selectedAction,
            policyId: pbacContext.policyId,
            policyVersion: pbacContext.policyVersion,
          },
        ),
      ),
    );
  }

  @Post(":assessmentId/wizard/readiness-export")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardExport)
  async generateReadinessExport(
    @Param("assessmentId") assessmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return resultEnvelope(
      await this.commandBus.execute(
        new GenerateReadinessExportCommand(
          assessmentId,
          organizationId,
          userId,
          correlationId,
          {
            subjectRole: pbacContext.subjectRole,
            selectedAction: pbacContext.selectedAction,
            policyId: pbacContext.policyId,
            policyVersion: pbacContext.policyVersion,
          },
        ),
      ),
    );
  }

  @Get(":assessmentId/wizard/readiness-exports")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardExport)
  async listReadinessExports(
    @Param("assessmentId") assessmentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return resultEnvelope(
      await this.queryBus.execute(
        new ListReadinessExportsQuery(
          assessmentId,
          organizationId,
          userId,
          correlationId,
          {
            subjectRole: pbacContext.subjectRole,
            selectedAction: pbacContext.selectedAction,
            policyId: pbacContext.policyId,
            policyVersion: pbacContext.policyVersion,
          },
        ),
      ),
    );
  }

  @Get(":assessmentId/wizard/readiness-exports/:exportId/download")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardExport)
  async getReadinessExport(
    @Param("assessmentId") assessmentId: string,
    @Param("exportId") exportId: string,
    @Req() req: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    const content = await this.queryBus.execute<
      GetReadinessExportQuery,
      ReadinessExportContent
    >(
      new GetReadinessExportQuery(
        assessmentId,
        exportId,
        organizationId,
        userId,
        correlationId,
        {
          subjectRole: pbacContext.subjectRole,
          selectedAction: pbacContext.selectedAction,
          policyId: pbacContext.policyId,
          policyVersion: pbacContext.policyVersion,
        },
      ),
    );
    const pdf = await this.readinessExportPdf.render(content);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="wizard-readiness-export-v${content.metadata.version}.pdf"`,
    );
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(Buffer.from(pdf));
  }
}
