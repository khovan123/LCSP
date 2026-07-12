export class InviteDeveloperCommand {
  constructor(
    readonly input: {
      orgId: string;
      actorId: string;
      email?: string;
      assessmentId?: string;
      allowedActions?: string[];
      expiresInHours?: number;
      correlationId?: string;
    },
  ) {}
}
