import {
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { FinalReportRequestDto } from "../../application/contracts/document/final-report-request.contract.js";
import { RequestFinalReportCommand } from "../../application/commands/request-final-report/request-final-report.command.js";

@Controller("assessments")
export class DocumentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(":assessmentId/documents/final-report")
  @HttpCode(202)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.documentGenerate)
  async requestFinalReport(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<FinalReportRequestDto> {
    const correlationId =
      typeof request.correlationId === "string"
        ? request.correlationId
        : crypto.randomUUID();

    return this.commandBus.execute(
      new RequestFinalReportCommand(
        assessmentId,
        request.pbacContext.organizationId,
        request.pbacContext.userId,
        correlationId,
      ),
    );
  }
}
