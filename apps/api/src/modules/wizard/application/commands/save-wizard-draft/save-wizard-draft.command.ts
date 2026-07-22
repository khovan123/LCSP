import { Command } from "@nestjs/cqrs";
import type { SubjectRole } from "@lcsp/contracts/pbac";
import type { SaveWizardDraftResponse } from "../../contracts/wizard/wizard-draft.contract.js";

export type ManagerOnlyAuthorizationContext = {
  subjectRole: SubjectRole;
  selectedAction: string | null;
  policyId: string | null;
  policyVersion: string | null;
};

export class SaveWizardDraftCommand extends Command<SaveWizardDraftResponse> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly answers: Record<string, any> = {},
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {
    super();
  }
}
