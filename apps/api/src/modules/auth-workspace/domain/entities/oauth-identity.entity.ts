export class OAuthIdentity {
  readonly id: string;
  readonly userId: string;
  readonly provider: string;
  readonly providerAccountId: string;
  readonly createdAt: number;

  constructor(input: {
    id: string;
    userId: string;
    provider: string;
    providerAccountId: string;
    createdAt: number;
  }) {
    this.id = input.id;
    this.userId = input.userId;
    this.provider = input.provider;
    this.providerAccountId = input.providerAccountId;
    this.createdAt = input.createdAt;
  }
}
