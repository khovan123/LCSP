export const CREDENTIAL_STORE = Symbol("CREDENTIAL_STORE");

export type SecretLocator = string & {
  readonly __secretLocator: unique symbol;
};

import type { CredentialProvider } from "@lcsp/contracts/github-integration";

export type CredentialStorageContext = {
  provider: CredentialProvider;
  providerCredentialId: string;
  organizationId: string;
  ownerUserId: string;
  credentialVersion: number;
  envelopeVersion: number;
};

export const CREDENTIAL_STORE_HEALTH_STATUSES = {
  available: "AVAILABLE",
  unavailable: "UNAVAILABLE",
} as const;

export type CredentialStoreHealthStatus =
  (typeof CREDENTIAL_STORE_HEALTH_STATUSES)[keyof typeof CREDENTIAL_STORE_HEALTH_STATUSES];

export type CredentialStoreHealth = {
  status: CredentialStoreHealthStatus;
};

/** Stores encrypted values only and intentionally performs no actor authorization. */
export interface CredentialStorePort {
  store(
    secret: string,
    context: CredentialStorageContext,
  ): Promise<SecretLocator>;
  read(secretLocator: SecretLocator): Promise<string>;
  replace(
    oldSecretLocator: SecretLocator,
    newSecret: string,
    context: CredentialStorageContext,
  ): Promise<SecretLocator>;
  destroy(secretLocator: SecretLocator): Promise<void>;
  health(): Promise<CredentialStoreHealth>;
}
