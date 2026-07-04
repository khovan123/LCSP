export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly displayName: string,
  ) {}
}
