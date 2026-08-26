import type {
  CredentialProvider,
  GitHubCredentialErrorCode,
  ProviderCredentialStatus,
} from "@lcsp/contracts/github-integration";

export const PROVIDER_CREDENTIAL_REPOSITORY = Symbol(
  "PROVIDER_CREDENTIAL_REPOSITORY",
);

export type ProviderCredentialRecord = {
  id: string;
  provider: CredentialProvider;
  organizationId: string;
  ownerUserId: string;
  providerAccountId: bigint;
  providerLogin: string;
  status: ProviderCredentialStatus;
  currentVersion: number;
  declaredExpiresAt: Date | null;
  validatedAt: Date | null;
};

export interface ProviderCredentialRepository {
  create(record: ProviderCredentialRecord): Promise<void>;
  deactivateActive(
    organizationId: string,
    ownerUserId: string,
    provider: CredentialProvider,
  ): Promise<void>;
  findByIdForOrganization(
    id: string,
    organizationId: string,
  ): Promise<ProviderCredentialRecord | null>;
  updateLifecycle(
    id: string,
    organizationId: string,
    status: ProviderCredentialStatus,
    safeFailureCode?: GitHubCredentialErrorCode,
  ): Promise<boolean>;
  updateVersion(
    id: string,
    organizationId: string,
    expectedVersion: number,
    newVersion: number,
  ): Promise<boolean>;
  markValidated(id: string, organizationId: string, at: Date): Promise<boolean>;
  markUsed(
    id: string,
    organizationId: string,
    version: number,
    at: Date,
  ): Promise<boolean>;
}
