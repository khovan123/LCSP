import { randomUUID } from "node:crypto";

import { HttpStatus, Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";

import { User } from "../../../domain/entities/user.entity.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
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
      throw problemException(AUTH_ERROR_CODES.validationFailed, randomUUID(), {
        status: HttpStatus.CONFLICT,
      });
    }

    const user = User.register({
      email: command.email,
      displayName: command.displayName,
    });

    await this.userRepository.save(user);

    return UserMapper.toDto(user);
  }
}
