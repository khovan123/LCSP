import { Injectable } from "@nestjs/common";
import type { EffectiveRuntimeModel } from "@lcsp/contracts/billing";
import {
  calculateUsageChargeCredits,
  applyMarkup,
} from "../../domain/usage-pricing.js";
import type { PricingRecord } from "../../domain/repositories/billing-transaction.port.js";

@Injectable()
export class BillingEstimateService {
  estimate(input: {
    runtimeModel: EffectiveRuntimeModel;
    usage: Parameters<typeof calculateUsageChargeCredits>[0];
    pricing: PricingRecord;
  }) {
    const providerCostCredits = calculateUsageChargeCredits(
      input.usage,
      input.pricing,
    );
    const customerChargeCredits = applyMarkup(
      providerCostCredits,
      input.pricing.markupBps,
    );
    return {
      isEstimate: true as const,
      provider: input.runtimeModel.provider,
      model: input.runtimeModel.model,
      policyVersion: input.runtimeModel.policyVersion,
      providerCostCredits,
      customerChargeCredits,
      customerChargeVnd:
        input.pricing.fxRateVndNumerator && input.pricing.fxRateVndDenominator
          ? (customerChargeCredits * input.pricing.fxRateVndNumerator) /
            input.pricing.fxRateVndDenominator
          : undefined,
    };
  }
}
