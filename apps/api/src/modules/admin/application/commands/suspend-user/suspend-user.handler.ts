import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuthAuditService } from "../../../../auth/application/services/auth/auth-audit.service.js";
import { mutateAdminAccount } from "../../support/admin-account.mutator.js";
import { SuspendUserCommand } from "./suspend-user.command.js";

@CommandHandler(SuspendUserCommand)
export class SuspendUserHandler implements ICommandHandler<SuspendUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(command: SuspendUserCommand): Promise<AdminUserDetail> {
    return mutateAdminAccount(
      this.prisma,
      this.audit,
      command.targetId,
      O.suspend,
      command.body,
      command.actor,
    );
  }
}
