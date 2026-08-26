/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AssessmentStatus,
  CredentialProvider,
  PrismaClient,
  RepositoryAuthenticationMode,
  WizardProfileStatus,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { CREDENTIAL_PROVIDERS } from "@lcsp/contracts/github-integration";
import { GITHUB_CREDENTIAL_ERROR_CODES } from "@lcsp/contracts/github-integration";

import { ConfigureProviderCredentialCommand } from "../configure-provider-credential/configure-provider-credential.command.js";
import { ConfigureProviderCredentialHandler } from "../configure-provider-credential/configure-provider-credential.handler.js";
import { ConnectAssessmentRepositoryCommand } from "./connect-assessment-repository.command.js";
import { ConnectAssessmentRepositoryHandler } from "./connect-assessment-repository.handler.js";
import { PrismaCredentialPersistenceUnitOfWork } from "../../../infrastructure/persistence/prisma-credential-persistence.unit-of-work.js";
import { PrismaActiveProviderCredentialResolver } from "../../../infrastructure/persistence/prisma-active-provider-credential.resolver.js";
import { PrismaDatabaseCredentialStore } from "../../../infrastructure/persistence/prisma-database-credential.store.js";
import { EnvelopeEncryptionService } from "../../../infrastructure/security/envelope-encryption.service.js";
import { DevelopmentStaticKeyEncryptionKeyProvider } from "../../../infrastructure/security/development-static-key-encryption-key.provider.js";
import { GitLabCliProviderError } from "../../../infrastructure/gitlab/gitlab-cli-repository.provider.js";
import { PrismaRepositoryConnectionRepository } from "../../../infrastructure/persistence/prisma-github-integration.repository.js";
import { PrismaRepositorySnapshotRepository } from "../../../infrastructure/persistence/prisma-repository-snapshot.repository.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { PinSnapshotHandler } from "../pin-snapshot/pin-snapshot.handler.js";
import { PinSnapshotCommand } from "../pin-snapshot/pin-snapshot.command.js";
import { CredentialLease } from "../../security/credential-lease.js";

const databaseUrl =
  process.env.PHASE25_DATABASE_URL ?? process.env.DATABASE_URL;
const run = databaseUrl ? describe : describe.skip;

