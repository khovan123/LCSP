import { Controller, Put, Post, Param, Body, UseGuards, Req } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import type {
  SaveWizardDraftRequest,
  SaveWizardDraftResponse,
} from "../../application/contracts/wizard/wizard-draft.contract.js";
import type {
  SubmitWizardRequest,
  SubmitWizardResponse,
} from "../../application/contracts/wizard/wizard-submit.contract.js";
import { SaveWizardDraftCommand } from "../../application/commands/save-wizard-draft/save-wizard-draft.command.js";
import { SubmitWizardCommand } from "../../application/commands/submit-wizard/submit-wizard.command.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { randomUUID } from "node:crypto";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";

@Controller("assessments")
export class WizardController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(":assessmentId/wizard/draft")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardWrite)
  async saveWizardDraft(
    @Param("assessmentId") assessmentId: string,
    @Body() body: SaveWizardDraftRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<SaveWizardDraftResponse> {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return this.commandBus.execute(
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
    );
  }

  @Post(":assessmentId/wizard/submit")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.wizardSubmit)
  async submitWizard(
    @Param("assessmentId") assessmentId: string,
    @Body() body: SubmitWizardRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<SubmitWizardResponse> {
    const { userId, organizationId } = req.pbacContext;
    const pbacContext = req.pbacContext;
    const correlationId = req.correlationId || randomUUID();

    return this.commandBus.execute(
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
    );
  }
}
