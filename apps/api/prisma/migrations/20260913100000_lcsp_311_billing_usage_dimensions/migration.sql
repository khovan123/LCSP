ALTER TABLE "ModelPricingSnapshot"
  ADD COLUMN "cachedInputPricePerMillion" DECIMAL(20,8),
  ADD COLUMN "cacheWritePricePerMillion" DECIMAL(20,8),
  ADD COLUMN "reasoningPricePerMillion" DECIMAL(20,8),
  ADD COLUMN "markupBps" BIGINT,
  ADD COLUMN "fxRateVndNumerator" BIGINT,
  ADD COLUMN "fxRateVndDenominator" BIGINT,
  ADD COLUMN "markupSnapshotId" TEXT,
  ADD COLUMN "fxSnapshotId" TEXT;

ALTER TABLE "LlmUsageEvent"
  ADD COLUMN "cacheWriteTokens" BIGINT,
  ADD COLUMN "providerCostCredits" BIGINT,
  ADD COLUMN "customerChargeVnd" BIGINT,
  ADD COLUMN "markupSnapshotId" TEXT,
  ADD COLUMN "fxSnapshotId" TEXT;

CREATE TABLE "BillingMarkupSnapshot" (
  "id" TEXT NOT NULL,
  "markupBps" BIGINT NOT NULL,
  "version" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingMarkupSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingMarkupSnapshot_version_key" ON "BillingMarkupSnapshot"("version");
CREATE INDEX "BillingMarkupSnapshot_effectiveAt_idx" ON "BillingMarkupSnapshot"("effectiveAt");

CREATE TABLE "BillingFxSnapshot" (
  "id" TEXT NOT NULL,
  "fromCurrency" TEXT NOT NULL,
  "toCurrency" TEXT NOT NULL,
  "numerator" BIGINT NOT NULL,
  "denominator" BIGINT NOT NULL,
  "version" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingFxSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingFxSnapshot_currency_version_key" ON "BillingFxSnapshot"("fromCurrency", "toCurrency", "version");
CREATE INDEX "BillingFxSnapshot_currency_effectiveAt_idx" ON "BillingFxSnapshot"("fromCurrency", "toCurrency", "effectiveAt");
