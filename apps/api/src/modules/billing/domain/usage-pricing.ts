import { BillingDomainError } from "./billing.errors.js";
import type { PricingRecord } from "./repositories/billing-transaction.port.js";

export type UsageDimensions = {
  inputTokens?: bigint;
  cachedInputTokens?: bigint;
  cacheWriteTokens?: bigint;
  outputTokens?: bigint;
  reasoningTokens?: bigint;
};
const SCALE = 100000000n;
const DENOMINATOR = 1_000_000n * SCALE;

export function calculateUsageChargeCredits(
  usage: UsageDimensions | bigint,
  outputOrPricing: bigint | PricingRecord,
  maybePricing?: PricingRecord,
): bigint {
  const dimensions: UsageDimensions =
    typeof usage === "bigint"
      ? { inputTokens: usage, outputTokens: outputOrPricing as bigint }
      : usage;
  const pricing =
    typeof usage === "bigint"
      ? maybePricing
      : (outputOrPricing as PricingRecord);
  if (!pricing) throw new BillingDomainError("Pricing snapshot is required");
  return (usageNumerator(dimensions, pricing) + DENOMINATOR - 1n) / DENOMINATOR;
}

export function calculateCustomerChargeCredits(
  usage: UsageDimensions,
  pricing: PricingRecord,
): bigint {
  if (pricing.markupBps === undefined)
    throw new BillingDomainError("Markup snapshot is required");
  const numerator =
    usageNumerator(usage, pricing) * (10_000n + pricing.markupBps);
  return (numerator + DENOMINATOR * 10_000n - 1n) / (DENOMINATOR * 10_000n);
}

export function applyMarkup(
  providerCostCredits: bigint,
  markupBps: bigint,
): bigint {
  if (providerCostCredits < 0n || markupBps < 0n)
    throw new BillingDomainError("Markup inputs cannot be negative");
  return (providerCostCredits * (10_000n + markupBps) + 9_999n) / 10_000n;
}

function usageNumerator(
  usage: UsageDimensions,
  pricing: PricingRecord,
): bigint {
  const entries: Array<[bigint, string | undefined]> = [
    [usage.inputTokens ?? 0n, pricing.inputPricePerMillion],
    [usage.cachedInputTokens ?? 0n, pricing.cachedInputPricePerMillion],
    [usage.cacheWriteTokens ?? 0n, pricing.cacheWritePricePerMillion],
    [usage.outputTokens ?? 0n, pricing.outputPricePerMillion],
    [usage.reasoningTokens ?? 0n, pricing.reasoningPricePerMillion],
  ];
  let numerator = 0n;
  for (const [tokens, price] of entries) {
    if (tokens < 0n)
      throw new BillingDomainError("Token counts cannot be negative");
    if (tokens > 0n && !price)
      throw new BillingDomainError(
        "Pricing snapshot lacks a required usage dimension price",
      );
    if (price) {
      const [whole, fraction = ""] = price.split(".");
      numerator +=
        tokens *
        (BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, "0").slice(0, 8)));
    }
  }
  return numerator;
}
