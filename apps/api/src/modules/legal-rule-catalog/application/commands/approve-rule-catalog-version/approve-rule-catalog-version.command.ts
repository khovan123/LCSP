export interface AuthorizationContext {
  subjectRole: string;
  selectedAction: string | null;
}

export class ApproveRuleCatalogVersionCommand {
  constructor(
    public readonly legalRuleCatalogVersionId: string,
    public readonly scopeDescription: string,
    public readonly comments: string | null,
    public readonly approvedBy: string,
    public readonly authorization: AuthorizationContext,
    public readonly correlationId: string,
  ) {}
}
