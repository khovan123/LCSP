import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { AdminAccountCommandService } from "../../services/admin-account-command.service.js";
import { SuspendUserCommand } from "./suspend-user.command.js";

@CommandHandler(SuspendUserCommand)
export class SuspendUserHandler implements ICommandHandler<SuspendUserCommand> {
  constructor(private readonly commandService: AdminAccountCommandService) {}

  async execute(command: SuspendUserCommand): Promise<AdminUserDetail> {
    return this.commandService.mutate(
      command.targetId,
      O.suspend,
      command.body,
      command.actor,
    );
  }
}
