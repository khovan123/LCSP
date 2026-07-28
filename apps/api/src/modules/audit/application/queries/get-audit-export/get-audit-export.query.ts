export class GetAuditExportQuery {
  constructor(
    public readonly organizationId: string,
    public readonly sessionOrganizationId: string,
    public readonly exportRequestId: string,
    public readonly correlationId: string,
  ) {}
}
