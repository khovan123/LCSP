-- Add revocation timestamp for membership lifecycle auditing.
ALTER TABLE "AuthMembership" ADD COLUMN "revokedAt" TIMESTAMP(3);
