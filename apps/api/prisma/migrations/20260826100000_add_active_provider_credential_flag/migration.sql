ALTER TABLE "ProviderCredential"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "organizationId", "ownerUserId", "provider"
    ORDER BY "validatedAt" DESC NULLS LAST, "id" DESC
  ) AS rank
  FROM "ProviderCredential"
  WHERE "status" = 'ACTIVE'
)
UPDATE "ProviderCredential" AS credential
SET "isActive" = false
FROM ranked
WHERE credential."id" = ranked."id" AND ranked.rank > 1;

UPDATE "ProviderCredential"
SET "isActive" = false
WHERE "status" <> 'ACTIVE';

CREATE INDEX "ProviderCredential_organizationId_ownerUserId_provider_isActive_idx"
ON "ProviderCredential"("organizationId", "ownerUserId", "provider", "isActive");

CREATE UNIQUE INDEX "ProviderCredential_one_active_per_scope"
ON "ProviderCredential"("organizationId", "ownerUserId", "provider")
WHERE "isActive" = true;
