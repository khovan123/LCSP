import { describe, expect, it } from "@jest/globals";
import {
  applyMarkup,
  calculateUsageChargeCredits,
} from "../src/modules/billing/domain/usage-pricing.js";
import type { PricingRecord } from "../src/modules/billing/domain/repositories/billing-transaction.port.js";

const pricing = {
  id: "p",
  provider: "OPENAI",
  model: "MODEL_A",
  inputPricePerMillion: "1.00000000",
  outputPricePerMillion: "2.00000000",
  version: 1,
  effectiveAt: new Date(),
} satisfies PricingRecord;

describe("usage pricing", () => {
  it("uses exact arithmetic and rounds the total charge up once", () => {
    expect(calculateUsageChargeCredits(1_000_000n, 500_000n, pricing)).toBe(2n);
    expect(calculateUsageChargeCredits(200_000n, 100_000n, pricing)).toBe(1n);
    expect(calculateUsageChargeCredits(1n, 0n, pricing)).toBe(1n);
  });

  it("rejects negative usage", () => {
    expect(() => calculateUsageChargeCredits(-1n, 0n, pricing)).toThrow();
  });

  it("prices cached, cache-write and reasoning dimensions independently", () => {
    const fullPricing = {
      ...pricing,
      cachedInputPricePerMillion: "0.50000000",
      cacheWritePricePerMillion: "1.50000000",
      reasoningPricePerMillion: "3.00000000",
    };
    expect(
      calculateUsageChargeCredits(
        {
          cachedInputTokens: 1_000_000n,
          cacheWriteTokens: 1_000_000n,
          reasoningTokens: 1_000_000n,
        },
        fullPricing,
      ),
    ).toBe(5n);
  });

  it("fails closed when usage has no corresponding snapshot price", () => {
    expect(() =>
      calculateUsageChargeCredits({ cachedInputTokens: 1n }, pricing),
    ).toThrow("required usage dimension price");
  });

  it("applies configured markup with final ceil rounding", () => {
    expect(applyMarkup(100n, 1500n)).toBe(115n);
    expect(applyMarkup(1n, 1n)).toBe(2n);
  });
});
