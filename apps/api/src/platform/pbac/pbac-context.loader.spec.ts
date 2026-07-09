import { jest } from "@jest/globals";

import { Membership } from "../../modules/auth-workspace/domain/entities/membership.entity.js";
import { MfaEnrollment } from "../../modules/auth-workspace/domain/entities/mfa-enrollment.entity.js";
import { Policy } from "../../modules/auth-workspace/domain/entities/policy.entity.js";
import { Session } from "../../modules/auth-workspace/domain/entities/session.entity.js";
import type { MembershipRepository } from "../../modules/auth-workspace/application/ports/persistence/membership.repository.js";
import type { MfaEnrollmentRepository } from "../../modules/auth-workspace/application/ports/persistence/mfa.repository.js";
import type { PolicyRepository } from "../../modules/auth-workspace/application/ports/persistence/policy.repository.js";
import type { SessionRepository } from "../../modules/auth-workspace/application/ports/persistence/session.repository.js";
import { PbacContextLoader } from "./pbac-context.loader.js";

const NOW = 1_700_000_000_000;

function makeSession(
  overrides: Partial<ConstructorParameters<typeof Session>[0]> = {},
): Session {
  return new Session({
    id: "session-1",
    userId: "user-1",
    organizationId: "org-1",
    tokenHash: "hash",
    expiresAt: NOW + 60_000,
    revokedAt: null,
    mfaVerifiedAt: null,
    ...overrides,
  });
}

function makeMembership(
  overrides: Partial<ConstructorParameters<typeof Membership>[0]> = {},
): Membership {
  return new Membership({
    id: "membership-1",
    userId: "user-1",
    organizationId: "org-1",
    status: "active",
    subjectAttributes: { role: "Manager" },
    policyId: "policy-1",
    policyVersion: "v1",
    ...overrides,
  });
}

function makePolicy(
  overrides: Partial<ConstructorParameters<typeof Policy>[0]> = {},
): Policy {
  return new Policy({
    id: "policy-1",
    version: "v1",
    actions: ["invite:developer"],
    subjectRole: "Manager",
    stateGate: "membership_active",
    organizationId: "org-1",
    ...overrides,
  });
}

function makeLoader(
  overrides: {
    sessions?: Partial<SessionRepository>;
    memberships?: Partial<MembershipRepository>;
    policies?: Partial<PolicyRepository>;
    mfaEnrollments?: Partial<MfaEnrollmentRepository>;
  } = {},
) {
  const sessions = {
    findByFingerprint: jest
      .fn<SessionRepository["findByFingerprint"]>()
      .mockResolvedValue(makeSession()),
    ...overrides.sessions,
  } as unknown as SessionRepository;
  const memberships = {
    findByUserAndOrganization: jest
      .fn<MembershipRepository["findByUserAndOrganization"]>()
      .mockResolvedValue(makeMembership()),
    ...overrides.memberships,
  } as unknown as MembershipRepository;
  const policies = {
    findByIdAndVersion: jest
      .fn<PolicyRepository["findByIdAndVersion"]>()
      .mockResolvedValue(makePolicy()),
    ...overrides.policies,
  };
  const mfaEnrollments = {
    findByUserId: jest
      .fn<MfaEnrollmentRepository["findByUserId"]>()
      .mockResolvedValue(null),
    ...overrides.mfaEnrollments,
  } as unknown as MfaEnrollmentRepository;

  return new PbacContextLoader(sessions, memberships, policies, mfaEnrollments);
}

describe("PbacContextLoader", () => {
  it("resolves session, membership, and policy on the happy path", async () => {
    const loader = makeLoader();
    const result = await loader.load("raw-token", NOW);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.id).toBe("session-1");
      expect(result.membership.id).toBe("membership-1");
      expect(result.policy.id).toBe("policy-1");
    }
  });

  it("SESSION_INVALID when no session matches the token fingerprint", async () => {
    const loader = makeLoader({
      sessions: {
        findByFingerprint: jest
          .fn<SessionRepository["findByFingerprint"]>()
          .mockResolvedValue(null),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "SESSION_INVALID" });
  });

  it("SESSION_INVALID when the session has expired", async () => {
    const loader = makeLoader({
      sessions: {
        findByFingerprint: jest
          .fn<SessionRepository["findByFingerprint"]>()
          .mockResolvedValue(makeSession({ expiresAt: NOW - 1000 })),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "SESSION_INVALID" });
  });

  it("SESSION_INVALID when the session is revoked", async () => {
    const loader = makeLoader({
      sessions: {
        findByFingerprint: jest
          .fn<SessionRepository["findByFingerprint"]>()
          .mockResolvedValue(makeSession({ revokedAt: NOW - 1000 })),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "SESSION_INVALID" });
  });

  it("MFA_REQUIRED when MFA is enrolled but the session has not verified it", async () => {
    const loader = makeLoader({
      mfaEnrollments: {
        findByUserId: jest
          .fn<MfaEnrollmentRepository["findByUserId"]>()
          .mockResolvedValue(
            new MfaEnrollment({
              userId: "user-1",
              encryptedSecret: "enc",
              enrolledAt: NOW,
            }),
          ),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "MFA_REQUIRED" });
  });

  it("allows when MFA is enrolled and the session has verified it", async () => {
    const loader = makeLoader({
      sessions: {
        findByFingerprint: jest
          .fn<SessionRepository["findByFingerprint"]>()
          .mockResolvedValue(makeSession({ mfaVerifiedAt: NOW - 1000 })),
      },
      mfaEnrollments: {
        findByUserId: jest
          .fn<MfaEnrollmentRepository["findByUserId"]>()
          .mockResolvedValue(
            new MfaEnrollment({
              userId: "user-1",
              encryptedSecret: "enc",
              enrolledAt: NOW,
            }),
          ),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result.ok).toBe(true);
  });

  it("allows when MFA is not enrolled, regardless of mfaVerifiedAt", async () => {
    const loader = makeLoader();

    const result = await loader.load("raw-token", NOW);

    expect(result.ok).toBe(true);
  });

  it("MEMBERSHIP_MISSING when no membership exists for the user/org", async () => {
    const loader = makeLoader({
      memberships: {
        findByUserAndOrganization: jest
          .fn<MembershipRepository["findByUserAndOrganization"]>()
          .mockResolvedValue(null),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "MEMBERSHIP_MISSING" });
  });

  it("MEMBERSHIP_MISSING when the membership exists but is not active", async () => {
    const loader = makeLoader({
      memberships: {
        findByUserAndOrganization: jest
          .fn<MembershipRepository["findByUserAndOrganization"]>()
          .mockResolvedValue(makeMembership({ status: "revoked" })),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "MEMBERSHIP_MISSING" });
  });

  it("POLICY_NOT_FOUND when the membership's policy cannot be loaded", async () => {
    const loader = makeLoader({
      policies: {
        findByIdAndVersion: jest
          .fn<PolicyRepository["findByIdAndVersion"]>()
          .mockResolvedValue(null),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "POLICY_NOT_FOUND" });
  });

  it("LOAD_ERROR (deny, never throw) when a repository throws", async () => {
    const loader = makeLoader({
      sessions: {
        findByFingerprint: jest
          .fn<SessionRepository["findByFingerprint"]>()
          .mockRejectedValue(new Error("db unavailable")),
      },
    });

    const result = await loader.load("raw-token", NOW);

    expect(result).toEqual({ ok: false, reason: "LOAD_ERROR" });
  });
});
