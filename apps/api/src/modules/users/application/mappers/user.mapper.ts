import { User } from "../../domain/entities/user.entity.js";
import type { UserDto } from "../contracts/user/user.dto.js";

export class UserMapper {
  static toDto(user: User): UserDto {
    return {
      id: user.id.toString(),
      email: user.email.toString(),
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
