DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "RepositoryConnection"
    WHERE "authenticationMode" = 'GITHUB_APP'
      AND ("installationId" IS NULL OR "credentialAuthorizationId" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Existing GitHub App repository connections violate the authentication shape';
  END IF;
END $$;

ALTER TABLE "RepositoryConnection"
  ALTER COLUMN "installationId" DROP NOT NULL;

ALTER TABLE "RepositoryConnection"
  ADD CONSTRAINT "RepositoryConnection_authentication_shape_check"
  CHECK (
    (
      "authenticationMode" = 'GITHUB_APP'
      AND "installationId" IS NOT NULL
      AND "credentialAuthorizationId" IS NULL
    )
    OR
    (
      "authenticationMode" = 'GITHUB_CLI_CREDENTIAL'
      AND "installationId" IS NULL
      AND "credentialAuthorizationId" IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE "RepositoryConnection"
  VALIDATE CONSTRAINT "RepositoryConnection_authentication_shape_check";
