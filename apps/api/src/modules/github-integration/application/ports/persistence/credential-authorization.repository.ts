import type { CredentialAuthorizationStatus } from "@lcsp/contracts/github-integration";

export const CREDENTIAL_AUTHORIZATION_REPOSITORY = Symbol(
  "CREDENTIAL_AUTHORIZATION_REPOSITORY",
);

export type CredentialAuthorizationRecord = {
  id: string;
  providerCredentialId: string;
  organizationId: string;
  repositoryId: string;
  repositoryFullName: string;
  assessmentId: string | null;
  authorizedByUserId: string;
  status: CredentialAuthorizationStatus;
  credentialVersion: number;
  validatedAt: Date | null;
};

export interface CredentialAuthorizationRepository {
  create(record: CredentialAuthorizationRecord): Promise<void>;
  findActiveForConnection(input: {
    connectionId: string;
    organizationId: string;
    repositoryFullName: string;
    assessmentId: string | null;
  }): Promise<CredentialAuthorizationRecord | null>;
  updateVersion(
    id: string,
    organizationId: string,
    expectedVersion: number,
    newVersion: number,
  ): Promise<boolean>;
  revoke(id: string, organizationId: string, at: Date): Promise<boolean>;
}
