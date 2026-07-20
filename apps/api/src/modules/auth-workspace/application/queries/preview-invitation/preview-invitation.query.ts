export class PreviewInvitationQuery {
  constructor(
    readonly invitationToken: unknown,
    readonly correlationId?: string,
  ) {}
}
