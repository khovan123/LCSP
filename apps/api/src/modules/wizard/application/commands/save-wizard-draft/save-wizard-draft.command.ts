import { Command } from "@nestjs/cqrs";
import type { SaveWizardDraftResponse } from "../../contracts/wizard/wizard-draft.contract.js";

export class SaveWizardDraftCommand extends Command<SaveWizardDraftResponse> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly answers: Record<string, any> = {},
    public readonly correlationId: string,
  ) {
    super();
  }
}
