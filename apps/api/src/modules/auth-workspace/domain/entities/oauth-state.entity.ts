import { randomUUID } from "node:crypto";

type OAuthStateInput = {
  state: string;
  nonce: string;
  provider: string;
  redirectUri: string;
  expiresAt: number;
};

export class OAuthState {
  readonly id: string;
  readonly state: string;
  readonly nonce: string;
  readonly provider: string;
  readonly redirectUri: string;
  readonly expiresAt: number;

  constructor(input: OAuthStateInput) {
    this.id = randomUUID();
    this.state = input.state;
    this.nonce = input.nonce;
    this.provider = input.provider;
    this.redirectUri = input.redirectUri;
    this.expiresAt = input.expiresAt;
  }

  static rehydrate(input: OAuthStateInput & { id: string }): OAuthState {
    const entity = new OAuthState(input);
    Object.assign(entity, { id: input.id });
    return entity;
  }

  isExpired(now: number): boolean {
    return this.expiresAt <= now;
  }
}
