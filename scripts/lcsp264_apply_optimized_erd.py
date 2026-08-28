from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace(path: str, old: str, new: str, *, required: bool = True) -> None:
    text = read(path)
    if old not in text:
        if required:
            raise RuntimeError(f"Expected text not found in {path}: {old[:120]!r}")
        return
    write(path, text.replace(old, new))


def insert_before(path: str, marker: str, addition: str) -> None:
    text = read(path)
    if addition in text:
        return
    if marker not in text:
        raise RuntimeError(f"Marker not found in {path}: {marker!r}")
    write(path, text.replace(marker, addition + marker, 1))


def transform_schema() -> None:
    path = "apps/api/prisma/schema.prisma"
    schema = read(path)
    if "model AuthUser {" not in schema:
        return
    start = schema.index("model AuthUser {")
    end = schema.index("model OutboxMessage {")
    auth_block = '''model User {
  id                        String                         @id
  email                     String                         @unique
  passwordHash              String
  emailVerified             Boolean
  failedLoginCount          Int
  lockUntil                 DateTime?
  displayName               String?
  recoveryEmail             String?
  primaryEmailAddressPolicy AuthPrimaryEmailAddressPolicy @default(ACCOUNT_EMAIL)
  backupEmailPolicy         AuthBackupEmailPolicy          @default(RECOVERY_EMAIL)
  role                      AuthUserRole                    @default(CUSTOMER)
  mfaRequired               Boolean                        @default(false)
  mfaEncryptedSecret        String?
  mfaEnrolledAt             DateTime?
  mfaVerifiedAt             DateTime?
  mfaFailedCount            Int                            @default(0)
  mfaLockedUntil            DateTime?
  createdAt                 DateTime                       @default(now())
  updatedAt                 DateTime                       @updatedAt
  approvedVerifiedProfiles  VerifiedProfile[]              @relation("VerifiedProfileApprover")
  assessmentOwners          Assessment[]                   @relation("AssessmentOwner")
  auditExportRequests       AuditExportRequest[]           @relation("AuditExportRequester")
  authRecords               AuthRecord[]
  classificationReviews     ClassificationReviewRequest[]  @relation("ClassificationReviewRequester")
  documentRequests          DocumentRequest[]              @relation("DocumentRequestRequester")
  gitHubAppInstallStates    GitHubAppInstallState[]        @relation("GitHubAppInstallStateUser")
  readinessExports          ReadinessExport[]              @relation("ReadinessExportOwner")
  repositoryConnections     RepositoryConnection[]         @relation("RepositoryConnectionUser")
  repositorySnapshots       RepositorySnapshot[]           @relation("RepositorySnapshotActor")
  resolvedConflicts         ConflictRecord[]               @relation("ConflictRecordResolver")
  wizardProfiles            WizardProfile[]                @relation("WizardProfileOwner")
}

model AuthRecord {
  id         String         @id
  userId     String?
  type       AuthRecordType
  lookupKey  String         @unique
  secretHash String?
  expiresAt  DateTime?
  usedAt     DateTime?
  revokedAt  DateTime?
  metadata   Json?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  user       User?          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type])
  @@index([type, expiresAt])
  @@index([userId, type, revokedAt, usedAt])
}

enum AuthRecordType {
  SESSION
  MFA_OTP_USE
  MFA_RECOVERY_CODE
  RECOVERY_REQUEST
  OAUTH_IDENTITY
  OAUTH_STATE
}

enum AuthBackupEmailPolicy {
  ALL_VERIFIED
  RECOVERY_EMAIL
}

enum AuthPrimaryEmailAddressPolicy {
  ACCOUNT_EMAIL
  RECOVERY_EMAIL
}

model AuditEvent {
  id            String             @id
  eventType     String
  actorId       String?
  resourceType  AuditResourceType?
  resourceId    String?
  decision      AuthDecision?
  reasonCode    String?
  correlationId String
  sessionId     String?
  payload       Json
  createdAt     DateTime           @default(now())

  @@index([correlationId])
  @@index([actorId, createdAt])
  @@index([eventType, createdAt])
}

'''
    schema = schema[:start] + auth_block + schema[end:]
    schema = re.sub(r"\bAuthUser\b", "User", schema)
    write(path, schema)


