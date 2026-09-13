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

/**
 * Normalises raw provider-reported dimensions to the billing invariant:
 *
 * When `reasoningTokens` is a sub-dimension of `outputTokens` (Anthropic,
 * OpenAI o-series), the caller MUST pass the raw provider values here.
 * This function verifies the sub-dimension relationship and returns a
 * billing-safe view in which:
 *   - `outputTokens`    = raw outputTokens − reasoningTokens  (non-reasoning slice)
 *   - `reasoningTokens` = raw reasoningTokens                 (unchanged)
 *
 * The pricing engine then prices each slice at its own rate, avoiding
 * double-billing of the reasoning portion.
 *
 * If the pricing record does NOT have a `reasoningPricePerMillion` the
 * dimensions are returned as-is (provider treats them as independent).
 */
export function normalizeUsageDimensions(
  raw: UsageDimensions,
  pricing: Pick<
    PricingRecord,
    "reasoningPricePerMillion" | "outputPricePerMillion"
  >,
): UsageDimensions {
  const reasoning = raw.reasoningTokens ?? 0n;
  const output = raw.outputTokens ?? 0n;

  // Only apply the sub-dimension split when BOTH output and reasoning are
  // non-zero AND the pricing record carries a distinct reasoning price.
  // When outputTokens is absent/zero the provider meters reasoning as a
  // fully independent dimension — raw values are already correct.
  if (!pricing.reasoningPricePerMillion || reasoning === 0n || output === 0n)
    return raw;

  if (reasoning > output)
    throw new BillingDomainError(
      "reasoningTokens exceeds outputTokens: provider reported an inconsistent usage shape",
    );

  return {
    ...raw,
    outputTokens: output - reasoning,
    reasoningTokens: reasoning,
  };
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
  const normalized = normalizeUsageDimensions(dimensions, pricing);
  return (usageNumerator(normalized, pricing) + DENOMINATOR - 1n) / DENOMINATOR;
}

export function calculateCustomerChargeCredits(
  usage: UsageDimensions,
  pricing: PricingRecord,
): bigint {
  if (pricing.markupBps === undefined)
    throw new BillingDomainError("Markup snapshot is required");
  // Zero-markup rows have no authority requirement — no markup is added
  // to the charge.  Estimates also use this function without a linked
  // snapshot; authority is enforced at the settlement boundary instead.
  if (pricing.markupBps > 0n && !pricing.markupSnapshotId)
    throw new BillingDomainError(
      "Markup snapshot authority (markupSnapshotId) must be linked when markupBps is applied",
    );
  const normalized = normalizeUsageDimensions(usage, pricing);
  const numerator =
    usageNumerator(normalized, pricing) * (10_000n + pricing.markupBps);
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
