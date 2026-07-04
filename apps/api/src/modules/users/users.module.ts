import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { CreateUserHandler } from "./application/commands/create-user/create-user.handler.js";
import { GetUserByIdHandler } from "./application/queries/get-user-by-id/get-user-by-id.handler.js";
import { USER_REPOSITORY } from "./application/ports/persistence/user.repository.js";
import { InMemoryUserRepository } from "./infrastructure/persistence/in-memory-user.repository.js";
import { UsersController } from "./presentation/http/users.controller.js";

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    CreateUserHandler,
    GetUserByIdHandler,
    InMemoryUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: InMemoryUserRepository,
    },
  ],
})
export class UsersModule {}
