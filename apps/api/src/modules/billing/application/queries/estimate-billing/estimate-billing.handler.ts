import { QueryHandler } from "@nestjs/cqrs";
import type { IQueryHandler } from "@nestjs/cqrs";
import { estimatePrepaid } from "../../shared/billing-application.helpers.js";
import { EstimateBillingQuery } from "./estimate-billing.query.js";

@QueryHandler(EstimateBillingQuery)
export class EstimateBillingHandler implements IQueryHandler<EstimateBillingQuery> {
  async execute(query: EstimateBillingQuery) {
    return estimatePrepaid(query.amountVnd);
  }
}
