export class Session {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly tokenHash: string;
  readonly expiresAt: number;
  revokedAt: number | null;
  mfaVerifiedAt: number | null;

  constructor(input: {
    id: string;
    userId: string;
    organizationId: string;
    tokenHash: string;
    expiresAt: number;
    revokedAt?: number | null;
    mfaVerifiedAt?: number | null;
  }) {
    this.id = input.id;
    this.userId = input.userId;
    this.organizationId = input.organizationId;
    this.tokenHash = input.tokenHash;
    this.expiresAt = input.expiresAt;
    this.revokedAt = input.revokedAt ?? null;
    this.mfaVerifiedAt = input.mfaVerifiedAt ?? null;
  }

  isActive(now: number): boolean {
    return this.revokedAt === null && this.expiresAt > now;
  }

  isMfaVerified(): boolean {
    return this.mfaVerifiedAt !== null;
  }

  revoke(now: number): void {
    this.revokedAt = now;
  }

  markMfaVerified(now: number): void {
    this.mfaVerifiedAt = now;
  }
}
