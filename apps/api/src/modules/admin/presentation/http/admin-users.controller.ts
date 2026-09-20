import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import {
  ListAdminUsersQuery,
  GetAdminUserDetailQuery,
} from "../../application/queries/index.js";
import {
  SuspendUserCommand,
  RestoreUserCommand,
} from "../../application/commands/index.js";
import { idempotency } from "../../application/services/admin-account.validation.js";
import type { AdminActor } from "../../application/services/admin-account.transaction.js";

@Controller("admin/users")
export class AdminUsersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async listUsers(
    @Query() query: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.queryBus.execute(
        new ListAdminUsersQuery(query, request.correlationId!),
      ),
    );
  }

  @Get(":id")
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async getUserDetail(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.queryBus.execute(
        new GetAdminUserDetailQuery(id, request.correlationId!),
      ),
    );
  }

  @Post(":id/suspend")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async suspendUser(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") key: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new SuspendUserCommand(id, body, this.actor(request, key)),
      ),
    );
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async restoreUser(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") key: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RestoreUserCommand(id, body, this.actor(request, key)),
      ),
    );
  }

  private actor(request: AuthenticatedRequest, key: unknown): AdminActor {
    return {
      ...request.rbacContext,
      correlationId: request.correlationId!,
      idempotencyKey: idempotency(key, request.correlationId!),
    };
  }
}
