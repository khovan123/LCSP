ALTER TABLE "ModelPricingSnapshot"
  ADD COLUMN "cachedInputPricePerMillion" DECIMAL(20,8),
  ADD COLUMN "cacheWritePricePerMillion" DECIMAL(20,8),
  ADD COLUMN "reasoningPricePerMillion" DECIMAL(20,8),
  ADD COLUMN "providerCurrency" TEXT,
  ADD COLUMN "customerCurrency" TEXT,
  ADD COLUMN "markupBps" BIGINT,
  ADD COLUMN "fxRateVndNumerator" BIGINT,
  ADD COLUMN "fxRateVndDenominator" BIGINT;

-- Historical price rows cannot safely be assigned a currency, markup, or FX
-- by a migration.  Deployments with such rows must backfill an immutable
-- successor snapshot explicitly before applying this schema change.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ModelPricingSnapshot") THEN
    RAISE EXCEPTION 'ModelPricingSnapshot rows require explicit currency and markup successor snapshots';
  END IF;
END $$;

ALTER TABLE "ModelPricingSnapshot"
  ALTER COLUMN "providerCurrency" SET NOT NULL,
  ALTER COLUMN "customerCurrency" SET NOT NULL,
  ALTER COLUMN "markupBps" SET NOT NULL;

ALTER TABLE "LlmUsageEvent"
  ADD COLUMN "cacheWriteTokens" BIGINT,
  ADD COLUMN "providerCostCredits" BIGINT,
  ADD COLUMN "customerChargeVnd" BIGINT;
