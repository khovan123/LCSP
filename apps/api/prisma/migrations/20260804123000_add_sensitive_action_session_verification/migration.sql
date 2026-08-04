ALTER TYPE "AuthorizationReasonCode" ADD VALUE IF NOT EXISTS 'REAUTH_REQUIRED';

ALTER TABLE "AuthSession"
ADD COLUMN "sensitiveActionVerifiedAt" TIMESTAMP(3);
