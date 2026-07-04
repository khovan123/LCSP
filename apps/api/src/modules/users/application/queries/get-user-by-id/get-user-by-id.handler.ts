import { Inject, NotFoundException } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import type { IQueryHandler } from "@nestjs/cqrs";

import { UserMapper } from "../../mappers/user.mapper.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../ports/persistence/user.repository.js";
import { GetUserByIdQuery } from "./get-user-by-id.query.js";

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(query: GetUserByIdQuery) {
    const user = await this.userRepository.findById(query.id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return UserMapper.toDto(user);
  }
}
