import { PBAC_STATE_GATES, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import {
  GITHUB_REPOSITORY_PERMISSION_LEVELS,
  REPOSITORY_CONNECTION_STATUSES,
  REPOSITORY_SCAN_JOB_STATUSES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
  REPOSITORY_SNAPSHOT_STATUSES,
  type RepositoryScanJobStatus,
} from "@lcsp/contracts/github-integration";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EvidenceAcceptanceStatus,
  LegalRuleLifecycleStatus,
  PrismaClient,
  VerifiedProfileStatus,
} from "@prisma/client";

import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import {
  encryptMfaSecret,
  fingerprintToken,
  generateTotpSecret,
  hashSecret,
  totpForTime,
} from "../../src/modules/auth-workspace/infrastructure/security/security.utils.js";

const testSupportDir = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(testSupportDir, "../..");

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:55432/lcsp_api_test?schema=public";

export type AuthFixture = {
  organizationId: string;
  approvedUser: { id: string; email: string };
  unverifiedUser: { id: string; email: string };
  noMembershipUser: { id: string; email: string };
};

export function ensureTestMfaEncryptionKey(): void {
  process.env.MFA_ENCRYPTION_KEY ??=
    "test-only-mfa-encryption-key-do-not-use-in-prod";
}

export type MfaFixture = {
  userId: string;
  totpSecret: string;
};

export { generateTotpSecret, encryptMfaSecret, totpForTime };

export type RepositorySnapshotGraphFixtureInput = {
  assessmentId?: string;
  organizationId?: string;
  userId?: string;
  connectionId?: string;
  snapshotId?: string;
  installationId?: string;
  repositoryId?: string;
};

export type RepositoryScanGraphFixtureInput =
  RepositorySnapshotGraphFixtureInput & {
    scanJobId?: string;
    scanJobStatus?: RepositoryScanJobStatus;
  };

export type VerifiedProfileGraphFixtureInput =
  RepositoryScanGraphFixtureInput & {
    evidenceReportId?: string;
    technicalProfileId?: string;
    aiUsageFlowId?: string;
    verifiedProfileId?: string;
  };

export type LegalClassificationParentsInput = {
  corpusVersionId?: string;
  catalogVersionId?: string;
};

export async function seedRepositorySnapshotGraph(
  prisma: PrismaClient,
  input: RepositorySnapshotGraphFixtureInput = {},
): Promise<void> {
  const assessmentId = input.assessmentId ?? "assessment-1";
  const organizationId = input.organizationId ?? "org-1";
  const userId = input.userId ?? "user-1";
  const connectionId = input.connectionId ?? "connection-1";
  const snapshotId = input.snapshotId ?? "snapshot-1";
  const installationId = input.installationId ?? `installation-${connectionId}`;
  const repositoryId = input.repositoryId ?? `repo-${connectionId}`;

  await prisma.repositoryConnection.upsert({
    where: { installationId_repositoryId: { installationId, repositoryId } },
    update: {
      assessmentId,
      organizationId,
      userId,
      repositoryName: "example-repo",
      repositoryFullName: "acme/example-repo",
      defaultBranch: "main",
      permissions: { contents: GITHUB_REPOSITORY_PERMISSION_LEVELS.read },
      status: REPOSITORY_CONNECTION_STATUSES.active,
      revokedAt: null,
    },
    create: {
      id: connectionId,
      assessmentId,
      organizationId,
      userId,
      installationId,
      repositoryId,
      repositoryName: "example-repo",
      repositoryFullName: "acme/example-repo",
      defaultBranch: "main",
      permissions: { contents: GITHUB_REPOSITORY_PERMISSION_LEVELS.read },
      status: REPOSITORY_CONNECTION_STATUSES.active,
    },
  });

  await prisma.repositorySnapshot.upsert({
    where: { id: snapshotId },
    update: {
      assessmentId,
      organizationId,
      connectionId,
      repositoryId,
      repositoryFullName: "acme/example-repo",
      actorId: userId,
      status: REPOSITORY_SNAPSHOT_STATUSES.ready,
    },
    create: {
      id: snapshotId,
      assessmentId,
      organizationId,
      connectionId,
      repositoryId,
      repositoryFullName: "acme/example-repo",
      branch: "main",
      ref: "refs/heads/main",
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      providerMetadata: { source: "e2e-fixture" },
      actorId: userId,
      status: REPOSITORY_SNAPSHOT_STATUSES.ready,
    },
  });
}

