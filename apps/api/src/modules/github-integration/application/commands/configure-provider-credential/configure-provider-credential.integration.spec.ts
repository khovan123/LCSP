import { PrismaPg } from "@prisma/adapter-pg";
import {
  CredentialProvider,
  PrismaClient,
  ProviderCredentialStatus,
} from "@prisma/client";
import { describe, expect, it, beforeAll, afterAll, jest } from "@jest/globals";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { CREDENTIAL_PROVIDERS } from "@lcsp/contracts/github-integration";

import type { AppConfig } from "../../../../../config/config.types.js";
import { ConfigureProviderCredentialCommand } from "./configure-provider-credential.command.js";
import { ConfigureProviderCredentialHandler } from "./configure-provider-credential.handler.js";
import { PrismaCredentialPersistenceUnitOfWork } from "../../../infrastructure/persistence/prisma-credential-persistence.unit-of-work.js";
import { PrismaActiveProviderCredentialResolver } from "../../../infrastructure/persistence/prisma-active-provider-credential.resolver.js";
import { PrismaDatabaseCredentialStore } from "../../../infrastructure/persistence/prisma-database-credential.store.js";
import { EnvelopeEncryptionService } from "../../../infrastructure/security/envelope-encryption.service.js";
import { DevelopmentStaticKeyEncryptionKeyProvider } from "../../../infrastructure/security/development-static-key-encryption-key.provider.js";