def write_migration() -> None:
    migration = ROOT / "apps/api/prisma/migrations/20260828170000_optimize_auth_erd"
    migration.mkdir(parents=True, exist_ok=True)
    migration.joinpath("migration.sql").write_text('''-- LCSP-264: collapse auth persistence to User + AuthRecord and generalize audit storage.

ALTER TABLE "AuthUser" RENAME TO "User";

ALTER TABLE "User"
  ADD COLUMN "mfaEncryptedSecret" TEXT,
  ADD COLUMN "mfaEnrolledAt" TIMESTAMP(3),
  ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "mfaFailedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mfaLockedUntil" TIMESTAMP(3);

UPDATE "User" AS u
SET "mfaEncryptedSecret" = m."encryptedSecret",
    "mfaEnrolledAt" = m."enrolledAt",
    "mfaVerifiedAt" = m."verifiedAt"
FROM "AuthUserMfa" AS m
WHERE u.id = m."userId";

UPDATE "User" AS u
SET "mfaFailedCount" = r."failedCount",
    "mfaLockedUntil" = r."lockedUntil"
FROM "AuthMfaRateLimit" AS r
WHERE u.id = r."userId";

CREATE TYPE "AuthRecordType" AS ENUM ('SESSION','MFA_OTP_USE','MFA_RECOVERY_CODE','RECOVERY_REQUEST','OAUTH_IDENTITY','OAUTH_STATE');

CREATE TABLE "AuthRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "type" "AuthRecordType" NOT NULL,
  "lookupKey" TEXT NOT NULL,
  "secretHash" TEXT,
  "expiresAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthRecord_lookupKey_key" ON "AuthRecord"("lookupKey");
CREATE INDEX "AuthRecord_userId_type_idx" ON "AuthRecord"("userId", "type");
CREATE INDEX "AuthRecord_type_expiresAt_idx" ON "AuthRecord"("type", "expiresAt");
CREATE INDEX "AuthRecord_userId_type_revokedAt_usedAt_idx" ON "AuthRecord"("userId", "type", "revokedAt", "usedAt");

INSERT INTO "AuthRecord" ("id","userId","type","lookupKey","secretHash","expiresAt","revokedAt","metadata","createdAt","updatedAt")
SELECT s.id,s."userId",'SESSION'::"AuthRecordType",'SESSION:'||s."tokenFingerprint",s."tokenHash",s."expiresAt",s."revokedAt",
  jsonb_build_object('tokenFingerprint',s."tokenFingerprint",'mfaVerifiedAt',CASE WHEN s."mfaVerifiedAt" IS NULL THEN NULL ELSE to_jsonb(s."mfaVerifiedAt"::text) END,'sensitiveActionVerifiedAt',CASE WHEN s."sensitiveActionVerifiedAt" IS NULL THEN NULL ELSE to_jsonb(s."sensitiveActionVerifiedAt"::text) END),
  s."createdAt",s."updatedAt" FROM "AuthSession" s;

INSERT INTO "AuthRecord" ("id","userId","type","lookupKey","usedAt","metadata","createdAt","updatedAt")
SELECT m."userId"||':otp:'||m."otpCode",m."userId",'MFA_OTP_USE'::"AuthRecordType",'MFA_OTP_USE:'||m."userId"||':'||m."otpCode",m."usedAt",jsonb_build_object('otpCode',m."otpCode"),m."usedAt",m."usedAt" FROM "AuthMfaOtpUsed" m;

INSERT INTO "AuthRecord" ("id","userId","type","lookupKey","secretHash","usedAt","revokedAt","metadata","createdAt","updatedAt")
SELECT r.id,r."userId",'MFA_RECOVERY_CODE'::"AuthRecordType",'MFA_RECOVERY_CODE:'||r."userId"||':'||r."codeHash",r."codeHash",r."usedAt",r."revokedAt",jsonb_build_object('batchId',r."batchId"),r."generatedAt",r."generatedAt" FROM "AuthMfaRecoveryCode" r;

INSERT INTO "AuthRecord" ("id","userId","type","lookupKey","secretHash","expiresAt","usedAt","metadata","createdAt","updatedAt")
SELECT r.id,r."userId",'RECOVERY_REQUEST'::"AuthRecordType",'RECOVERY_REQUEST:'||r."tokenFingerprint",r."tokenHash",r."expiresAt",r."consumedAt",jsonb_build_object('tokenFingerprint',r."tokenFingerprint"),r."createdAt",r."createdAt" FROM "AuthRecoveryRequest" r;

INSERT INTO "AuthRecord" ("id","userId","type","lookupKey","expiresAt","metadata","createdAt","updatedAt")
SELECT s.id,s."userId",'OAUTH_STATE'::"AuthRecordType",'OAUTH_STATE:'||s.state,s."expiresAt",jsonb_build_object('state',s.state,'nonce',s.nonce,'provider',s.provider,'redirectUri',s."redirectUri",'sessionId',s."sessionId"),s."createdAt",s."createdAt" FROM "AuthOAuthState" s;

INSERT INTO "AuthRecord" ("id","userId","type","lookupKey","metadata","createdAt","updatedAt")
SELECT i.id,i."userId",'OAUTH_IDENTITY'::"AuthRecordType",'OAUTH_IDENTITY:'||i.provider||':'||i."providerAccountId",jsonb_build_object('provider',i.provider,'providerAccountId',i."providerAccountId"),i."createdAt",i."createdAt" FROM "AuthOAuthIdentity" i;

ALTER TABLE "AuthAuditEvent" RENAME TO "AuditEvent";

INSERT INTO "AuditEvent" ("id","eventType","actorId","resourceType","resourceId","decision","reasonCode","correlationId","sessionId","payload","createdAt")
SELECT d.id,'AUTHORIZATION_DECISION',d."actorId",d."resourceType",d."resourceId",d.decision,d."reasonCode"::text,d."correlationId",d."sessionId",d.payload,d."createdAt"
FROM "AuthDecisionLog" d ON CONFLICT ("id") DO NOTHING;

DROP TABLE "AuthOAuthState";
DROP TABLE "AuthOAuthIdentity";
DROP TABLE "AuthRecoveryRequest";
DROP TABLE "AuthMfaRecoveryCode";
DROP TABLE "AuthMfaOtpUsed";
DROP TABLE "AuthMfaRateLimit";
DROP TABLE "AuthUserMfa";
DROP TABLE "AuthSession";
DROP TABLE "AuthDecisionLog";
''')


