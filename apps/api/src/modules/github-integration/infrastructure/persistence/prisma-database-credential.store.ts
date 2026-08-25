import { randomUUID } from "node:crypto";

import { CredentialProvider, type Prisma } from "@prisma/client";
import { Injectable, Optional } from "@nestjs/common";
import { CREDENTIAL_PROVIDERS } from "@lcsp/contracts/github-integration";

import {
  CREDENTIAL_STORE_HEALTH_STATUSES,
  type CredentialStorageContext,
  type CredentialStoreHealth,
  type CredentialStorePort,
  type SecretLocator,
} from "../../application/ports/security/credential-store.port.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { CredentialStoreError } from "../security/in-memory-encrypted-credential.store.js";
import {
  EnvelopeEncryptionService,
  type EncryptedSecretEnvelope,
} from "../security/envelope-encryption.service.js";

type CredentialPersistenceClient = Pick<
  Prisma.TransactionClient,
  "providerCredential" | "providerCredentialSecret"
>;

/** Database envelope store. It encrypts values but intentionally performs no actor authorization. */
@Injectable()
export class PrismaDatabaseCredentialStore implements CredentialStorePort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EnvelopeEncryptionService,
    @Optional()
    private readonly client: CredentialPersistenceClient = prisma,
  ) {}

  /** Creates a transaction-scoped view for a future atomic connect unit of work. */
  withTransaction(
    transaction: Prisma.TransactionClient,
  ): PrismaDatabaseCredentialStore {
    return new PrismaDatabaseCredentialStore(
      this.prisma,
      this.encryption,
      transaction,
    );
  }

  async store(
    secret: string,
    context: CredentialStorageContext,
  ): Promise<SecretLocator> {
    try {
      await this.assertCredentialContext(context);
      const envelope = await this.encryption.encryptSecret(secret, context);
      const id = randomUUID();
      await this.client.providerCredentialSecret.create({
        data: {
          id,
          providerCredentialId: context.providerCredentialId,
          credentialVersion: context.credentialVersion,
          envelopeVersion: envelope.version,
          encryptionAlgorithm: envelope.algorithm,
          ciphertext: decode(envelope.ciphertext),
          credentialNonce: decode(envelope.nonce),
          credentialAuthenticationTag: decode(envelope.authenticationTag),
          wrappedDekCiphertext: decode(
            envelope.wrappedDataEncryptionKey.ciphertext,
          ),
          wrappingNonce: decode(envelope.wrappedDataEncryptionKey.nonce),
          wrappingAuthenticationTag: decode(
            envelope.wrappedDataEncryptionKey.authenticationTag,
          ),
          kekVersion: envelope.wrappedDataEncryptionKey.keyVersion,
        },
      });
      return id as SecretLocator;
    } catch {
      throw new CredentialStoreError();
    }
  }

  async read(secretLocator: SecretLocator): Promise<string> {
    try {
      const row = await this.client.providerCredentialSecret.findUnique({
        where: { id: secretLocator },
        include: { providerCredential: true },
      });
      if (!row || row.destroyedAt) throw new CredentialStoreError();
      const context = contextFromRow(
        row.providerCredential,
        row.credentialVersion,
        row.envelopeVersion,
      );
      return await this.encryption.decryptSecret(envelopeFromRow(row), context);
    } catch {
      throw new CredentialStoreError();
    }
  }

  async replace(
    oldLocator: SecretLocator,
    secret: string,
    context: CredentialStorageContext,
  ): Promise<SecretLocator> {
    const old = await this.client.providerCredentialSecret.findUnique({
      where: { id: oldLocator },
    });
    if (
      !old ||
      old.destroyedAt ||
      old.providerCredentialId !== context.providerCredentialId
    ) {
      throw new CredentialStoreError();
    }
    const locator = await this.store(secret, context);
    await this.destroy(oldLocator);
    return locator;
  }

  async destroy(secretLocator: SecretLocator): Promise<void> {
    try {
      await this.client.providerCredentialSecret.deleteMany({
        where: { id: secretLocator },
      });
    } catch {
      throw new CredentialStoreError();
    }
  }

  async health(): Promise<CredentialStoreHealth> {
    try {
      await this.client.providerCredential.count({ take: 1 });
      return { status: CREDENTIAL_STORE_HEALTH_STATUSES.available };
    } catch {
      return { status: CREDENTIAL_STORE_HEALTH_STATUSES.unavailable };
    }
  }

  private async assertCredentialContext(
    context: CredentialStorageContext,
  ): Promise<void> {
    const row = await this.client.providerCredential.findFirst({
      where: {
        id: context.providerCredentialId,
        organizationId: context.organizationId,
        ownerUserId: context.ownerUserId,
        provider: CredentialProvider.GITHUB,
      },
      select: { id: true },
    });
    if (!row || context.provider !== CREDENTIAL_PROVIDERS.github)
      throw new CredentialStoreError();
  }
}

function contextFromRow(
  row: {
    id: string;
    organizationId: string;
    ownerUserId: string;
    provider: CredentialProvider;
  },
  credentialVersion: number,
  envelopeVersion: number,
): CredentialStorageContext {
  if (row.provider !== CredentialProvider.GITHUB)
    throw new CredentialStoreError();
  return {
    provider: CREDENTIAL_PROVIDERS.github,
    providerCredentialId: row.id,
    organizationId: row.organizationId,
    ownerUserId: row.ownerUserId,
    credentialVersion,
    envelopeVersion,
  };
}

function envelopeFromRow(row: {
  envelopeVersion: number;
  encryptionAlgorithm: string;
  ciphertext: Uint8Array;
  credentialNonce: Uint8Array;
  credentialAuthenticationTag: Uint8Array;
  wrappedDekCiphertext: Uint8Array;
  wrappingNonce: Uint8Array;
  wrappingAuthenticationTag: Uint8Array;
  kekVersion: string;
}): EncryptedSecretEnvelope {
  if (row.envelopeVersion !== 1 || row.encryptionAlgorithm !== "AES_256_GCM")
    throw new CredentialStoreError();
  return {
    algorithm: "AES_256_GCM",
    version: 1,
    ciphertext: encode(row.ciphertext),
    nonce: encode(row.credentialNonce),
    authenticationTag: encode(row.credentialAuthenticationTag),
    wrappedDataEncryptionKey: {
      keyVersion: row.kekVersion,
      ciphertext: encode(row.wrappedDekCiphertext),
      nonce: encode(row.wrappingNonce),
      authenticationTag: encode(row.wrappingAuthenticationTag),
    },
  };
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.from(value, "base64"));
}
function encode(value: Uint8Array): string {
  return Buffer.from(value).toString("base64");
}
