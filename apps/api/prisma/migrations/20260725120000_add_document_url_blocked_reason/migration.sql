-- Add documentUrl and blockedReason fields to DocumentRequest model
ALTER TABLE "DocumentRequest" ADD COLUMN "documentUrl" TEXT,
ADD COLUMN "blockedReason" TEXT;
