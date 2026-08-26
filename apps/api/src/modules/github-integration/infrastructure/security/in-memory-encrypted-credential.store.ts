import { randomUUID } from "node:crypto";

import {
  CREDENTIAL_STORE_HEALTH_STATUSES,
  type CredentialStorageContext,
  type CredentialStoreHealth,
  type CredentialStorePort,
  type SecretLocator,
} from "../../application/ports/security/credential-store.port.js";
import {
  EnvelopeEncryptionError,
  EnvelopeEncryptionService,
  type EncryptedSecretEnvelope,
} from "./envelope-encryption.service.js";

type EncryptedCredentialRecord = {
  envelope: EncryptedSecretEnvelope;
  organizationId: string;
  ownerUserId: string;
  context: CredentialStorageContext;
  createdAt: Date;
};

/** Stable, locator-free and secret-free credential-store failure. */
export class CredentialStoreError extends Error {
  readonly operation?: string;

  constructor(options?: { cause?: unknown; operation?: string }) {
    super("credential_store_operation_failed", { cause: options?.cause });
    this.name = "CredentialStoreError";
    this.operation = options?.operation;
  }
}

/**
 * Encrypted in-memory adapter for Phase 1 tests only.
 * Database persistence of the same envelope representation belongs to Phase 2.
 */
export class InMemoryEncryptedCredentialStore implements CredentialStorePort {
  private readonly records = new Map<
    SecretLocator,
    EncryptedCredentialRecord
  >();

  constructor(private readonly encryption: EnvelopeEncryptionService) {}

  async store(
    secret: string,
    context: CredentialStorageContext,
  ): Promise<SecretLocator> {
    try {
      const secretLocator = randomUUID() as SecretLocator;
      const envelope = await this.encryption.encryptSecret(secret, context);
      this.records.set(secretLocator, {
        envelope,
        organizationId: context.organizationId,
        ownerUserId: context.ownerUserId,
        context,
        createdAt: new Date(),
      });
      return secretLocator;
    } catch {
      throw new CredentialStoreError();
    }
  }

  async read(secretLocator: SecretLocator): Promise<string> {
    const record = this.records.get(secretLocator);
    if (!record) {
      throw new CredentialStoreError();
    }
    try {
      return await this.encryption.decryptSecret(
        record.envelope,
        record.context,
      );
    } catch (error: unknown) {
      if (error instanceof EnvelopeEncryptionError) {
        throw new CredentialStoreError();
      }
      throw new CredentialStoreError();
    }
  }

  async replace(
    oldSecretLocator: SecretLocator,
    newSecret: string,
    context: CredentialStorageContext,
  ): Promise<SecretLocator> {
    if (!this.records.has(oldSecretLocator)) {
      throw new CredentialStoreError();
    }
    const newSecretLocator = await this.store(newSecret, context);
    this.records.delete(oldSecretLocator);
    return newSecretLocator;
  }

  destroy(secretLocator: SecretLocator): Promise<void> {
    this.records.delete(secretLocator);
    return Promise.resolve();
  }

  health(): Promise<CredentialStoreHealth> {
    return Promise.resolve({
      status: CREDENTIAL_STORE_HEALTH_STATUSES.available,
    });
  }
}