export async function seedRepositoryScanGraph(
  prisma: PrismaClient,
  input: RepositoryScanGraphFixtureInput = {},
): Promise<void> {
  const scanJobId = input.scanJobId ?? "scan-job-1";
  const assessmentId = input.assessmentId ?? "assessment-1";
  const snapshotId = input.snapshotId ?? "snapshot-1";
  const organizationId = input.organizationId ?? "org-1";

  await seedRepositorySnapshotGraph(prisma, input);

  await prisma.repositoryScanJob.upsert({
    where: { id: scanJobId },
    update: {
      assessmentId,
      snapshotId,
      organizationId,
      status: input.scanJobStatus ?? REPOSITORY_SCAN_JOB_STATUSES.completed,
    },
    create: {
      id: scanJobId,
      assessmentId,
      snapshotId,
      organizationId,
      idempotencyKey: `scan-request:${assessmentId}:${snapshotId}:${scanJobId}`,
      triggerSource: REPOSITORY_SCAN_TRIGGER_SOURCES.trusted,
      status: input.scanJobStatus ?? REPOSITORY_SCAN_JOB_STATUSES.completed,
      attemptCount: 1,
      correlationId: `corr-${scanJobId}`,
    },
  });
}

export async function seedVerifiedProfileGraph(
  prisma: PrismaClient,
  input: VerifiedProfileGraphFixtureInput = {},
): Promise<void> {
  const evidenceReportId = input.evidenceReportId ?? "evidence-report-1";
  const technicalProfileId = input.technicalProfileId ?? "technical-profile-1";
  const aiUsageFlowId = input.aiUsageFlowId ?? "ai-usage-flow-1";
  const verifiedProfileId = input.verifiedProfileId ?? "vp-1";
  const assessmentId = input.assessmentId ?? "assessment-1";
  const organizationId = input.organizationId ?? "org-1";
  const scanJobId = input.scanJobId ?? "scan-job-1";
  const snapshotId = input.snapshotId ?? "snapshot-1";

  await seedRepositoryScanGraph(prisma, {
    ...input,
    scanJobId,
    snapshotId,
  });

  await prisma.technicalEvidenceReport.upsert({
    where: { id: evidenceReportId },
    update: {
      scanJobId,
      assessmentId,
      organizationId,
      snapshotId,
      status: EvidenceAcceptanceStatus.ACCEPTED,
    },
    create: {
      id: evidenceReportId,
      scanJobId,
      assessmentId,
      organizationId,
      snapshotId,
      toolsVersion: { semgrep: "1.0.0" },
      configHash: { semgrep: "sha256:test" },
      evidencePayload: { findings: [{ finding_id: "finding-1" }] },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      schemaVersion: "1.0.0",
      status: EvidenceAcceptanceStatus.ACCEPTED,
    },
  });

  await prisma.technicalProfile.upsert({
    where: { id: technicalProfileId },
    update: {
      evidenceReportId,
      assessmentId,
      organizationId,
      status: EvidenceAcceptanceStatus.ACCEPTED,
    },
    create: {
      id: technicalProfileId,
      evidenceReportId,
      assessmentId,
      organizationId,
      schemaVersion: "1.0.0",
      providerVersion: "technical-profile-worker@fixture",
      profileData: { aiDetected: "confirmed" },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      status: EvidenceAcceptanceStatus.ACCEPTED,
    },
  });

  await prisma.aIUsageFlow.upsert({
    where: { id: aiUsageFlowId },
    update: {
      technicalProfileId,
      assessmentId,
      organizationId,
      status: EvidenceAcceptanceStatus.ACCEPTED,
    },
    create: {
      id: aiUsageFlowId,
      technicalProfileId,
      assessmentId,
      organizationId,
      schemaVersion: "1.0.0",
      providerVersion: "ai-usage-flow-worker@fixture",
      claims: [],
      unknownUsages: [],
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      status: EvidenceAcceptanceStatus.ACCEPTED,
    },
  });

  await prisma.verifiedProfile.upsert({
    where: { id: verifiedProfileId },
    update: {
      aiUsageFlowId,
      technicalEvidenceReportId: evidenceReportId,
      assessmentId,
      organizationId,
      status: VerifiedProfileStatus.APPROVED,
    },
    create: {
      id: verifiedProfileId,
      aiUsageFlowId,
      technicalEvidenceReportId: evidenceReportId,
      assessmentId,
      organizationId,
      schemaVersion: "1.0.0",
      providerVersion: "reconciliation@fixture",
      profileData: { source: "e2e-fixture" },
      gatesPassedAt: { fixture: true },
      status: VerifiedProfileStatus.APPROVED,
      approvedAt: new Date("2026-08-25T00:00:00.000Z"),
      approvedById: input.userId ?? "user-1",
    },
  });
}

