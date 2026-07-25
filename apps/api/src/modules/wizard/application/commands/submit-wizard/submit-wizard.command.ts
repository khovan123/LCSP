import { Command } from "@nestjs/cqrs";
import type { ManagerOnlyAuthorizationContext } from "../save-wizard-draft/save-wizard-draft.command.js";
import type { SubmitWizardResponse } from "../../contracts/wizard/wizard-submit.contract.js";

export class SubmitWizardCommand extends Command<SubmitWizardResponse> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly answers: Record<string, any>,
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {
    super();
  }
}
