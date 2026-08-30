import type { CredentialAuthorizationStatus } from "@lcsp/contracts/github-integration";

export const CREDENTIAL_AUTHORIZATION_REPOSITORY = Symbol(
  "CREDENTIAL_AUTHORIZATION_REPOSITORY",
);

export type CredentialAuthorizationRecord = {
  id: string;
  providerCredentialId: string;
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
    ownerUserId: string;
    repositoryFullName: string;
    assessmentId: string | null;
  }): Promise<CredentialAuthorizationRecord | null>;
  updateVersion(
    id: string,
    ownerUserId: string,
    expectedVersion: number,
    newVersion: number,
  ): Promise<boolean>;
  revoke(id: string, ownerUserId: string, at: Date): Promise<boolean>;
}
