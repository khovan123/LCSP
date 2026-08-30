import { randomUUID } from "node:crypto";

import {
  CredentialProvider,
  Prisma,
  type Prisma as PrismaTypes,
} from "@prisma/client";
import { Injectable, Logger, Optional } from "@nestjs/common";
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
  EnvelopeEncryptionError,
  type EncryptedSecretEnvelope,
} from "../security/envelope-encryption.service.js";

type CredentialPersistenceClient = Pick<
  PrismaTypes.TransactionClient,
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
    transaction: PrismaTypes.TransactionClient,
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
    let operation = "context_validation";
    try {
      await this.assertCredentialContext(context);
      operation = "encryption";
      const envelope = await this.encryption.encryptSecret(secret, context);
      const id = randomUUID();
      operation = "provider_credential_secret_create";
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
    } catch (error: unknown) {
      if (process.env.NODE_ENV !== "production") {
        Logger.error(
          JSON.stringify({
            message: "Credential store operation failed",
            operation,
            ...safePersistenceDiagnostic(error),
          }),
          undefined,
          PrismaDatabaseCredentialStore.name,
        );
      }
      throw new CredentialStoreError({ cause: error, operation });
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
        ownerUserId: context.ownerUserId,
        provider: {
          in: [CredentialProvider.GITHUB, CredentialProvider.GITLAB],
        },
      },
      select: { id: true },
    });
    if (
      !row ||
      (context.provider !== CREDENTIAL_PROVIDERS.github &&
        context.provider !== CREDENTIAL_PROVIDERS.gitlab)
    )
      throw new CredentialStoreError();
  }
}

function safePersistenceDiagnostic(error: unknown): Record<string, unknown> {
  if (error instanceof EnvelopeEncryptionError) {
    const cause = error.cause;
    return {
      errorClass: "EnvelopeEncryptionError",
      envelopeReason: error.reason,
      innerErrorClass:
        cause instanceof Error ? cause.constructor.name : undefined,
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = error.meta;
    return {
      errorClass: "PrismaClientKnownRequestError",
      prismaCode: error.code,
      prismaModel:
        typeof meta?.modelName === "string" ? meta.modelName : undefined,
      prismaTarget: Array.isArray(meta?.target)
        ? meta.target.filter(
            (value): value is string => typeof value === "string",
          )
        : undefined,
      prismaField:
        typeof meta?.field_name === "string" ? meta.field_name : undefined,
    };
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return { errorClass: "PrismaClientValidationError" };
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return { errorClass: "PrismaClientUnknownRequestError" };
  }
  return {
    errorClass: error instanceof Error ? error.constructor.name : "Unknown",
  };
}

function contextFromRow(
  row: {
    id: string;
    ownerUserId: string;
    provider: CredentialProvider;
  },
  credentialVersion: number,
  envelopeVersion: number,
): CredentialStorageContext {
  if (
    row.provider !== CredentialProvider.GITHUB &&
    row.provider !== CredentialProvider.GITLAB
  )
    throw new CredentialStoreError();
  const provider =
    row.provider === CredentialProvider.GITLAB
      ? CREDENTIAL_PROVIDERS.gitlab
      : CREDENTIAL_PROVIDERS.github;
  return {
    provider,
    providerCredentialId: row.id,
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
