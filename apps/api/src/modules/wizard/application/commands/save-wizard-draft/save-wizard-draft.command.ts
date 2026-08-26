import { Command } from "@nestjs/cqrs";
import type { AuthUserRole } from "@lcsp/contracts/auth";
import type { WizardAnswer } from "@lcsp/contracts/wizard";
import type { SaveWizardDraftResponse } from "../../contracts/wizard/wizard-draft.contract.js";

export type ManagerOnlyAuthorizationContext = {
  subjectRole: AuthUserRole;
  selectedAction: string | null;
};

export class SaveWizardDraftCommand extends Command<SaveWizardDraftResponse> {
  constructor(
    public readonly assessmentId: string,
    public readonly ownerId: string,
    public readonly answers: WizardAnswer[] = [],
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {
    super();
  }
}
