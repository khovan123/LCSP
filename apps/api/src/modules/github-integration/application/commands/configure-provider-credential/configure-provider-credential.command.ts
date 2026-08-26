export class ConfigureProviderCredentialCommand {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly subjectRole: string,
    public readonly sessionId: string,
    public readonly provider: string,
    public readonly credential: string,
    public readonly correlationId: string,
  ) {}
}
