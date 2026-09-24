import { Inject } from "@nestjs/common";
import { QueryHandler } from "@nestjs/cqrs";
import type { IQueryHandler } from "@nestjs/cqrs";
import {
  BILLING_USAGE_KERNEL,
  type BillingUsagePort,
} from "../../shared/billing-usage.kernel.js";
import { ResolveBillingReservationOwnerQuery } from "./resolve-billing-reservation-owner.query.js";

@QueryHandler(ResolveBillingReservationOwnerQuery)
export class ResolveBillingReservationOwnerHandler implements IQueryHandler<ResolveBillingReservationOwnerQuery> {
  constructor(
    @Inject(BILLING_USAGE_KERNEL)
    private readonly billing: BillingUsagePort,
  ) {}

  execute(query: ResolveBillingReservationOwnerQuery) {
    return this.billing.resolveReservationOwner(query.reservationId);
  }
}
