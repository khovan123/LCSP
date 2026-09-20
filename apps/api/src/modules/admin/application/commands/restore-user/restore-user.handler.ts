import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuthAuditService } from "../../../../auth/application/services/auth/auth-audit.service.js";
import { executeAdminAccountMutation } from "../admin-mutation.helper.js";
import { RestoreUserCommand } from "./restore-user.command.js";

@CommandHandler(RestoreUserCommand)
export class RestoreUserHandler implements ICommandHandler<RestoreUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(command: RestoreUserCommand): Promise<AdminUserDetail> {
    return executeAdminAccountMutation(
      this.prisma,
      this.audit,
      command.targetId,
      O.restore,
      command.body,
      command.actor,
    );
  }
}