def selective_prisma_renames() -> None:
    roots = [ROOT / "apps/api/src", ROOT / "apps/api/test", ROOT / "apps/api/scripts", ROOT / "scripts"]
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix not in {".ts", ".mjs", ".js"}:
                continue
            text = path.read_text()
            for owner in ("prisma", "tx", "client"):
                text = text.replace(f"{owner}.authUser", f"{owner}.user")
                text = text.replace(f"{owner}.authAuditEvent", f"{owner}.auditEvent")
                text = text.replace(f"{owner}.authDecisionLog", f"{owner}.auditEvent")
            text = text.replace("Prisma.AuthAuditEventWhereInput", "Prisma.AuditEventWhereInput")
            text = text.replace("AuthDecisionLog", "authorization AuditEvent")
            text = text.replace("AuthAuditEvent", "AuditEvent")
            path.write_text(text)


def patch_test_support() -> None:
    path = "apps/api/test/support/auth-workspace-test-helpers.ts"
    insert_before(path, "const testSupportDir", 'import { createAuthSessionRecord } from "./auth-record-test-helpers.js";\n\n')
    text = read(path)
    text = re.sub(
        r"  await prisma\.auditEvent\.deleteMany\(\);\n(?:  await prisma\.[^\n]+\.deleteMany\(\);\n){8}  await prisma\.user\.deleteMany\(\);",
        '  await prisma.auditEvent.deleteMany();\n  await prisma.authRecord.deleteMany();\n  await prisma.user.deleteMany();',
        text,
        count=1,
    )
    text = re.sub(
        r"export async function seedMfaEnrollment\(\n  prisma: PrismaClient,\n  userId: string,\n\): Promise<MfaFixture> \{\n  const totpSecret = generateTotpSecret\(\);\n  await prisma\.authUserMfa\.create\(\{\n    data: \{\n      userId,\n      encryptedSecret: encryptMfaSecret\(totpSecret\),\n      enrolledAt: new Date\(\),\n    \},\n  \}\);",
        '''export async function seedMfaEnrollment(\n  prisma: PrismaClient,\n  userId: string,\n): Promise<MfaFixture> {\n  const totpSecret = generateTotpSecret();\n  await prisma.user.update({\n    where: { id: userId },\n    data: {\n      mfaEncryptedSecret: encryptMfaSecret(totpSecret),\n      mfaEnrolledAt: new Date(),\n      mfaVerifiedAt: null,\n    },\n  });''',
        text,
        count=1,
    )
    text = re.sub(
        r"  const revokedSessionToken = \"revoked-session-token\";\n  await prisma\.authSession\.create\(\{\n    data: \{\n      id: \"session-0\",\n      userId: approvedUserId,\n      tokenHash: hashSecret\(revokedSessionToken\),\n      tokenFingerprint: fingerprintToken\(revokedSessionToken\),\n      expiresAt: new Date\(Date\.now\(\) \+ 30 \* 60_000\),\n      revokedAt: new Date\(\),\n    \},\n  \}\);",
        '''  const revokedSessionToken = "revoked-session-token";\n  await createAuthSessionRecord(prisma, {\n    id: "session-0",\n    userId: approvedUserId,\n    token: revokedSessionToken,\n    expiresAt: new Date(Date.now() + 30 * 60_000),\n    revokedAt: new Date(),\n  });''',
        text,
        count=1,
    )
    write(path, text)