run("ConnectAssessmentRepository credential provenance", () => {
  let prisma: PrismaClient;
  let configure: ConfigureProviderCredentialHandler;
  let connect: ConnectAssessmentRepositoryHandler;
  let rollbackConnect: ConnectAssessmentRepositoryHandler;
  const provider = {
    validateIdentity: jest.fn(async () => ({
      id: "7001",
      login: "synthetic-user",
      htmlUrl: "https://example.test/synthetic-user",
    })),
    validateRepositoryAccess: jest.fn(
      async (_lease, repositoryFullName: string) =>
        repositoryFullName.includes("acme/example-repo")
          ? {
              id: "8002",
              name: "example-repo",
              fullName: "acme/example-repo",
              defaultBranch: "main",
              private: true,
            }
          : {
              id: "7002",
              name: "project",
              fullName: "group/project",
              defaultBranch: "main",
              private: true,
            },
    ),
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl!) });
    await prisma.$connect();
    await prisma.repositoryConnection.deleteMany({
      where: { organizationId: "provenance-org" },
    });
    await prisma.credentialAuthorization.deleteMany({
      where: { organizationId: "provenance-org" },
    });
    await prisma.wizardProfile.deleteMany({
      where: { organizationId: "provenance-org" },
    });
    await prisma.assessment.deleteMany({
      where: { organizationId: "provenance-org" },
    });
    await prisma.providerCredentialSecret.deleteMany();
    await prisma.providerCredential.deleteMany({
      where: { organizationId: "provenance-org" },
    });
    const prismaService = prisma as never;
    const encryption = new EnvelopeEncryptionService(
      new DevelopmentStaticKeyEncryptionKeyProvider(
        "test",
        new Map([["test", Buffer.alloc(32, 9)]]),
      ),
    );
    const unitOfWork = new PrismaCredentialPersistenceUnitOfWork(
      prismaService,
      encryption,
    );
    const config = { get: () => ({ enabled: true }) } as never;
    const registry = { get: () => provider } as never;
    configure = new ConfigureProviderCredentialHandler(
      provider as never,
      config,
      unitOfWork,
      registry,
    );
    const store = new PrismaDatabaseCredentialStore(
      prismaService,
      encryption,
      prisma,
    );
    const resolver = new PrismaActiveProviderCredentialResolver(
      prismaService,
      store,
    );
    connect = new ConnectAssessmentRepositoryHandler(
      prismaService,
      config,
      unitOfWork,
      resolver,
      registry,
    );
    rollbackConnect = new (class extends ConnectAssessmentRepositoryHandler {
      protected persistRepositoryConnection(
        _transaction: never,
        _data: never,
      ): Promise<unknown> {
        throw new Error("synthetic repository persistence failure");
      }
    })(prismaService, config, unitOfWork, resolver, registry);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const configureCommand = (credential: string) =>
    new ConfigureProviderCredentialCommand(
      "provenance-org",
      "provenance-user",
      SUBJECT_ROLES.manager,
      "synthetic-session",
      CREDENTIAL_PROVIDERS.gitlab,
      credential,
      "synthetic-correlation",
    );

  const configureFor = (
    organizationId: string,
    userId: string,
    providerName: string,
    credential: string,
  ) =>
    new ConfigureProviderCredentialCommand(
      organizationId,
      userId,
      SUBJECT_ROLES.manager,
      "synthetic-session",
      providerName,
      credential,
      "synthetic-correlation",
    );

  const connectCommand = (assessmentId: string) =>
    new ConnectAssessmentRepositoryCommand(
      assessmentId,
      "provenance-org",
      "provenance-user",
      SUBJECT_ROLES.manager,
      "https://gitlab.com/group/project",
      "synthetic-correlation",
    );

  const createAssessment = async (id: string) => {
    await prisma.assessment.create({
      data: {
        id,
        organizationId: "provenance-org",
        ownerId: "provenance-user",
        name: id,
        status: AssessmentStatus.WIZARD_SUBMITTED,
      },
    });
    await prisma.wizardProfile.create({
      data: {
        id: `${id}-wizard`,
        assessmentId: id,
        organizationId: "provenance-org",
        ownerId: "provenance-user",
        status: WizardProfileStatus.SUBMITTED,
        answers: {},
        submittedAt: new Date(),
      },
    });
  };

  const countForAssessment = async (assessmentId: string) => ({
    authorizations: await prisma.credentialAuthorization.count({
      where: { assessmentId },
    }),
    connections: await prisma.repositoryConnection.count({
      where: { assessmentId },
    }),
  });

  it("binds historical connections to A and new connections to B", async () => {
    await configure.execute(configureCommand("synthetic-provenance-a"));
    await createAssessment("provenance-a1");
    const first = await connect.execute(connectCommand("provenance-a1"));
    const firstConnection = await prisma.repositoryConnection.findUniqueOrThrow(
      {
        where: { id: first.connectionId },
        include: { credentialAuthorization: true },
      },
    );
    const authorizationA = firstConnection.credentialAuthorization!;
    const credentialA = authorizationA.providerCredentialId;
    expect(firstConnection.authenticationMode).toBe(
      RepositoryAuthenticationMode.GITLAB_CLI_CREDENTIAL,
    );
    expect(authorizationA.organizationId).toBe("provenance-org");

    await configure.execute(configureCommand("synthetic-provenance-b"));
    const historical = await prisma.repositoryConnection.findUniqueOrThrow({
      where: { id: first.connectionId },
      include: { credentialAuthorization: true },
    });
    expect(historical.credentialAuthorizationId).toBe(authorizationA.id);
    expect(historical.credentialAuthorization?.providerCredentialId).toBe(
      credentialA,
    );

    await createAssessment("provenance-a2");
    const second = await connect.execute(connectCommand("provenance-a2"));
    const secondConnection =
      await prisma.repositoryConnection.findUniqueOrThrow({
        where: { id: second.connectionId },
        include: { credentialAuthorization: true },
      });
    expect(
      secondConnection.credentialAuthorization?.providerCredentialId,
    ).not.toBe(credentialA);
    expect(secondConnection.credentialAuthorization?.providerCredentialId).toBe(
      (
        await prisma.providerCredential.findFirstOrThrow({
          where: {
            organizationId: "provenance-org",
            isActive: true,
            provider: CredentialProvider.GITLAB,
          },
        })
      ).id,
    );

    await connect.execute(connectCommand("provenance-a2"));
    expect(
      await prisma.repositoryConnection.count({
        where: { assessmentId: "provenance-a2" },
      }),
    ).toBe(1);
    expect(
      await prisma.credentialAuthorization.count({
        where: { assessmentId: "provenance-a2" },
      }),
    ).toBe(1);
  });

  it("does not persist when the provider credential is missing", async () => {
    const assessmentId = "provenance-missing";
    await prisma.assessment.create({
      data: {
        id: assessmentId,
        organizationId: "missing-org",
        ownerId: "missing-user",
        name: assessmentId,
        status: AssessmentStatus.WIZARD_SUBMITTED,
      },
    });
    provider.validateRepositoryAccess.mockClear();
    await expect(
      connect.execute(
        new ConnectAssessmentRepositoryCommand(
          assessmentId,
          "missing-org",
          "missing-user",
          SUBJECT_ROLES.manager,
          "https://gitlab.com/group/project",
          "synthetic-correlation",
        ),
      ),
    ).rejects.toBeDefined();
    expect(await countForAssessment(assessmentId)).toEqual({
      authorizations: 0,
      connections: 0,
    });
    expect(provider.validateRepositoryAccess).not.toHaveBeenCalled();
  });

  it("selects credentials by provider and owner scope", async () => {
    await configure.execute(
      configureFor(
        "scope-org",
        "scope-user",
        CREDENTIAL_PROVIDERS.github,
        "synthetic-github-scope-credential",
      ),
    );
    await configure.execute(
      configureFor(
        "scope-org",
        "scope-user",
        CREDENTIAL_PROVIDERS.gitlab,
        "synthetic-gitlab-scope-credential",
      ),
    );
    await configure.execute(
      configureFor(
        "scope-org",
        "other-user",
        CREDENTIAL_PROVIDERS.gitlab,
        "synthetic-other-user-credential",
      ),
    );
    await createAssessment("scope-assessment");
    await prisma.assessment.update({
      where: { id: "scope-assessment" },
      data: { organizationId: "scope-org", ownerId: "scope-user" },
    });
    const result = await connect.execute(
      new ConnectAssessmentRepositoryCommand(
        "scope-assessment",
        "scope-org",
        "scope-user",
        SUBJECT_ROLES.manager,
        "https://gitlab.com/group/project",
        "synthetic-correlation",
      ),
    );
    const connection = await prisma.repositoryConnection.findUniqueOrThrow({
      where: { id: result.connectionId },
      include: {
        credentialAuthorization: { include: { providerCredential: true } },
      },
    });
    expect(
      connection.credentialAuthorization?.providerCredential.provider,
    ).toBe(CredentialProvider.GITLAB);
    expect(
      connection.credentialAuthorization?.providerCredential.ownerUserId,
    ).toBe("scope-user");
  });

  it("does not persist access-denied or invalid-provider failures", async () => {
    await configure.execute(configureCommand("synthetic-negative-credential"));
    const deniedAssessment = "provenance-denied";
    await createAssessment(deniedAssessment);
    provider.validateRepositoryAccess.mockRejectedValueOnce(
      new GitLabCliProviderError(
        GITHUB_CREDENTIAL_ERROR_CODES.repositoryAccessDenied,
      ),
    );
    await expect(
      connect.execute(connectCommand(deniedAssessment)),
    ).rejects.toBeDefined();
    expect(await countForAssessment(deniedAssessment)).toEqual({
      authorizations: 0,
      connections: 0,
    });

    const invalidAssessment = "provenance-invalid";
    await createAssessment(invalidAssessment);
    provider.validateRepositoryAccess.mockRejectedValueOnce(
      new GitLabCliProviderError(
        GITHUB_CREDENTIAL_ERROR_CODES.credentialInvalid,
      ),
    );
    await expect(
      connect.execute(connectCommand(invalidAssessment)),
    ).rejects.toBeDefined();
    expect(await countForAssessment(invalidAssessment)).toEqual({
      authorizations: 0,
      connections: 0,
    });
  });

  it("rolls back authorization when connection persistence fails", async () => {
    await configure.execute(configureCommand("synthetic-atomicity-credential"));
    const assessmentId = "provenance-atomicity";
    await createAssessment(assessmentId);
    const before = await countForAssessment(assessmentId);
    await expect(
      rollbackConnect.execute(connectCommand(assessmentId)),
    ).rejects.toThrow("synthetic repository persistence failure");
    expect(await countForAssessment(assessmentId)).toEqual(before);
    expect(
      await prisma.providerCredential.count({
        where: {
          organizationId: "provenance-org",
          ownerUserId: "provenance-user",
          provider: CredentialProvider.GITLAB,
          isActive: true,
        },
      }),
    ).toBe(1);
  });

  it("pins a snapshot from the readiness-created GitLab connection", async () => {
    await configure.execute(configureCommand("synthetic-snapshot-credential"));
    const assessmentId = "provenance-snapshot";
    await createAssessment(assessmentId);
    const result = await connect.execute(connectCommand(assessmentId));
    const connectionRepository = new PrismaRepositoryConnectionRepository(
      prisma as never,
    );
    const snapshotRepository = new PrismaRepositorySnapshotRepository(
      prisma as never,
      new OutboxRepository(prisma as never),
    );
    const snapshotProvider = {
      resolveCommit: jest.fn(async () => ({
        sha: "a".repeat(40),
        repositoryFullName: "group/project",
        htmlUrl: `https://gitlab.com/group/project/-/commit/${"a".repeat(40)}`,
        authorDate: "2026-01-01T00:00:00.000Z",
        committerDate: "2026-01-01T00:00:01.000Z",
      })),
    };
    const githubSnapshotProvider = {
      resolveCommit: jest.fn(async () => ({
        sha: "b".repeat(40),
        repositoryFullName: "acme/example-repo",
        htmlUrl: `https://github.com/acme/example-repo/commit/${"b".repeat(40)}`,
        authorDate: "2026-01-01T00:00:00.000Z",
        committerDate: "2026-01-01T00:00:01.000Z",
      })),
    };
    const pin = new PinSnapshotHandler(
      connectionRepository,
      snapshotRepository,
      {} as never,
      {
        resolveForConnection: jest.fn(
          async () =>
            new CredentialLease("synthetic-snapshot-credential", {
              internalCredentialId: "synthetic",
              credentialVersion: 1,
              repositoryFullName: "group/project",
              expiresAt: new Date(Date.now() + 60_000),
            }),
        ),
        markInvalid: jest.fn(),
      } as never,
      snapshotProvider as never,
      { get: () => ({ snapshotPinningEnabled: true }) } as never,
      prisma as never,
      { write: jest.fn(async () => undefined) } as never,
      { get: () => snapshotProvider } as never,
    );
    await pin.execute(
      new PinSnapshotCommand(
        assessmentId,
        "provenance-org",
        "provenance-user",
        SUBJECT_ROLES.manager,
        undefined,
        result.connectionId,
        undefined,
        undefined,
        undefined,
        "synthetic-correlation",
      ),
    );
    const snapshot = await prisma.repositorySnapshot.findFirstOrThrow({
      where: { assessmentId },
    });
    expect(snapshot.connectionId).toBe(result.connectionId);
    expect(snapshot.repositoryId).toBe("7002");
    expect(snapshot.repositoryFullName).toBe("group/project");
    expect(snapshot.commitSha).toBe("a".repeat(40));
    expect(JSON.stringify(snapshot.providerMetadata)).not.toContain(
      "synthetic-snapshot-credential",
    );
  });

  it("pins a snapshot from the readiness-created GitHub CLI connection", async () => {
    const organizationId = "github-snapshot-org";
    const userId = "github-snapshot-user";
    const assessmentId = "github-snapshot-assessment";
    await configure.execute(
      configureFor(
        organizationId,
        userId,
        CREDENTIAL_PROVIDERS.github,
        "synthetic-github-snapshot-credential",
      ),
    );
    await prisma.assessment.create({
      data: {
        id: assessmentId,
        organizationId,
        ownerId: userId,
        name: assessmentId,
        status: AssessmentStatus.WIZARD_SUBMITTED,
      },
    });
    const connectionResult = await connect.execute(
      new ConnectAssessmentRepositoryCommand(
        assessmentId,
        organizationId,
        userId,
        SUBJECT_ROLES.manager,
        "https://github.com/acme/example-repo",
        "synthetic-correlation",
      ),
    );
    const githubSnapshotProvider = {
      resolveCommit: jest.fn(async () => ({
        sha: "b".repeat(40),
        repositoryFullName: "acme/example-repo",
        htmlUrl: `https://github.com/acme/example-repo/commit/${"b".repeat(40)}`,
        authorDate: "2026-01-01T00:00:00.000Z",
        committerDate: "2026-01-01T00:00:01.000Z",
      })),
    };
    const pin = new PinSnapshotHandler(
      new PrismaRepositoryConnectionRepository(prisma as never),
      new PrismaRepositorySnapshotRepository(
        prisma as never,
        new OutboxRepository(prisma as never),
      ),
      {} as never,
      {
        resolveForConnection: jest.fn(
          async () =>
            new CredentialLease("synthetic-github-snapshot-credential", {
              internalCredentialId: "synthetic",
              credentialVersion: 1,
              repositoryFullName: "acme/example-repo",
              expiresAt: new Date(Date.now() + 60_000),
            }),
        ),
        markInvalid: jest.fn(),
      } as never,
      githubSnapshotProvider as never,
      { get: () => ({ snapshotPinningEnabled: true }) } as never,
      prisma as never,
      { write: jest.fn(async () => undefined) } as never,
      { get: () => githubSnapshotProvider } as never,
    );
    await pin.execute(
      new PinSnapshotCommand(
        assessmentId,
        organizationId,
        userId,
        SUBJECT_ROLES.manager,
        undefined,
        connectionResult.connectionId,
        undefined,
        undefined,
        undefined,
        "synthetic-correlation",
      ),
    );
    const snapshot = await prisma.repositorySnapshot.findFirstOrThrow({
      where: { assessmentId },
    });
    expect(snapshot.connectionId).toBe(connectionResult.connectionId);
    expect(snapshot.repositoryFullName).toBe("acme/example-repo");
    expect(snapshot.commitSha).toBe("b".repeat(40));
    expect(JSON.stringify(snapshot.providerMetadata)).not.toContain(
      "synthetic-github-snapshot-credential",
    );
  });
});
