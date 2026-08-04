ALTER TYPE "AuditResourceType" ADD VALUE IF NOT EXISTS 'AUTH_MFA_RECOVERY_CODE';

CREATE TABLE IF NOT EXISTS "AuthMfaRecoveryCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "AuthMfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthMfaRecoveryCode_userId_codeHash_key"
ON "AuthMfaRecoveryCode"("userId", "codeHash");

CREATE INDEX IF NOT EXISTS "AuthMfaRecoveryCode_userId_batchId_idx"
ON "AuthMfaRecoveryCode"("userId", "batchId");

CREATE INDEX IF NOT EXISTS "AuthMfaRecoveryCode_userId_revokedAt_usedAt_idx"
ON "AuthMfaRecoveryCode"("userId", "revokedAt", "usedAt");

ALTER TABLE "AuthMfaRecoveryCode"
ADD CONSTRAINT "AuthMfaRecoveryCode_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