def patch_auth_workspace_test() -> None:
    path = "apps/api/test/auth-workspace.e2e-spec.ts"
    insert_before(path, 'describe("Auth workspace (e2e)"', '''import {\n  AUTH_RECORD_TYPE,\n  authRecordMetadataString,\n  createAuthSessionRecord,\n  findLatestAuthSession,\n} from "./support/auth-record-test-helpers.js";\n\n''')
    text = read(path)
    text = text.replace("prisma.authDecisionLog", "prisma.auditEvent")
    text = text.replace("prisma.authAuditEvent", "prisma.auditEvent")
    text = text.replace("prisma.authMfaRecoveryCode", "prisma.authRecord")
    text = text.replace(
        '''    const session = await prisma.authSession.findFirst({\n      where: {\n        userId: fixture.approvedUser.id,\n      },\n      orderBy: { createdAt: "desc" },\n    });\n    assert.ok(session?.sensitiveActionVerifiedAt);''',
        '''    const session = await findLatestAuthSession(prisma, fixture.approvedUser.id);\n    assert.ok(session);\n    assert.ok(authRecordMetadataString(session, "sensitiveActionVerifiedAt"));''',
    )
    text = text.replace(
        '''    const usedCodes = await prisma.authRecord.findMany({\n      where: { userId: fixture.approvedUser.id, usedAt: { not: null } },\n    });''',
        '''    const usedCodes = await prisma.authRecord.findMany({\n      where: {\n        userId: fixture.approvedUser.id,\n        type: AUTH_RECORD_TYPE.mfaRecoveryCode,\n        usedAt: { not: null },\n      },\n    });''',
    )
    text = re.sub(
        r'''    await prisma\.authSession\.create\(\{\n      data: \{\n        id: "session-expired",\n        userId: fixture\.approvedUser\.id,\n        tokenHash: hashSecret\(expiredToken\),\n        tokenFingerprint: fingerprintToken\(expiredToken\),\n        expiresAt: new Date\(Date\.now\(\) - 1000\),\n        revokedAt: null,\n      \},\n    \}\);''',
        '''    await createAuthSessionRecord(prisma, {\n      id: "session-expired",\n      userId: fixture.approvedUser.id,\n      token: expiredToken,\n      expiresAt: new Date(Date.now() - 1000),\n      revokedAt: null,\n    });''',
        text,
        count=1,
    )
    text = re.sub(
        r'''    await prisma\.authUserMfa\.deleteMany\(\{\n      where: \{ userId: fixture\.approvedUser\.id \},\n    \}\);''',
        '''    await prisma.user.update({\n      where: { id: fixture.approvedUser.id },\n      data: {\n        mfaEncryptedSecret: null,\n        mfaEnrolledAt: null,\n        mfaVerifiedAt: null,\n      },\n    });''',
        text,
        count=1,
    )
    # Authorization decisions now share AuditEvent storage.
    text = text.replace('where: { correlationId: "corr-workspace-no-session" },', 'where: { eventType: "AUTHORIZATION_DECISION", correlationId: "corr-workspace-no-session" },')
    text = text.replace('where: { correlationId: "corr-workspace-allow" },', 'where: { eventType: "AUTHORIZATION_DECISION", correlationId: "corr-workspace-allow" },')
    text = text.replace('correlationId: "corr-manager-workspace-context",\n        resourceType:', 'eventType: "AUTHORIZATION_DECISION",\n        correlationId: "corr-manager-workspace-context",\n        resourceType:')
    text = text.replace("AuthDecisionLog", "authorization AuditEvent").replace("AuthAuditEvent", "AuditEvent")
    write(path, text)


