import { Controller, Put, Param, Body, UseGuards, Req } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import type { Request } from "express";
import type {
  SaveWizardDraftRequest,
  SaveWizardDraftResponse,
} from "../../application/contracts/wizard/wizard-draft.contract.js";
import { SaveWizardDraftCommand } from "../../application/commands/save-wizard-draft/save-wizard-draft.command.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { randomUUID } from "node:crypto";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";

@Controller("assessments")
export class WizardController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(":assessmentId/wizard/draft")
  @UseGuards(PbacGuard)
  @RequireAction("wizard:write")
  async saveWizardDraft(
    @Param("assessmentId") assessmentId: string,
    @Body() body: SaveWizardDraftRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<SaveWizardDraftResponse> {
    const { userId, organizationId } = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return this.commandBus.execute(
      new SaveWizardDraftCommand(
        assessmentId,
        organizationId,
        userId,
        body.answers,
        correlationId,
      ),
    );
  }
}