export async function seedLegalClassificationParents(
  prisma: PrismaClient,
  input: LegalClassificationParentsInput = {},
): Promise<void> {
  const corpusVersionId = input.corpusVersionId ?? "LCSP-LEGAL-CORPUS-v0.1.0";
  const catalogVersionId = input.catalogVersionId ?? "LCSP-RULE-CATALOG-v0.1.0";

  await prisma.legalCorpusVersion.upsert({
    where: { id: corpusVersionId },
    update: { status: LegalRuleLifecycleStatus.APPROVED },
    create: {
      id: corpusVersionId,
      version: corpusVersionId,
      status: LegalRuleLifecycleStatus.APPROVED,
      sourceManifest: { source: "e2e-fixture" },
      approvedAt: new Date("2026-08-25T00:00:00.000Z"),
    },
  });

  await prisma.legalRuleCatalogVersion.upsert({
    where: { id: catalogVersionId },
    update: { status: LegalRuleLifecycleStatus.APPROVED },
    create: {
      id: catalogVersionId,
      version: catalogVersionId,
      status: LegalRuleLifecycleStatus.APPROVED,
      ruleRefs: [],
      approvedAt: new Date("2026-08-25T00:00:00.000Z"),
    },
  });
}

export class CapturingRecoveryNotifier {
  public lastToken: string | null = null;
  public lastEmail: string | null = null;
  public lastAppOrigin: string | null = null;

  notify(input: {
    userId: string;
    email: string;
    token: string;
    correlationId: string;
    appOrigin?: string;
  }): Promise<void> {
    void input.userId;
    void input.correlationId;
    this.lastToken = input.token;
    this.lastEmail = input.email;
    this.lastAppOrigin = input.appOrigin ?? null;
    return Promise.resolve();
  }
}

export function pushPrismaSchema(): void {
  const cacheHome = resolve(apiRoot, ".cache");
  mkdirSync(cacheHome, { recursive: true });

  const prismaBinary =
    process.platform === "win32"
      ? resolve(apiRoot, "node_modules/.bin/prisma.cmd")
      : resolve(apiRoot, "node_modules/.bin/prisma");

  execFileSync(
    prismaBinary,
    ["db", "push", "--accept-data-loss", "--force-reset"],
    {
      cwd: apiRoot,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        XDG_CACHE_HOME: cacheHome,
      },
      stdio: "pipe",
      shell: process.platform === "win32",
    },
  );
}

export async function resetAuthWorkspaceDatabase(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.authDecisionLog.deleteMany();
  await prisma.authAuditEvent.deleteMany();
  await prisma.authRecoveryRequest.deleteMany();
  await prisma.authMfaOtpUsed.deleteMany();
  await prisma.authMfaRateLimit.deleteMany();
  await prisma.authUserMfa.deleteMany();
  await prisma.authOAuthState.deleteMany();
  await prisma.authOAuthIdentity.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.authMembership.deleteMany();
  await prisma.authPolicy.deleteMany();
  await prisma.authOrganization.deleteMany();
  await prisma.authUser.deleteMany();
}

