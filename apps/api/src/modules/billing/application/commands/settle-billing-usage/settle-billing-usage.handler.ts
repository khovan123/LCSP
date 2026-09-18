import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import {
  BILLING_USAGE_COMMAND_KERNEL,
  type BillingUsageKernel,
} from "../../services/billing-usage-command-kernel.js";
import { SettleBillingUsageCommand } from "./settle-billing-usage.command.js";

@CommandHandler(SettleBillingUsageCommand)
export class SettleBillingUsageHandler implements ICommandHandler<SettleBillingUsageCommand> {
  constructor(
    @Inject(BILLING_USAGE_COMMAND_KERNEL)
    private readonly billing: BillingUsageKernel,
  ) {}

  execute(command: SettleBillingUsageCommand) {
    return this.billing.recordAndSettleUsage(command.input);
  }
}