const url = process.env.PHASE25_DATABASE_URL ?? process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run("ConfigureProviderCredential Prisma replacement integration", () => {
  let prisma: PrismaClient;
  let handler: ConfigureProviderCredentialHandler;
  let resolver: PrismaActiveProviderCredentialResolver;
  const provider = {
    validateIdentity: jest.fn(async () => ({
      id: "4242",
      login: "synthetic-user",
      htmlUrl: "https://example.test/users/synthetic-user",
    })),
  };

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg(url!) });
    await prisma.$connect();
    const prismaService = prisma as never;
    const encryption = new EnvelopeEncryptionService(
      new DevelopmentStaticKeyEncryptionKeyProvider(
        "test",
        new Map([["test", Buffer.alloc(32, 7)]]),
      ),
    );
    const unitOfWork = new PrismaCredentialPersistenceUnitOfWork(
      prismaService,
      encryption,
    );
    const config = {
      get: () => ({ enabled: true }),
    } as unknown as import("@nestjs/config").ConfigService<AppConfig, true>;
    const registry = { get: () => provider };
    handler = new ConfigureProviderCredentialHandler(
      provider as never,
      config,
      unitOfWork,
      registry as never,
    );
    const store = new PrismaDatabaseCredentialStore(
      prismaService,
      encryption,
      prisma,
    );
    resolver = new PrismaActiveProviderCredentialResolver(prismaService, store);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const command = (credential: string) =>
    new ConfigureProviderCredentialCommand(
      "integration-org",
      "integration-user",
      SUBJECT_ROLES.manager,
      "integration-session",
      CREDENTIAL_PROVIDERS.gitlab,
      credential,
      "integration-correlation",
    );

  const activeCount = () =>
    prisma.providerCredential.count({
      where: {
        organizationId: "integration-org",
        ownerUserId: "integration-user",
        provider: CredentialProvider.GITLAB,
        status: ProviderCredentialStatus.ACTIVE,
        isActive: true,
      },
    });

  it("configures initially and rotates to a new active credential", async () => {
    await prisma.providerCredentialSecret.deleteMany();
    await prisma.providerCredential.deleteMany({
      where: { organizationId: "integration-org" },
    });

    await handler.execute(command("synthetic-gitlab-credential-a"));
    const first = await prisma.providerCredential.findFirstOrThrow({
      where: { organizationId: "integration-org" },
    });
    expect(first.status).toBe(ProviderCredentialStatus.ACTIVE);
    expect(first.isActive).toBe(true);
    expect(await activeCount()).toBe(1);
    await expect(
      resolver.findMetadata({
        organizationId: "integration-org",
        userId: "integration-user",
        provider: CredentialProvider.GITLAB,
      }),
    ).resolves.toMatchObject({ id: first.id });

    await handler.execute(command("synthetic-gitlab-credential-b"));
    const rows = await prisma.providerCredential.findMany({
      where: { organizationId: "integration-org" },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === first.id)?.isActive).toBe(false);
    const replacement = rows.find((row) => row.id !== first.id)!;
    expect(replacement.isActive).toBe(true);
    expect(await activeCount()).toBe(1);
    await expect(
      resolver.findMetadata({
        organizationId: "integration-org",
        userId: "integration-user",
        provider: CredentialProvider.GITLAB,
      }),
    ).resolves.toMatchObject({ id: replacement.id });
  });

  it("keeps the existing active credential when identity validation fails", async () => {
    const before = await resolver.findMetadata({
      organizationId: "integration-org",
      userId: "integration-user",
      provider: CredentialProvider.GITLAB,
    });
    provider.validateIdentity.mockRejectedValueOnce(
      new Error("invalid synthetic credential"),
    );
    await expect(
      handler.execute(command("synthetic-gitlab-credential-invalid")),
    ).rejects.toBeDefined();
    expect(await activeCount()).toBe(1);
    await expect(
      resolver.findMetadata({
        organizationId: "integration-org",
        userId: "integration-user",
        provider: CredentialProvider.GITLAB,
      }),
    ).resolves.toMatchObject({ id: before?.id });
  });

  it("enforces the PostgreSQL partial unique index", async () => {
    const current = await prisma.providerCredential.findFirstOrThrow({
      where: { organizationId: "integration-org", isActive: true },
    });
    await expect(
      prisma.providerCredential.create({
        data: {
          id: "synthetic-conflicting-active",
          provider: current.provider,
          organizationId: current.organizationId,
          ownerUserId: current.ownerUserId,
          providerAccountId: 99n,
          providerLogin: "conflict",
          status: ProviderCredentialStatus.ACTIVE,
          isActive: true,
          currentVersion: 1,
          validatedAt: new Date(),
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(await activeCount()).toBe(1);
  });

  it("isolates replacement by organization, owner, and provider", async () => {
    const scopes = [
      ["scope-org-1", "scope-user-1", CREDENTIAL_PROVIDERS.gitlab],
      ["scope-org-1", "scope-user-1", CREDENTIAL_PROVIDERS.github],
      ["scope-org-1", "scope-user-2", CREDENTIAL_PROVIDERS.gitlab],
      ["scope-org-2", "scope-user-1", CREDENTIAL_PROVIDERS.gitlab],
    ] as const;
    for (const [organizationId, userId, providerName] of scopes) {
      await handler.execute(
        new ConfigureProviderCredentialCommand(
          organizationId,
          userId,
          SUBJECT_ROLES.manager,
          "integration-session",
          providerName,
          `synthetic-${organizationId}-${userId}-${providerName}-credential`,
          "integration-correlation",
        ),
      );
    }
    await handler.execute(
      new ConfigureProviderCredentialCommand(
        "scope-org-1",
        "scope-user-1",
        SUBJECT_ROLES.manager,
        "integration-session",
        CREDENTIAL_PROVIDERS.gitlab,
        "synthetic-scope-rotation-credential",
        "integration-correlation",
      ),
    );
    const unchanged = await prisma.providerCredential.findMany({
      where: {
        OR: [
          {
            organizationId: "scope-org-1",
            ownerUserId: "scope-user-1",
            provider: CredentialProvider.GITHUB,
          },
          {
            organizationId: "scope-org-1",
            ownerUserId: "scope-user-2",
            provider: CredentialProvider.GITLAB,
          },
          {
            organizationId: "scope-org-2",
            ownerUserId: "scope-user-1",
            provider: CredentialProvider.GITLAB,
          },
        ],
        isActive: true,
      },
    });
    expect(unchanged).toHaveLength(3);
  });

  it("treats same-secret resubmission as a retained-row rotation", async () => {
    const organizationId = "same-secret-org";
    await handler.execute(
      new ConfigureProviderCredentialCommand(
        organizationId,
        "same-secret-user",
        SUBJECT_ROLES.manager,
        "integration-session",
        CREDENTIAL_PROVIDERS.gitlab,
        "synthetic-same-secret-credential",
        "integration-correlation",
      ),
    );
    const first = await prisma.providerCredential.findFirstOrThrow({
      where: { organizationId },
    });
    await handler.execute(
      new ConfigureProviderCredentialCommand(
        organizationId,
        "same-secret-user",
        SUBJECT_ROLES.manager,
        "integration-session",
        CREDENTIAL_PROVIDERS.gitlab,
        "synthetic-same-secret-credential",
        "integration-correlation",
      ),
    );
    const rows = await prisma.providerCredential.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === first.id)?.isActive).toBe(false);
    expect(rows.filter((row) => row.isActive)).toHaveLength(1);
  });

  it("rolls back deactivation when secret persistence fails", async () => {
    const organizationId = "rollback-org";
    await handler.execute(
      new ConfigureProviderCredentialCommand(
        organizationId,
        "rollback-user",
        SUBJECT_ROLES.manager,
        "integration-session",
        CREDENTIAL_PROVIDERS.gitlab,
        "synthetic-rollback-original-credential",
        "integration-correlation",
      ),
    );
    const original = await prisma.providerCredential.findFirstOrThrow({
      where: { organizationId },
    });
    const failingUnitOfWork = new PrismaCredentialPersistenceUnitOfWork(
      prisma as never,
      {
        encryptSecret: async () => {
          throw new Error("synthetic persistence failure");
        },
      } as never,
    );
    const failingHandler = new ConfigureProviderCredentialHandler(
      provider as never,
      { get: () => ({ enabled: true }) } as never,
      failingUnitOfWork,
      { get: () => provider } as never,
    );
    await expect(
      failingHandler.execute(
        new ConfigureProviderCredentialCommand(
          organizationId,
          "rollback-user",
          SUBJECT_ROLES.manager,
          "integration-session",
          CREDENTIAL_PROVIDERS.gitlab,
          "synthetic-rollback-replacement-credential",
          "integration-correlation",
        ),
      ),
    ).rejects.toBeDefined();
    const restored = await prisma.providerCredential.findFirstOrThrow({
      where: { id: original.id },
    });
    expect(restored.isActive).toBe(true);
    expect(
      await prisma.providerCredential.count({
        where: { organizationId, isActive: true },
      }),
    ).toBe(1);
  });
});
