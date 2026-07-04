import { EmailAddress } from "../value-objects/email-address.value-object.ts";

export class User {
  readonly id: string;
  readonly email: EmailAddress;
  passwordHash: string;
  emailVerified: boolean;
  failedLoginCount: number;
  lockUntil: number | null;
  displayName: string | null;
  recoveryEmail: string | null;
  mfaRequired: boolean;

  constructor(input: {
    id: string;
    email: string;
    passwordHash: string;
    emailVerified: boolean;
    failedLoginCount?: number;
    lockUntil?: number | null;
    displayName?: string | null;
    recoveryEmail?: string | null;
    mfaRequired?: boolean;
  }) {
    this.id = input.id;
    this.email = EmailAddress.create(input.email);
    this.passwordHash = input.passwordHash;
    this.emailVerified = input.emailVerified;
    this.failedLoginCount = input.failedLoginCount ?? 0;
    this.lockUntil = input.lockUntil ?? null;
    this.displayName = input.displayName ?? null;
    this.recoveryEmail = input.recoveryEmail ?? null;
    this.mfaRequired = input.mfaRequired ?? false;
  }

  isLocked(now: number): boolean {
    return this.lockUntil !== null && this.lockUntil > now;
  }

  recordFailedLogin(
    now: number,
    failedLoginLimit: number,
    lockWindowMs: number,
  ): void {
    if (this.lockUntil !== null && this.lockUntil <= now) {
      this.failedLoginCount = 0;
      this.lockUntil = null;
    }

    this.failedLoginCount += 1;

    if (this.failedLoginCount >= failedLoginLimit) {
      this.lockUntil = now + lockWindowMs;
    }
  }

  clearFailedLogins(): void {
    this.failedLoginCount = 0;
    this.lockUntil = null;
  }
}
