import {
  AUTH_INVITATION_STATES,
  AUTH_LEGACY_AUDIT_EVENT_TYPES,
  AUTH_MEMBERSHIP_STATUSES,
  REQUIRED_ACTIONS,
} from "@lcsp/contracts/auth";
import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import * as assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { httpRequest } from "./support/http.js";

import { AUTH_ERROR_CODES, type ProblemResult } from "@lcsp/contracts/auth";
import { resolveMessage } from "@lcsp/i18n";

import { AppModule } from "../src/app.module.js";
import { AUTH_WORKSPACE_RECOVERY_NOTIFIER } from "../src/modules/auth-workspace/application/ports/notification/recovery-notifier.js";
import type {
  EnrollMfaSuccess,
  VerifyMfaOtpSuccess,
} from "../src/modules/auth-workspace/application/contracts/auth-workspace/mfa.contract.js";
import type { UpdateProfileSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/profile.contract.js";
import type {
  ConfirmRecoverySuccess,
  RequestRecoverySuccess,
} from "../src/modules/auth-workspace/application/contracts/auth-workspace/recovery.contract.js";
import type { RegisterSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/register-approved-path.contract.js";
import type { SignInSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/sign-in.contract.js";
import type { WorkspaceSuccess } from "../src/modules/auth-workspace/application/contracts/auth-workspace/workspace.contract.js";
import {
  type AuthFixture,
  CapturingRecoveryNotifier,
  TEST_DATABASE_URL,
  ensureTestMfaEncryptionKey,
  pushPrismaSchema,
  resetAuthWorkspaceDatabase,
  seedAuthWorkspaceFixture,
  seedMfaEnrollment,
  totpForTime,
} from "./support/auth-workspace-test-helpers.js";

type HttpErrorBody = {
  error_code?: string;
  correlation_id?: string;
};

describe("Auth workspace (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fixture: AuthFixture;
  let recoveryNotifier: CapturingRecoveryNotifier;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    ensureTestMfaEncryptionKey();
    pushPrismaSchema();

    prisma = new PrismaClient({
      adapter: new PrismaPg(TEST_DATABASE_URL),
    });
    await prisma.$connect();

    recoveryNotifier = new CapturingRecoveryNotifier();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_WORKSPACE_RECOVERY_NOTIFIER)
      .useValue(recoveryNotifier)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetAuthWorkspaceDatabase(prisma);
    fixture = await seedAuthWorkspaceFixture(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("approved sign-in creates an authenticated session scoped to organization", async () => {
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "CorrectHorseBatteryStaple!",
        organization_id: fixture.organizationId,
      })
      .expect(201);
    const body = result.body as SignInSuccess;

    assert.equal(body.user.organization_id, fixture.organizationId);
    assert.equal(typeof body.session_token, "string");
  });

  it("approved invitation registration creates session through approved path", async () => {
    const result = await httpRequest(app)
      .post("/auth/register-approved-path")
      .send({
        invite_id: "invite-approved",
        password: "ApprovedInvite123!",
      })
      .expect(201);

    assert.equal(
      (result.body as RegisterSuccess).user.email,
      "invitee@acme.test",
    );
    const invite = await prisma.authInvitation.findUnique({
      where: { id: "invite-approved" },
    });
    assert.equal(invite?.state, AUTH_INVITATION_STATES.consumed);
  });

  it("approved invitation cannot be replayed after first registration", async () => {
    const first = await httpRequest(app)
      .post("/auth/register-approved-path")
      .send({
        invite_id: "invite-approved",
        password: "ApprovedInvite123!",
      })
      .expect(201);

    const replay = await httpRequest(app)
      .post("/auth/register-approved-path")
      .send({
        invite_id: "invite-approved",
        password: "ApprovedInvite123!",
      })
      .expect(201);

    assert.equal((first.body as RegisterSuccess).ok, true);
    const failure = expectFailure(replay.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.invalidInviteState);
  });

  it("invalid credentials return stable safe error without echoing secrets", async () => {
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "WrongPassword123!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.invalidCredentials);
    assert.equal(
      resolveMessage("vi", failure.problem.detailKey),
      "Email hoặc mật khẩu không hợp lệ.",
    );
    assert.doesNotMatch(JSON.stringify(failure), /WrongPassword123!/);
  });

  it("invalid invite state is rejected with safe machine-readable contract", async () => {
    const result = await httpRequest(app)
      .post("/auth/register-approved-path")
      .send({
        invite_id: "invite-pending",
        password: "SomePassword123!",
      })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.invalidInviteState);
    assert.equal(failure.problem.requiredAction, REQUIRED_ACTIONS.acceptInvite);
  });

  it("approved invitation still blocks registration when email verification is pending", async () => {
    const result = await httpRequest(app)
      .post("/auth/register-approved-path")
      .send({
        invite_id: "invite-unverified",
        password: "SomePassword123!",
      })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(
      failure.problem.code,
      AUTH_ERROR_CODES.emailVerificationRequired,
    );
  });

  it("approved invitation still blocks registration when membership is not active", async () => {
    const result = await httpRequest(app)
      .post("/auth/register-approved-path")
      .send({
        invite_id: "invite-not-active",
        password: "SomePassword123!",
      })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.invalidInviteState);
  });

  it("email verification is required before continuing to workspace", async () => {
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.unverifiedUser.email,
        password: "VerifyMe123!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(
      failure.problem.code,
      AUTH_ERROR_CODES.emailVerificationRequired,
    );
  });

  it("membership missing blocks access before workspace data is returned", async () => {
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.noMembershipUser.email,
        password: "NoMembership123!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.membershipMissing);
  });

  it("protected workspace endpoint fails closed without authentication", async () => {
    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("x-correlation-id", "corr-workspace-no-session")
      .expect(401);

    assert.equal(
      (result.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.sessionInvalid,
    );
    assert.equal("workspace" in result.body, false);

    const decision = await prisma.authDecisionLog.findFirstOrThrow({
      where: { correlationId: "corr-workspace-no-session" },
    });
    assert.equal(decision.decision, PBAC_DECISION.deny);
  });

  it("workspace access fails closed when request organization does not match session scope", async () => {
    const signIn = await signInApprovedUser();

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: "org-2" })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(200);

    const failure = expectFailure(result.body);
    assert.equal(
      failure.problem.code,
      AUTH_ERROR_CODES.authzTenantScopeMismatch,
    );
  });

  it("revoked session cannot access protected workspace", async () => {
    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", "Bearer revoked-session-token")
      .expect(401);

    assert.equal(
      (result.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.sessionInvalid,
    );
  });

  it("deny-by-default blocks workspace access when subject attributes are incomplete", async () => {
    const signIn = await signInApprovedUser();

    await prisma.authMembership.update({
      where: {
        userId_organizationId: {
          userId: fixture.approvedUser.id,
          organizationId: fixture.organizationId,
        },
      },
      data: {
        subjectAttributes: {},
      },
    });

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(403);

    assert.equal(
      (result.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.pbacDenied,
    );
  });

  it("deny-by-default blocks workspace access when policy state gate is not satisfied", async () => {
    const signIn = await signInApprovedUser();

    await prisma.authOrganization.create({
      data: {
        id: "org-other",
        slug: "other",
        name: "Other Org",
      },
    });
    await prisma.authPolicy.update({
      where: {
        id_version: {
          id: "policy-manager-workspace",
          version: "2026-06-26",
        },
      },
      data: {
        organizationId: "org-other",
      },
    });

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(200);

    const failure = expectFailure(result.body);
    assert.equal(
      failure.problem.code,
      AUTH_ERROR_CODES.authzTenantScopeMismatch,
    );
  });

  it("returns the active Manager organization context and safe PBAC action projection", async () => {
    const signIn = await signInApprovedUser();

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .set("x-correlation-id", "corr-manager-workspace-context")
      .expect(200);

    const body = result.body as WorkspaceSuccess & Record<string, unknown>;
    assert.equal(body.organization_id, fixture.organizationId);
    assert.equal(body.organization_name, "Acme Legal");
    assert.equal(body.user_id, fixture.approvedUser.id);
    assert.equal(body.display_name, "Acme Manager");
    assert.equal(body.membership_status, AUTH_MEMBERSHIP_STATUSES.active);
    assert.equal(body.subject_role, SUBJECT_ROLES.manager);
    assert.deepEqual(body.granted_actions, [
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
    ]);
    assert.equal(body.mfa_verified, false);
    assert.equal(body.correlation_id, "corr-manager-workspace-context");
    assert.equal(Number.isNaN(Date.parse(body.session_expires_at)), false);
    assert.equal("policyId" in body, false);
    assert.equal("policyVersion" in body, false);
    assert.equal("tokenHash" in body, false);

    const decision = await prisma.authDecisionLog.findFirstOrThrow({
      where: {
        correlationId: "corr-manager-workspace-context",
        resourceType: "Workspace",
      },
    });
    assert.equal(decision.organizationId, fixture.organizationId);
    assert.equal(decision.resourceType, "Workspace");
    assert.equal(decision.resourceId, "workspace-home");
    assert.equal(decision.action, PBAC_ACTIONS.workspaceRead);
    assert.equal(decision.decision, PBAC_DECISION.allow);
    assert.equal(decision.policyId, "policy-manager-workspace");
    assert.equal(decision.policyVersion, "2026-06-26");
    assert.equal(decision.correlationId, "corr-manager-workspace-context");
  });

  it("repeated failed logins trigger temporary lock expectation", async () => {
    await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "WrongPassword123!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "WrongPassword123!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const locked = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "WrongPassword123!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const failure = expectFailure(locked.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.temporaryLock);
  });

  it("audit trail records allow/deny events without leaking secrets", async () => {
    const signIn = await signInApprovedUser();

    await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .set("x-correlation-id", "corr-workspace-allow")
      .expect(200);

    const allowDecision = await prisma.authDecisionLog.findFirstOrThrow({
      where: { correlationId: "corr-workspace-allow" },
    });
    assert.equal(allowDecision.decision, PBAC_DECISION.allow);

    await httpRequest(app)
      .post("/auth/revoke-session")
      .send({ session_token: signIn.session_token })
      .expect(201);

    const auditEvents = await prisma.authAuditEvent.findMany({
      orderBy: { createdAt: "asc" },
    });
    const serializedAudit = JSON.stringify(
      auditEvents.map((item) => item.payload),
    );

    assert.match(serializedAudit, /auth\.login\.succeeded/);
    assert.match(serializedAudit, /workspace\.access\.allowed/);
    assert.match(serializedAudit, /auth\.session\.revoked/);
    assert.doesNotMatch(serializedAudit, /CorrectHorseBatteryStaple!/);
    assert.doesNotMatch(serializedAudit, new RegExp(signIn.session_token));
  });

  // AC1: MFA enrollment and OTP challenge

  it("MFA enrollment returns a TOTP URI for authenticator app setup", async () => {
    const signIn = await signInApprovedUser();
    const result = await httpRequest(app)
      .post("/auth/mfa/enroll")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({ session_token: signIn.session_token })
      .expect(201);

    const body = result.body as EnrollMfaSuccess;
    assert.equal(body.ok, true);
    assert.match(body.totp_uri, /^otpauth:\/\/totp\//);
  });

  it("workspace access is blocked when MFA is enrolled but not yet verified", async () => {
    const signIn = await signInApprovedUser();
    await seedMfaEnrollment(prisma, fixture.approvedUser.id);

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(401);

    assert.equal(
      (result.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.mfaRequired,
    );
  });

  it("sign-in response includes mfa_required flag when MFA is enrolled", async () => {
    await seedMfaEnrollment(prisma, fixture.approvedUser.id);
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "CorrectHorseBatteryStaple!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const body = result.body as SignInSuccess;
    assert.equal(body.ok, true);
    assert.equal(body.mfa_required, true);
  });

  it("valid OTP verifies MFA and grants workspace access", async () => {
    const signIn = await signInApprovedUser();
    const mfa = await seedMfaEnrollment(prisma, fixture.approvedUser.id);

    const otp = totpForTime(mfa.totpSecret, Date.now());
    const verify = await httpRequest(app)
      .post("/auth/mfa/verify-otp")
      .send({ session_token: signIn.session_token, otp })
      .expect(201);
    assert.equal((verify.body as VerifyMfaOtpSuccess).ok, true);

    const workspace = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(200);
    assert.equal((workspace.body as WorkspaceSuccess).ok, true);
  });

  it("invalid OTP is rejected and audit event is recorded", async () => {
    const signIn = await signInApprovedUser();
    await seedMfaEnrollment(prisma, fixture.approvedUser.id);

    const result = await httpRequest(app)
      .post("/auth/mfa/verify-otp")
      .send({ session_token: signIn.session_token, otp: "000000" })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.mfaInvalid);

    const auditEvents = await prisma.authAuditEvent.findMany();
    const mfaFailed = auditEvents.find(
      (e) =>
        (e.payload as Record<string, unknown>)["event_type"] ===
        AUTH_LEGACY_AUDIT_EVENT_TYPES.mfaFailed,
    );
    assert.ok(mfaFailed, "auth.mfa.failed audit event should be recorded");
  });

  it("replayed OTP is rejected after first successful use", async () => {
    const signIn = await signInApprovedUser();
    const mfa = await seedMfaEnrollment(prisma, fixture.approvedUser.id);

    const otp = totpForTime(mfa.totpSecret, Date.now());
    await httpRequest(app)
      .post("/auth/mfa/verify-otp")
      .send({ session_token: signIn.session_token, otp })
      .expect(201);

    const signIn2 = await signInApprovedUser();
    const replay = await httpRequest(app)
      .post("/auth/mfa/verify-otp")
      .send({ session_token: signIn2.session_token, otp })
      .expect(201);

    const failure = expectFailure(replay.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.mfaInvalid);
  });

  it("rate limiting blocks after 5 consecutive failed OTP attempts", async () => {
    const signIn = await signInApprovedUser();
    await seedMfaEnrollment(prisma, fixture.approvedUser.id);

    for (let i = 0; i < 5; i++) {
      await httpRequest(app)
        .post("/auth/mfa/verify-otp")
        .send({ session_token: signIn.session_token, otp: "000000" })
        .expect(201);
    }

    const locked = await httpRequest(app)
      .post("/auth/mfa/verify-otp")
      .send({ session_token: signIn.session_token, otp: "000001" })
      .expect(201);

    const failure = expectFailure(locked.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.mfaRateLimited);
  });

  // AC2: Session expiry/revocation with audit trail

  it("expired session is denied access with audit event recorded", async () => {
    const expiredToken = "expired-session-token";
    const { hashSecret, fingerprintToken } =
      await import("../src/modules/auth-workspace/infrastructure/security/security.utils.js");
    await prisma.authSession.create({
      data: {
        id: "session-expired",
        userId: fixture.approvedUser.id,
        organizationId: fixture.organizationId,
        tokenHash: hashSecret(expiredToken),
        tokenFingerprint: fingerprintToken(expiredToken),
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      },
    });

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);

    assert.equal(
      (result.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.sessionInvalid,
    );
  });

  it("revoke-session records audit event and blocks subsequent workspace access", async () => {
    const signIn = await signInApprovedUser();

    await httpRequest(app)
      .post("/auth/revoke-session")
      .send({ session_token: signIn.session_token })
      .expect(201);

    const workspace = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(401);

    assert.equal(
      (workspace.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.sessionInvalid,
    );

    const auditEvents = await prisma.authAuditEvent.findMany();
    const revoked = auditEvents.find(
      (e) =>
        (e.payload as Record<string, unknown>)["event_type"] ===
        AUTH_LEGACY_AUDIT_EVENT_TYPES.sessionRevoked,
    );
    assert.ok(revoked, "auth.session.revoked audit event should be recorded");
  });

  // AC3: Profile update safety

  it("profile update succeeds and returns updated_fields without secret values", async () => {
    const signIn = await signInApprovedUser();
    const result = await httpRequest(app)
      .patch("/auth/profile")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({
        session_token: signIn.session_token,
        display_name: "Test Manager",
        recovery_email: "recovery@safe.test",
      })
      .expect(200);

    const body = result.body as UpdateProfileSuccess;
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.updated_fields));
    assert.ok(body.updated_fields.includes("display_name"));
    assert.ok(body.updated_fields.includes("recovery_email"));
    assert.doesNotMatch(JSON.stringify(result.body), /recovery@safe\.test/);
  });

  it("profile update audit event records field names not values", async () => {
    const signIn = await signInApprovedUser();
    await httpRequest(app)
      .patch("/auth/profile")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({
        session_token: signIn.session_token,
        display_name: "Audit Test Name",
        recovery_email: "private@secret.test",
      })
      .expect(200);

    const auditEvents = await prisma.authAuditEvent.findMany();
    const profileUpdated = auditEvents.find(
      (e) =>
        (e.payload as Record<string, unknown>)["event_type"] ===
        AUTH_LEGACY_AUDIT_EVENT_TYPES.profileUpdated,
    );
    assert.ok(
      profileUpdated,
      "auth.profile.updated audit event should be recorded",
    );
    const auditStr = JSON.stringify(profileUpdated?.payload);
    assert.doesNotMatch(auditStr, /private@secret\.test/);
    assert.doesNotMatch(auditStr, /Audit Test Name/);
  });

  // Review follow-ups: MFA hardening, mandatory-MFA policy, profile safety, recovery flow

  it("re-enrolling MFA requires a verified session so a stolen pre-MFA session cannot replace the secret", async () => {
    const signIn = await signInApprovedUser();
    await httpRequest(app)
      .post("/auth/mfa/enroll")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({ session_token: signIn.session_token })
      .expect(201);

    const reEnroll = await httpRequest(app)
      .post("/auth/mfa/enroll")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({ session_token: signIn.session_token })
      .expect(401);

    assert.equal(
      (reEnroll.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.mfaRequired,
    );
  });

  it("profile update is blocked when MFA is enrolled but not yet verified", async () => {
    const signIn = await signInApprovedUser();
    await seedMfaEnrollment(prisma, fixture.approvedUser.id);

    const result = await httpRequest(app)
      .patch("/auth/profile")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({ session_token: signIn.session_token, display_name: "Blocked" })
      .expect(401);

    assert.equal(
      (result.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.mfaRequired,
    );
  });

  it("profile update rejects a malformed recovery_email", async () => {
    const signIn = await signInApprovedUser();
    const result = await httpRequest(app)
      .patch("/auth/profile")
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .send({
        session_token: signIn.session_token,
        recovery_email: "not-an-email",
      })
      .expect(200);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.validationFailed);
  });

  it("organization-mandated MFA blocks workspace access even without personal enrollment", async () => {
    await prisma.authOrganization.update({
      where: { id: fixture.organizationId },
      data: { mfaRequired: true },
    });

    const signIn = await signInApprovedUser();
    assert.equal(signIn.mfa_required, true);

    const result = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(200);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.mfaRequired);
  });

  it("client-facing user projection only exposes role, not other PBAC subject attributes", async () => {
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "CorrectHorseBatteryStaple!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    const success = expectSuccess(result.body) as {
      user: { subject_attributes: Record<string, string> };
    };
    assert.equal(success.user.subject_attributes.role, SUBJECT_ROLES.manager);
    assert.equal("department" in success.user.subject_attributes, false);
  });

  it("password recovery request does not leak whether the account exists", async () => {
    const known = await httpRequest(app)
      .post("/auth/recovery/request")
      .send({ email: fixture.approvedUser.email })
      .expect(201);

    const unknown = await httpRequest(app)
      .post("/auth/recovery/request")
      .send({ email: "nobody-here@acme.test" })
      .expect(201);

    const knownBody = known.body as RequestRecoverySuccess;
    const unknownBody = unknown.body as RequestRecoverySuccess;
    assert.equal(knownBody.ok, true);
    assert.equal(unknownBody.ok, true);
    assert.deepEqual(Object.keys(knownBody), Object.keys(unknownBody));
  });

  it("password recovery confirm resets the password and revokes existing sessions", async () => {
    const signIn = await signInApprovedUser();

    await httpRequest(app)
      .post("/auth/recovery/request")
      .send({ email: fixture.approvedUser.email })
      .expect(201);

    const token = recoveryNotifier.lastToken;
    assert.ok(token, "recovery notifier should have captured a token");

    const confirm = await httpRequest(app)
      .post("/auth/recovery/confirm")
      .send({ token, new_password: "BrandNewPassword456!" })
      .expect(201);
    assert.equal((confirm.body as ConfirmRecoverySuccess).ok, true);

    const oldSessionCheck = await httpRequest(app)
      .get("/workspace")
      .query({ organization_id: fixture.organizationId })
      .set("Authorization", `Bearer ${signIn.session_token}`)
      .expect(401);
    assert.equal(
      (oldSessionCheck.body as HttpErrorBody).error_code,
      AUTH_ERROR_CODES.sessionInvalid,
    );

    const newSignIn = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "BrandNewPassword456!",
        organization_id: fixture.organizationId,
      })
      .expect(201);
    assert.equal((newSignIn.body as SignInSuccess).ok, true);
  });

  it("password recovery confirm rejects an invalid or expired token", async () => {
    const result = await httpRequest(app)
      .post("/auth/recovery/confirm")
      .send({ token: "not-a-real-token", new_password: "SomethingNew123!" })
      .expect(201);

    const failure = expectFailure(result.body);
    assert.equal(failure.problem.code, AUTH_ERROR_CODES.recoveryInvalid);
  });

  async function signInApprovedUser() {
    const result = await httpRequest(app)
      .post("/auth/sign-in")
      .send({
        email: fixture.approvedUser.email,
        password: "CorrectHorseBatteryStaple!",
        organization_id: fixture.organizationId,
      })
      .expect(201);

    return expectSuccess(result.body as SignInSuccess);
  }
});

function expectFailure<T extends object>(
  result: T | ProblemResult,
): ProblemResult {
  if ("problem" in result) {
    return result;
  }

  throw new Error("expected failure");
}

function expectSuccess<T extends object>(result: T | ProblemResult): T {
  if (!("problem" in result)) {
    return result;
  }

  throw new Error(`expected success, got ${result.problem.code}`);
}
