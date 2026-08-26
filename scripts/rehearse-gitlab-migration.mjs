import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const name = `lcsp-gitlab-migration-${crypto.randomUUID().slice(0, 8)}`;
const port = 55439;
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/lcsp_migration?schema=public`;

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: "inherit", ...options });
}

try {
  run("docker", [
    "run",
    "-d",
    "--name",
    name,
    "-e",
    "POSTGRES_USER=postgres",
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-e",
    "POSTGRES_DB=lcsp_migration",
    "-p",
    `${port}:5432`,
    "postgres:16-alpine",
  ]);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      run(
        "docker",
        ["exec", name, "pg_isready", "-U", "postgres", "-d", "lcsp_migration"],
        { stdio: "ignore" },
      );
      break;
    } catch {
      if (attempt === 29)
        throw new Error("Temporary PostgreSQL did not become ready");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  run(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "--filter",
      "@lcsp/api",
      "exec",
      "prisma",
      "migrate",
      "deploy",
      "--schema",
      "prisma/schema.prisma",
    ],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      shell: process.platform === "win32",
    },
  );

  const sql = String.raw`
    INSERT INTO "ProviderCredential" ("id","provider","organizationId","ownerUserId","providerAccountId","providerLogin","status","currentVersion","updatedAt")
    VALUES ('00000000-0000-0000-0000-000000000001','GITHUB','org','manager',1,'manager','ACTIVE',1,now());
    INSERT INTO "CredentialAuthorization" ("id","providerCredentialId","organizationId","repositoryId","repositoryFullName","authorizedByUserId","status","credentialVersion","validatedAt")
    VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','org','repo-auth','group/repo-auth','manager','ACTIVE',1,now()),
           ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','org','repo-cli','owner/repo-cli','manager','ACTIVE',1,now()),
           ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','org','repo-gl','group/repo-gl','manager','ACTIVE',1,now());
    INSERT INTO "RepositoryConnection" ("id","organizationId","userId","provider","installationId","authenticationMode","repositoryId","repositoryName","repositoryFullName","defaultBranch","permissions")
    VALUES ('00000000-0000-0000-0000-000000000001','org','manager','GITHUB','installation-1','GITHUB_APP','repo-app','repo-app','owner/repo-app','main','{}');
    INSERT INTO "RepositoryConnection" ("id","organizationId","userId","provider","authenticationMode","credentialAuthorizationId","repositoryId","repositoryName","repositoryFullName","defaultBranch","permissions")
    VALUES ('00000000-0000-0000-0000-000000000002','org','manager','GITHUB','GITHUB_CLI_CREDENTIAL','00000000-0000-0000-0000-000000000002','repo-cli','repo-cli','owner/repo-cli','main','{}');
    INSERT INTO "RepositoryConnection" ("id","organizationId","userId","provider","authenticationMode","credentialAuthorizationId","repositoryId","repositoryName","repositoryFullName","defaultBranch","permissions")
    VALUES ('00000000-0000-0000-0000-000000000003','org','manager','GITLAB','GITLAB_CLI_CREDENTIAL','00000000-0000-0000-0000-000000000003','repo-gl','repo-gl','group/repo-gl','main','{}');
    DO $$ BEGIN
      BEGIN
        INSERT INTO "RepositoryConnection" ("id","organizationId","userId","provider","installationId","authenticationMode","credentialAuthorizationId","repositoryId","repositoryName","repositoryFullName","defaultBranch","permissions")
        VALUES ('00000000-0000-0000-0000-000000000011','org','manager','GITLAB','installation-invalid','GITHUB_APP','00000000-0000-0000-0000-000000000001','bad-1','bad','group/bad-1','main','{}');
        RAISE EXCEPTION 'invalid provider/auth shape was accepted';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
      BEGIN
        INSERT INTO "RepositoryConnection" ("id","organizationId","userId","provider","installationId","authenticationMode","credentialAuthorizationId","repositoryId","repositoryName","repositoryFullName","defaultBranch","permissions")
        VALUES ('00000000-0000-0000-0000-000000000012','org','manager','GITLAB','installation-invalid','GITLAB_CLI_CREDENTIAL','00000000-0000-0000-0000-000000000001','bad-2','bad','group/bad-2','main','{}');
        RAISE EXCEPTION 'invalid GitLab installation shape was accepted';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
      BEGIN
        INSERT INTO "RepositoryConnection" ("id","organizationId","userId","provider","installationId","authenticationMode","repositoryId","repositoryName","repositoryFullName","defaultBranch","permissions")
        VALUES ('00000000-0000-0000-0000-000000000013','org','manager','GITLAB','installation-invalid','GITHUB_APP','bad-3','bad','group/bad-3','main','{}');
        RAISE EXCEPTION 'invalid GitHub App provider shape was accepted';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
    END $$;
  `;
  run("docker", [
    "exec",
    "-i",
    name,
    "psql",
    "-U",
    "postgres",
    "-d",
    "lcsp_migration",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);
  console.log("MIGRATION_REHEARSAL=PASS");
} finally {
  try {
    run("docker", ["rm", "-f", name], { stdio: "ignore" });
  } catch {
    // Cleanup is best effort; the container is disposable and named uniquely.
  }
}
