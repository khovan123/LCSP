import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

interface SignedDownloadInput {
  organizationId: string;
  exportRequestId: string;
  expiresAt: Date;
}

interface SignedDownloadTokenPayload {
  organizationId: string;
  exportRequestId: string;
  expiresAt: string;
}

@Injectable()
export class AuditExportStorageService {
  createSignedDownloadUrl(input: SignedDownloadInput): string {
    const payload: SignedDownloadTokenPayload = {
      organizationId: input.organizationId,
      exportRequestId: input.exportRequestId,
      expiresAt: input.expiresAt.toISOString(),
    };
    const encodedPayload = Buffer.from(
      JSON.stringify(payload),
      "utf8",
    ).toString("base64url");
    const signature = this.sign(encodedPayload);

    return `/organizations/${encodeURIComponent(input.organizationId)}/audit-events/export/${encodeURIComponent(input.exportRequestId)}/download?token=${encodedPayload}.${signature}`;
  }

  verifySignedDownloadToken(
    token: string,
    organizationId: string,
    exportRequestId: string,
  ): SignedDownloadTokenPayload | null {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = this.sign(encodedPayload);
    if (!safeCompare(signature, expectedSignature)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as Partial<SignedDownloadTokenPayload>;
      if (
        payload.organizationId !== organizationId ||
        payload.exportRequestId !== exportRequestId ||
        typeof payload.expiresAt !== "string"
      ) {
        return null;
      }

      const expiresAt = Date.parse(payload.expiresAt);
      if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
        return null;
      }

      return {
        organizationId: payload.organizationId,
        exportRequestId: payload.exportRequestId,
        expiresAt: payload.expiresAt,
      };
    } catch {
      return null;
    }
  }

  private sign(value: string): string {
    return createHmac("sha256", this.secret())
      .update(value)
      .digest("base64url");
  }

  private secret(): string {
    return (
      process.env.AUDIT_EXPORT_DOWNLOAD_SIGNING_SECRET ??
      process.env.APP_SECRET ??
      "lcsp-local-audit-export-download-secret"
    );
  }
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
