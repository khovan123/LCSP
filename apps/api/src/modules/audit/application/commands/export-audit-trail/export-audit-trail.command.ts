export class ExportAuditTrailCommand {
  constructor(
    public readonly organizationId: string,
    public readonly sessionOrganizationId: string,
    public readonly requestedById: string,
    public readonly fromDate: string,
    public readonly toDate: string,
    public readonly correlationId: string,
  ) {}
}
