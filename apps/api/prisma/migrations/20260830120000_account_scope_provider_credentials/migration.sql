-- Provider credentials belong to an authenticated account, not an organization.
DROP INDEX IF EXISTS "ProviderCredential_one_active_per_scope";
DROP INDEX IF EXISTS "ProviderCredential_organizationId_ownerUserId_isActive_idx";
DROP INDEX IF EXISTS "ProviderCredential_organizationId_provider_providerAccountId_idx";
DROP INDEX IF EXISTS "CredentialAuthorization_organizationId_repositoryId_status_idx";

-- The AAD format changed from organization+owner identity to owner identity.
-- Existing ciphertext is therefore intentionally invalidated; users must configure
-- their provider credential again after this migration.
UPDATE "ProviderCredential"
SET "status" = 'INVALID',
    "isActive" = false,
    "invalidatedAt" = COALESCE("invalidatedAt", NOW()),
    "lastFailureCode" = 'CREDENTIAL_INVALID'
WHERE "isActive" = true;

UPDATE "CredentialAuthorization"
SET "status" = 'REVOKED',
    "revokedAt" = COALESCE("revokedAt", NOW())
WHERE "status" = 'ACTIVE';

UPDATE "ProviderCredentialSecret"
SET "destroyedAt" = COALESCE("destroyedAt", NOW())
WHERE "destroyedAt" IS NULL;

ALTER TABLE "ProviderCredential" DROP COLUMN IF EXISTS "organizationId";
ALTER TABLE "CredentialAuthorization" DROP COLUMN IF EXISTS "organizationId";

CREATE INDEX IF NOT EXISTS "ProviderCredential_ownerUserId_isActive_idx"
  ON "ProviderCredential"("ownerUserId", "isActive");
CREATE INDEX IF NOT EXISTS "ProviderCredential_ownerUserId_provider_providerAccountId_idx"
  ON "ProviderCredential"("ownerUserId", "provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderCredential_ownerUserId_provider_active_key"
  ON "ProviderCredential"("ownerUserId", "provider")
  WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "CredentialAuthorization_repositoryId_status_idx"
  ON "CredentialAuthorization"("repositoryId", "status");
