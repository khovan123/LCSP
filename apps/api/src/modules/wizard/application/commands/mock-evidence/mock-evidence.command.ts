import type { ManagerOnlyAuthorizationContext } from "../save-wizard-draft/save-wizard-draft.command.js";

export class MockEvidenceCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {}
}
