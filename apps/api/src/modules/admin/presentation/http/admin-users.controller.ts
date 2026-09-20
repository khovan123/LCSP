import {
  ADMIN_ACCOUNT_ERRORS as E,
  AUTH_USER_ROLES,
} from "@lcsp/contracts/auth";
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
import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import {
  RestoreUserCommand,
  SuspendUserCommand,
} from "../../application/commands/index.js";
import {
  GetAdminUserDetailQuery,
  ListAdminUsersQuery,
} from "../../application/queries/index.js";
import type { AdminActor } from "../../infrastructure/persistence/admin-account.transaction.js";

function assertIdempotencyKey(key: unknown, correlationId: string): string {
  if (typeof key !== "string" || !key.trim() || key.length > 200) {
    throw problemException(E.idempotencyRequired, correlationId, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return key.trim();
}

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
      idempotencyKey: assertIdempotencyKey(key, request.correlationId!),
    };
  }
}
