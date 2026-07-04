export class RecoveryRequest {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: number;
  consumedAt: number | null;

  constructor(input: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: number;
    consumedAt?: number | null;
  }) {
    this.id = input.id;
    this.userId = input.userId;
    this.tokenHash = input.tokenHash;
    this.expiresAt = input.expiresAt;
    this.consumedAt = input.consumedAt ?? null;
  }

  isValid(now: number): boolean {
    return this.consumedAt === null && this.expiresAt > now;
  }

  consume(now: number): void {
    this.consumedAt = now;
  }
}
