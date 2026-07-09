import { Query } from "@nestjs/cqrs";

import type { UserDto } from "../../contracts/user/user.dto.js";

export class GetUserByIdQuery extends Query<UserDto> {
  constructor(public readonly id: string) {
    super();
  }
}