def patch_github_tests() -> None:
    for path in ["apps/api/test/github-app-start.e2e-spec.ts", "apps/api/test/github-app-callback.e2e-spec.ts"]:
        insert_before(path, "const ALLOWED_REDIRECT_URI", '''import {\n  countAuthSessions,\n  setSessionSensitiveActionVerifiedAt,\n} from "./support/auth-record-test-helpers.js";\n\n''')
        text = read(path)
        text = re.sub(
            r'''    await prisma\.authSession\.updateMany\(\{\n      where: \{ userId: "user-1" \},\n      data: \{ sensitiveActionVerifiedAt: new Date\(\) \},\n    \}\);''',
            '    await setSessionSensitiveActionVerifiedAt(prisma, "user-1", new Date());',
            text,
        )
        text = re.sub(
            r'''    await prisma\.authSession\.updateMany\(\{\n      where: \{ userId: "user-1" \},\n      data: \{ sensitiveActionVerifiedAt: null \},\n    \}\);''',
            '    await setSessionSensitiveActionVerifiedAt(prisma, "user-1", null);',
            text,
        )
        text = text.replace("await prisma.authSession.count()", "await countAuthSessions(prisma)")
        text = text.replace("prisma.authAuditEvent", "prisma.auditEvent")
        write(path, text)


def patch_oauth_test() -> None:
    path = "apps/api/test/oauth-login.e2e-spec.ts"
    insert_before(path, "const ALLOWED_REDIRECT_URI", '''import {\n  AUTH_RECORD_TYPE,\n  authRecordMetadataString,\n  createOAuthIdentityRecord,\n  createOAuthStateRecord,\n  findOAuthStateRecord,\n} from "./support/auth-record-test-helpers.js";\n\n''')
    text = read(path)
    text = text.replace("prisma.authAuditEvent", "prisma.auditEvent")
    text = text.replace(
        "const stateRow = await prisma.authOAuthState.findFirst();",
        "const stateRow = await findOAuthStateRecord(prisma);",
    )
    text = text.replace('assert.ok(stateRow, "expected an AuthOAuthState row to be persisted");', 'assert.ok(stateRow, "expected an OAuth state AuthRecord to be persisted");')
    text = text.replace("new RegExp(stateRow.state)", 'new RegExp(authRecordMetadataString(stateRow, "state") ?? "")')
    text = text.replace("new RegExp(stateRow.nonce)", 'new RegExp(authRecordMetadataString(stateRow, "nonce") ?? "")')
    text = text.replace(
        '''    const session = await prisma.authSession.findFirst({\n      where: { userId },\n    });''',
        '''    const session = await prisma.authRecord.findFirst({\n      where: { userId, type: AUTH_RECORD_TYPE.session },\n    });''',
    )
    text = re.sub(
        r'''    await prisma\.authOAuthState\.create\(\{\n      data: \{\n        id: "state-expired",\n        state: "expired-state-value",\n        nonce: "expired-nonce-value",\n        provider: "google",\n        redirectUri: ALLOWED_REDIRECT_URI,\n        expiresAt: new Date\(Date\.now\(\) - 1000\),\n      \},\n    \}\);''',
        '''    await createOAuthStateRecord(prisma, {\n      id: "state-expired",\n      state: "expired-state-value",\n      nonce: "expired-nonce-value",\n      provider: "google",\n      redirectUri: ALLOWED_REDIRECT_URI,\n      expiresAt: new Date(Date.now() - 1000),\n    });''',
        text,
        count=1,
    )
    text = re.sub(
        r'''    const stateRow = await prisma\.authOAuthState\.findFirst\(\{\n      where: \{ state \},\n    \}\);\n    assert\.ok\(stateRow, "expected a state row for the returned state"\);\n    oauthNonceForMock = stateRow\.nonce;''',
        '''    const stateRow = await findOAuthStateRecord(prisma, state);\n    assert.ok(stateRow, "expected a state row for the returned state");\n    oauthNonceForMock = authRecordMetadataString(stateRow, "nonce") ?? "";''',
        text,
        count=1,
    )
    text = text.replace("await prisma.authUser.create({", "await prisma.user.create({")
    text = re.sub(
        r'''    await prisma\.authOAuthIdentity\.create\(\{\n      data: \{\n        id: `identity-\$\{input\.providerAccountId\}`,\n        userId,\n        provider: "google",\n        providerAccountId: input\.providerAccountId,\n      \},\n    \}\);''',
        '''    await createOAuthIdentityRecord(prisma, {\n      id: `identity-${input.providerAccountId}`,\n      userId,\n      provider: "google",\n      providerAccountId: input.providerAccountId,\n    });''',
        text,
        count=1,
    )
    write(path, text)


