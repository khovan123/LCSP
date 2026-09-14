import { BillingDomainError } from "./billing.errors.js";
import type { PricingRecord } from "./repositories/billing-transaction.port.js";

/** Canonical, disjoint billable usage produced by a provider adapter. */
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

/** Carries exact provider-cost precision through the final markup rounding. */
export function calculateCustomerChargeCredits(
  usage: UsageDimensions,
  pricing: PricingRecord,
): bigint {
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

/** Converts with the immutable FX configuration carried by the pricing row. */
export function calculateCustomerChargeVnd(
  customerChargeCredits: bigint,
  pricing: PricingRecord,
): bigint {
  if (pricing.customerCurrency !== "VND")
    throw new BillingDomainError(
      "Pricing snapshot customer currency must be VND for wallet settlement",
    );
  if (pricing.providerCurrency === "VND") return customerChargeCredits;
  const hasNumerator = pricing.fxRateVndNumerator !== undefined;
  const hasDenominator = pricing.fxRateVndDenominator !== undefined;
  if (hasNumerator !== hasDenominator)
    throw new BillingDomainError("Pricing snapshot has a partial FX rate");
  if (!hasNumerator)
    throw new BillingDomainError(
      "Pricing snapshot lacks the required provider-to-VND FX rate",
    );
  if (pricing.fxRateVndNumerator! <= 0n || pricing.fxRateVndDenominator! <= 0n)
    throw new BillingDomainError("Pricing snapshot FX rate must be positive");
  return (
    (customerChargeCredits * pricing.fxRateVndNumerator! +
      pricing.fxRateVndDenominator! -
      1n) /
    pricing.fxRateVndDenominator!
  );
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
    if (price) numerator += tokens * fixedPoint(price);
  }
  return numerator;
}

function fixedPoint(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, "0").slice(0, 8));
}
