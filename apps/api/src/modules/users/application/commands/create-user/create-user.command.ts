import { Command } from "@nestjs/cqrs";

import type { UserDto } from "../../contracts/user/user.dto.js";

export class CreateUserCommand extends Command<UserDto> {
  constructor(
    public readonly email: string,
    public readonly displayName: string,
  ) {
    super();
  }
}
