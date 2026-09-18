import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import {
  BILLING_USAGE_COMMAND_KERNEL,
  type BillingUsageKernel,
} from "../../services/billing-usage-command-kernel.js";
import { ReleaseBillingReservationCommand } from "./release-billing-reservation.command.js";

@CommandHandler(ReleaseBillingReservationCommand)
export class ReleaseBillingReservationHandler implements ICommandHandler<ReleaseBillingReservationCommand> {
  constructor(
    @Inject(BILLING_USAGE_COMMAND_KERNEL)
    private readonly billing: BillingUsageKernel,
  ) {}

  execute(command: ReleaseBillingReservationCommand) {
    return this.billing.releaseForAssessment(command.input);
  }
}
