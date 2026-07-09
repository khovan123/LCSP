import type { OAuthIdentity } from "../../../domain/models/auth-workspace.models.ts";

export interface OAuthIdentityRepository {
  findByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<OAuthIdentity | null>;
}
