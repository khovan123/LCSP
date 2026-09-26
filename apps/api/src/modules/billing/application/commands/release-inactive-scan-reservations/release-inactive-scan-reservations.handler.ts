import { Inject } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import {
  BILLING_USAGE_KERNEL,
  type BillingUsagePort,
} from "../../shared/billing-usage.kernel.js";
import { ReleaseInactiveScanReservationsCommand } from "./release-inactive-scan-reservations.command.js";

@CommandHandler(ReleaseInactiveScanReservationsCommand)
export class ReleaseInactiveScanReservationsHandler implements ICommandHandler<ReleaseInactiveScanReservationsCommand> {
  constructor(
    @Inject(BILLING_USAGE_KERNEL)
    private readonly billing: BillingUsagePort,
  ) {}

  execute(command: ReleaseInactiveScanReservationsCommand) {
    return this.billing.releaseInactiveScanReservations(command.assessmentId);
  }
}
