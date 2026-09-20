import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuthAuditService } from "../../../../auth/application/services/auth/auth-audit.service.js";
import { mutateAdminAccount } from "../../support/admin-account.mutator.js";
import { RestoreUserCommand } from "./restore-user.command.js";

@CommandHandler(RestoreUserCommand)
export class RestoreUserHandler implements ICommandHandler<RestoreUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(command: RestoreUserCommand): Promise<AdminUserDetail> {
    return mutateAdminAccount(
      this.prisma,
      this.audit,
      command.targetId,
      O.restore,
      command.body,
      command.actor,
    );
  }
}
