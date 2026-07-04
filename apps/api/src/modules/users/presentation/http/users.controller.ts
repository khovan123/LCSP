import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";

import { CreateUserCommand } from "../../application/commands/create-user/create-user.command.js";
import { GetUserByIdQuery } from "../../application/queries/get-user-by-id/get-user-by-id.query.js";
import { CreateUserRequest } from "./dto/create-user.request.js";

@Controller("users")
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createUser(@Body() body: CreateUserRequest) {
    return this.commandBus.execute(
      new CreateUserCommand(body.email, body.displayName),
    );
  }

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }
}
