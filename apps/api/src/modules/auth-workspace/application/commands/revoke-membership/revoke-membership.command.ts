export class RevokeMembershipCommand {
  constructor(
    readonly input: {
      orgId: string;
      actorId: string;
      targetUserId: string;
      correlationId?: string;
    },
  ) {}
}
