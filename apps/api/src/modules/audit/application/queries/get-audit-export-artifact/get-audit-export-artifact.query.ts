export class GetAuditExportArtifactQuery {
  constructor(
    public readonly organizationId: string,
    public readonly exportRequestId: string,
    public readonly correlationId: string,
  ) {}
}
