import { BillingDomainError } from "./billing.errors.js";
import type { PricingRecord } from "./repositories/billing-transaction.port.js";

export type UsageDimensions = {
  inputTokens?: bigint;
  cachedInputTokens?: bigint;
  cacheWriteTokens?: bigint;
  outputTokens?: bigint;
  reasoningTokens?: bigint;
};

export function applyMarkup(
  providerCostCredits: bigint,
  markupBps = 0n,
): bigint {
  if (providerCostCredits < 0n || markupBps < 0n)
    throw new BillingDomainError("Markup inputs cannot be negative");
  const denominator = 10_000n;
  return (
    (providerCostCredits * (denominator + markupBps) + denominator - 1n) /
    denominator
  );
}

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
  const scale = 100000000n;
  const parse = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * scale + BigInt(fraction.padEnd(8, "0").slice(0, 8));
  };
  const entries: Array<[bigint, string | undefined]> = [
    [dimensions.inputTokens ?? 0n, pricing.inputPricePerMillion],
    [dimensions.cachedInputTokens ?? 0n, pricing.cachedInputPricePerMillion],
    [dimensions.cacheWriteTokens ?? 0n, pricing.cacheWritePricePerMillion],
    [dimensions.outputTokens ?? 0n, pricing.outputPricePerMillion],
    [dimensions.reasoningTokens ?? 0n, pricing.reasoningPricePerMillion],
  ];
  let numerator = 0n;
  for (const [tokens, price] of entries) {
    if (tokens < 0n)
      throw new BillingDomainError("Token counts cannot be negative");
    if (tokens > 0n && !price)
      throw new BillingDomainError(
        "Pricing snapshot lacks a required usage dimension price",
      );
    if (price) numerator += tokens * parse(price);
  }
  const denominator = 1_000_000n * scale;
  return (numerator + denominator - 1n) / denominator;
}
