export class OAuthState {
  readonly id: string;
  readonly state: string;
  readonly nonce: string;
  readonly provider: string;
  readonly redirectUri: string;
  readonly expiresAt: number;

  constructor(input: {
    id: string;
    state: string;
    nonce: string;
    provider: string;
    redirectUri: string;
    expiresAt: number;
  }) {
    this.id = input.id;
    this.state = input.state;
    this.nonce = input.nonce;
    this.provider = input.provider;
    this.redirectUri = input.redirectUri;
    this.expiresAt = input.expiresAt;
  }

  isExpired(now: number): boolean {
    return this.expiresAt <= now;
  }
}