def patch_simple_tests_and_scripts() -> None:
    replacements = {
        "apps/api/test/sign-up.e2e-spec.ts": [("prisma.authSession", "prisma.authRecord")],
        "apps/api/test/get-technical-evidence.e2e-spec.ts": [("prisma.authDecisionLog", "prisma.auditEvent")],
        "apps/api/test/redaction-boundary.e2e-spec.ts": [("prisma.authAuditEvent", "prisma.auditEvent"), ("prisma.authDecisionLog", "prisma.auditEvent"), ("AuthAuditEvent", "AuditEvent"), ("AuthDecisionLog", "authorization AuditEvent")],
        "apps/api/test/audit-trail.e2e-spec.ts": [("prisma.authAuditEvent", "prisma.auditEvent"), ("prisma.authDecisionLog", "prisma.auditEvent"), ("AuthAuditEvent", "AuditEvent"), ("AuthDecisionLog", "authorization AuditEvent")],
    }
    for path, pairs in replacements.items():
        text = read(path)
        for old, new in pairs:
            text = text.replace(old, new)
        write(path, text)

    path = "scripts/delete-assessment.mjs"
    text = read(path)
    text = text.replace('"AuthAuditEvent"', '"AuditEvent"')
    text = text.replace('"AuthDecisionLog"', '"AuditEvent"')
    text = text.replace("tx.authDecisionLog", "tx.auditEvent")
    text = text.replace("tx.authAuditEvent", "tx.auditEvent")
    write(path, text)


def patch_likec4() -> None:
    path = "likec4/feature_flows.c4"
    text = read(path).replace("AuthSession record", "AuthRecord(type=SESSION) record").replace("AuthAuditEvent", "AuditEvent")
    write(path, text)
    path = "likec4/dev_detail.c4"
    write(path, read(path).replace("AuthAuditEvent", "AuditEvent"))

    path = "likec4/erd.c4"
    text = read(path)
    text = re.sub(r'''\s+authUserEntity = entity 'AuthUser' \{.*?\n\s+authAuditEventEntity = entity 'AuthAuditEvent' \{.*?\n\s+\}\n''', '''\n    userEntity = entity 'User' {\n      description 'Account, role, profile and singleton MFA state.'\n    }\n\n    authRecordEntity = entity 'AuthRecord' {\n      description 'Session, OAuth, recovery and MFA multi-row records.'\n    }\n\n    auditEventEntity = entity 'AuditEvent' {\n      description 'Platform audit trail, including authorization decisions.'\n    }\n''', text, flags=re.S)
    text = text.replace("authUserEntity", "userEntity").replace("authSessionEntity", "authRecordEntity").replace("authAuditEventEntity", "auditEventEntity")
    text = text.replace("AuthOrganization, AuthUser, AuthPolicy, AuthMembership, AuthSession, and AuthAuditEvent entities.", "Optimized User, AuthRecord, and platform AuditEvent entities.")
    write(path, text)


def patch_production_strings() -> None:
    for path in ["apps/api/src/platform/rbac/rbac.guard.ts", "apps/api/src/platform/rbac/rbac-preflight.service.ts"]:
        text = read(path).replace("Failed to write AuthDecisionLog", "Failed to write authorization AuditEvent")
        write(path, text)


def main() -> None:
    transform_schema()
    write_migration()
    selective_prisma_renames()
    patch_production_strings()
    patch_test_support()
    patch_auth_workspace_test()
    patch_github_tests()
    patch_oauth_test()
    patch_simple_tests_and_scripts()
    patch_likec4()


if __name__ == "__main__":
    main()
