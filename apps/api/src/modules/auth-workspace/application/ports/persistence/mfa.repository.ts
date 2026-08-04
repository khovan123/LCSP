import type { MfaEnrollment } from "../../../domain/entities/mfa-enrollment.entity.ts";
import type { MfaRateLimit } from "../../../domain/entities/mfa-rate-limit.entity.ts";

export const AUTH_WORKSPACE_MFA_ENROLLMENT_REPOSITORY =
  "AUTH_WORKSPACE_MFA_ENROLLMENT_REPOSITORY";
export const AUTH_WORKSPACE_MFA_RATE_LIMIT_REPOSITORY =
  "AUTH_WORKSPACE_MFA_RATE_LIMIT_REPOSITORY";
export const AUTH_WORKSPACE_MFA_OTP_USED_REPOSITORY =
  "AUTH_WORKSPACE_MFA_OTP_USED_REPOSITORY";
export const AUTH_WORKSPACE_MFA_RECOVERY_CODE_REPOSITORY =
  "AUTH_WORKSPACE_MFA_RECOVERY_CODE_REPOSITORY";

export type MfaRecoveryCodeCreateInput = {
  id: string;
  codeHash: string;
};

export interface MfaEnrollmentRepository {
  findByUserId(userId: string): Promise<MfaEnrollment | null>;
  save(enrollment: MfaEnrollment): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface MfaRateLimitRepository {
  findByUserId(userId: string): Promise<MfaRateLimit | null>;
  save(rateLimit: MfaRateLimit): Promise<void>;
  resetByUserId(userId: string): Promise<void>;
  /** Atomically increments the failure counter (resetting first if the previous lock has expired) and applies lockout. */
  recordFailedAttempt(
    userId: string,
    now: number,
    limit: number,
    lockWindowMs: number,
  ): Promise<MfaRateLimit>;
}

export interface MfaOtpUsedRepository {
  isUsed(userId: string, otpCode: string): Promise<boolean>;
  /** Atomically marks the OTP as used; returns false if it was already used (unique-constraint race). */
  tryMarkUsed(userId: string, otpCode: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<void>;
  /** Deletes used-OTP records older than the given epoch-ms cutoff, since they can no longer be replayed. */
  pruneOlderThan(cutoffMs: number): Promise<void>;
}

export interface MfaRecoveryCodeRepository {
  nextId(): string;
  nextBatchId(): string;
  hasActiveForUser(userId: string): Promise<boolean>;
  replaceForUser(
    userId: string,
    codeRecords: readonly MfaRecoveryCodeCreateInput[],
    batchId: string,
    now: number,
  ): Promise<void>;
  revokeActiveForUser(userId: string, now: number): Promise<void>;
  tryConsume(userId: string, codeHash: string, now: number): Promise<boolean>;
}
