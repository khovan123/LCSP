import { ConflictException, Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";

import { User } from "../../../domain/entities/user.entity.js";
import { UserMapper } from "../../mappers/user.mapper.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../ports/persistence/user.repository.js";
import { CreateUserCommand } from "./create-user.command.js";

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: CreateUserCommand) {
    const existingUser = await this.userRepository.findByEmail(command.email);

    if (existingUser) {
      throw new ConflictException("User email already exists");
    }

    const user = User.register({
      email: command.email,
      displayName: command.displayName,
    });

    await this.userRepository.save(user);

    return UserMapper.toDto(user);
  }
}
