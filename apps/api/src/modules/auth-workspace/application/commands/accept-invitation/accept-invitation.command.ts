export class AcceptInvitationCommand {
  constructor(
    readonly input: {
      invitationToken?: string;
      displayName?: string;
      password?: string;
      correlationId?: string;
    },
  ) {}
}
