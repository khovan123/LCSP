export class RequestGapAnalysisCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly requestedById: string,
    public readonly correlationId: string,
  ) {}
}
