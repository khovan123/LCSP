import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  ADMIN_ACCOUNT_OPERATIONS as O,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { AdminAccountCommandService } from "../../services/admin-account-command.service.js";
import { RestoreUserCommand } from "./restore-user.command.js";

@CommandHandler(RestoreUserCommand)
export class RestoreUserHandler implements ICommandHandler<RestoreUserCommand> {
  constructor(private readonly commandService: AdminAccountCommandService) {}

  async execute(command: RestoreUserCommand): Promise<AdminUserDetail> {
    return this.commandService.mutate(
      command.targetId,
      O.restore,
      command.body,
      command.actor,
    );
  }
}
