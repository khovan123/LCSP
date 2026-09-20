export class ListAdminUsersQuery {
  constructor(
    public readonly raw: Record<string, unknown>,
    public readonly correlationId: string,
  ) {}
}