export async function seedMfaEnrollment(
  prisma: PrismaClient,
  userId: string,
): Promise<MfaFixture> {
  const totpSecret = generateTotpSecret();
  await prisma.authUserMfa.create({
    data: {
      userId,
      encryptedSecret: encryptMfaSecret(totpSecret),
      enrolledAt: new Date(),
    },
  });
  return { userId, totpSecret };
}

export async function seedAuthWorkspaceFixture(
  prisma: PrismaClient,
): Promise<AuthFixture> {
  const organizationId = "org-1";
  const approvedUserId = "user-1";
  const unverifiedUserId = "user-2";
  const noMembershipUserId = "user-3";
  const revokedMembershipUserId = "user-4";
  const policyId = "policy-manager-workspace";
  const policyVersion = "2026-06-26";

  await prisma.authOrganization.create({
    data: {
      id: organizationId,
      slug: "acme",
      name: "Acme Legal",
    },
  });

  await prisma.authUser.createMany({
    data: [
      {
        id: approvedUserId,
        email: "manager@acme.test",
        displayName: "Acme Manager",
        passwordHash: hashSecret("CorrectHorseBatteryStaple!"),
        emailVerified: true,
        failedLoginCount: 0,
      },
      {
        id: unverifiedUserId,
        email: "pending@acme.test",
        passwordHash: hashSecret("VerifyMe123!"),
        emailVerified: false,
        failedLoginCount: 0,
      },
      {
        id: noMembershipUserId,
        email: "nomembership@acme.test",
        passwordHash: hashSecret("NoMembership123!"),
        emailVerified: true,
        failedLoginCount: 0,
      },
      {
        id: revokedMembershipUserId,
        email: "revoked-member@acme.test",
        passwordHash: hashSecret("RevokedMembership123!"),
        emailVerified: true,
        failedLoginCount: 0,
      },
    ],
  });

  await prisma.authPolicy.create({
    data: {
      id: policyId,
      version: policyVersion,
      actions: [
        PBAC_ACTIONS.workspaceRead,
        PBAC_ACTIONS.assessmentCreate,
        PBAC_ACTIONS.assessmentRead,
        PBAC_ACTIONS.assessmentList,
        PBAC_ACTIONS.githubConnect,
        PBAC_ACTIONS.scanRead,
        PBAC_ACTIONS.scanTrigger,
        PBAC_ACTIONS.documentGenerate,
        PBAC_ACTIONS.snapshotCreate,
        PBAC_ACTIONS.wizardWrite,
        PBAC_ACTIONS.wizardSubmit,
        PBAC_ACTIONS.wizardExport,
      ],
      subjectRole: SUBJECT_ROLES.manager,
      stateGate: PBAC_STATE_GATES.membershipActive,
      organizationId,
    },
  });

  await prisma.authMembership.createMany({
    data: [
      {
        id: "membership-1",
        userId: approvedUserId,
        organizationId,
        status: AUTH_MEMBERSHIP_STATUSES.active,
        subjectAttributes: { role: SUBJECT_ROLES.manager, department: "Legal" },
        policyId,
        policyVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "membership-2",
        userId: unverifiedUserId,
        organizationId,
        status: AUTH_MEMBERSHIP_STATUSES.active,
        subjectAttributes: { role: SUBJECT_ROLES.manager },
        policyId,
        policyVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "membership-3",
        userId: revokedMembershipUserId,
        organizationId,
        status: AUTH_MEMBERSHIP_STATUSES.revoked,
        subjectAttributes: { role: SUBJECT_ROLES.manager },
        policyId,
        policyVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  const revokedSessionToken = "revoked-session-token";
  await prisma.authSession.create({
    data: {
      id: "session-0",
      userId: approvedUserId,
      organizationId,
      tokenHash: hashSecret(revokedSessionToken),
      tokenFingerprint: fingerprintToken(revokedSessionToken),
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: new Date(),
    },
  });

  return {
    organizationId,
    approvedUser: { id: approvedUserId, email: "manager@acme.test" },
    unverifiedUser: { id: unverifiedUserId, email: "pending@acme.test" },
    noMembershipUser: {
      id: noMembershipUserId,
      email: "nomembership@acme.test",
    },
  };
}
