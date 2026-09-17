ALTER TABLE "BillingReservation"
  ADD COLUMN "maxInvocations" BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN "invocationsStarted" BIGINT NOT NULL DEFAULT 0;
