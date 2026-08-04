ALTER TYPE "AuthorizationReasonCode" ADD VALUE 'REAUTH_REQUIRED';

ALTER TABLE "AuthSession"
ADD COLUMN "sensitiveActionVerifiedAt" TIMESTAMP(3);
