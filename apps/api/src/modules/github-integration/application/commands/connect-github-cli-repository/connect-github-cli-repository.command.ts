export class ConnectGitHubCliRepositoryCommand {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly subjectRole: string,
    public readonly sessionId: string,
    public readonly credential: string,
    public readonly repositoryFullName: string,
    public readonly assessmentId: string | undefined,
    public readonly credentialExpiresAt: string | undefined,
    public readonly correlationId: string,
  ) {}
}
