export class MockEvidenceCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly correlationId: string,
  ) {}
}
