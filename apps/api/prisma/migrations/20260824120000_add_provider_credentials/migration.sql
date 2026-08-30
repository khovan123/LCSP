CREATE TYPE "CredentialProvider" AS ENUM ('GITHUB');
CREATE TYPE "ProviderCredentialStatus" AS ENUM ('PENDING', 'ACTIVE', 'INVALID', 'EXPIRED', 'REVOKING', 'REVOKED', 'STORAGE_ERROR');
CREATE TYPE "CredentialAuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKING', 'REVOKED');
CREATE TYPE "RepositoryAuthenticationMode" AS ENUM ('GITHUB_APP', 'GITHUB_CLI_CREDENTIAL');

CREATE TABLE "ProviderCredential" (
  "id" TEXT NOT NULL, "provider" "CredentialProvider" NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "providerAccountId" BIGINT NOT NULL, "providerLogin" TEXT NOT NULL,
  "status" "ProviderCredentialStatus" NOT NULL, "currentVersion" INTEGER NOT NULL,
  "declaredExpiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "validatedAt" TIMESTAMP(3), "lastUsedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3), "revocationRequestedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  "lastFailureCode" TEXT, CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderCredentialSecret" (
  "id" TEXT NOT NULL, "providerCredentialId" TEXT NOT NULL, "credentialVersion" INTEGER NOT NULL,
  "envelopeVersion" INTEGER NOT NULL, "encryptionAlgorithm" TEXT NOT NULL,
  "ciphertext" BYTEA NOT NULL, "credentialNonce" BYTEA NOT NULL,
  "credentialAuthenticationTag" BYTEA NOT NULL, "wrappedDekCiphertext" BYTEA NOT NULL,
  "wrappingNonce" BYTEA NOT NULL, "wrappingAuthenticationTag" BYTEA NOT NULL,
  "kekVersion" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "destroyedAt" TIMESTAMP(3), CONSTRAINT "ProviderCredentialSecret_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CredentialAuthorization" (
  "id" TEXT NOT NULL, "providerCredentialId" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL, "repositoryFullName" TEXT NOT NULL, "assessmentId" TEXT,
  "authorizedByUserId" TEXT NOT NULL, "status" "CredentialAuthorizationStatus" NOT NULL,
  "credentialVersion" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validatedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  CONSTRAINT "CredentialAuthorization_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RepositoryConnection" ADD COLUMN "authenticationMode" "RepositoryAuthenticationMode";
ALTER TABLE "RepositoryConnection" ADD COLUMN "credentialAuthorizationId" TEXT;
UPDATE "RepositoryConnection" SET "authenticationMode" = 'GITHUB_APP' WHERE "authenticationMode" IS NULL;
ALTER TABLE "RepositoryConnection" ALTER COLUMN "authenticationMode" SET NOT NULL;
ALTER TABLE "RepositoryConnection" ALTER COLUMN "authenticationMode" SET DEFAULT 'GITHUB_APP';

CREATE INDEX "ProviderCredential_ownerUserId_status_idx" ON "ProviderCredential"("ownerUserId", "status");
CREATE INDEX "ProviderCredential_ownerUserId_provider_providerAccountId_idx" ON "ProviderCredential"("ownerUserId", "provider", "providerAccountId");
CREATE UNIQUE INDEX "ProviderCredentialSecret_providerCredentialId_credentialVersion_key" ON "ProviderCredentialSecret"("providerCredentialId", "credentialVersion");
CREATE INDEX "ProviderCredentialSecret_providerCredentialId_destroyedAt_idx" ON "ProviderCredentialSecret"("providerCredentialId", "destroyedAt");
CREATE INDEX "CredentialAuthorization_repositoryId_status_idx" ON "CredentialAuthorization"("repositoryId", "status");
CREATE INDEX "CredentialAuthorization_providerCredentialId_credentialVersion_status_idx" ON "CredentialAuthorization"("providerCredentialId", "credentialVersion", "status");
CREATE INDEX "CredentialAuthorization_assessmentId_idx" ON "CredentialAuthorization"("assessmentId");
CREATE UNIQUE INDEX "RepositoryConnection_credentialAuthorizationId_key" ON "RepositoryConnection"("credentialAuthorizationId");

ALTER TABLE "ProviderCredentialSecret" ADD CONSTRAINT "ProviderCredentialSecret_providerCredentialId_fkey" FOREIGN KEY ("providerCredentialId") REFERENCES "ProviderCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CredentialAuthorization" ADD CONSTRAINT "CredentialAuthorization_providerCredentialId_fkey" FOREIGN KEY ("providerCredentialId") REFERENCES "ProviderCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RepositoryConnection" ADD CONSTRAINT "RepositoryConnection_credentialAuthorizationId_fkey" FOREIGN KEY ("credentialAuthorizationId") REFERENCES "CredentialAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
