import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import {
  BILLING_USAGE_COMMAND_KERNEL,
  type BillingUsageKernel,
} from "../../services/billing-usage-command-kernel.js";
import { ClaimBillingInvocationCommand } from "./claim-billing-invocation.command.js";

@CommandHandler(ClaimBillingInvocationCommand)
export class ClaimBillingInvocationHandler implements ICommandHandler<ClaimBillingInvocationCommand> {
  constructor(
    @Inject(BILLING_USAGE_COMMAND_KERNEL)
    private readonly billing: BillingUsageKernel,
  ) {}

  execute(command: ClaimBillingInvocationCommand) {
    return this.billing.claimInvocation(command.input);
  }
}
