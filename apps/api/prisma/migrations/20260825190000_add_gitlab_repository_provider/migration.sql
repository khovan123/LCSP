ALTER TYPE "CredentialProvider" ADD VALUE IF NOT EXISTS 'GITLAB';
ALTER TYPE "RepositoryAuthenticationMode" ADD VALUE IF NOT EXISTS 'GITLAB_CLI_CREDENTIAL';

ALTER TABLE "RepositoryConnection"
  ADD COLUMN "provider" "CredentialProvider" NOT NULL DEFAULT 'GITHUB';

ALTER TABLE "RepositoryConnection"
  DROP CONSTRAINT IF EXISTS "RepositoryConnection_authentication_shape_check";

ALTER TABLE "RepositoryConnection"
  ADD CONSTRAINT "RepositoryConnection_authentication_shape_check"
  CHECK (
    (
      "authenticationMode" = 'GITHUB_APP'
      AND "provider" = 'GITHUB'
      AND "installationId" IS NOT NULL
      AND "credentialAuthorizationId" IS NULL
    )
    OR
    (
      "authenticationMode" = 'GITHUB_CLI_CREDENTIAL'
      AND "provider" = 'GITHUB'
      AND "installationId" IS NULL
      AND "credentialAuthorizationId" IS NOT NULL
    )
    OR
    (
      "authenticationMode" = 'GITLAB_CLI_CREDENTIAL'
      AND "provider" = 'GITLAB'
      AND "installationId" IS NULL
      AND "credentialAuthorizationId" IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE "RepositoryConnection"
  VALIDATE CONSTRAINT "RepositoryConnection_authentication_shape_check";
