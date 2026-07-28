import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

interface SignedDownloadInput {
  assessmentId: string;
  documentRequestId: string;
  documentUrl: string;
  expiresAt: Date;
}

interface SignedDownloadTokenPayload {
  assessmentId: string;
  documentRequestId: string;
  documentUrl: string;
  expiresAt: string;
}

interface VerifiedDownloadToken extends SignedDownloadTokenPayload {
  expiresAt: string;
}

@Injectable()
export class DocumentStorageService {
  createSignedDownloadUrl(input: SignedDownloadInput): string {
    const payload: SignedDownloadTokenPayload = {
      assessmentId: input.assessmentId,
      documentRequestId: input.documentRequestId,
      documentUrl: input.documentUrl,
      expiresAt: input.expiresAt.toISOString(),
    };
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);

    return `/assessments/${encodeURIComponent(input.assessmentId)}/documents/${encodeURIComponent(input.documentRequestId)}/download?token=${encodedPayload}.${signature}`;
  }

  verifySignedDownloadToken(
    token: string,
    assessmentId: string,
    documentRequestId: string,
  ): VerifiedDownloadToken | null {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = this.sign(encodedPayload);
    const validSignature = safeCompare(signature, expectedSignature);
    if (!validSignature) {
      return null;
    }

    const payload = parsePayload(encodedPayload);
    if (!payload) {
      return null;
    }

    if (
      payload.assessmentId !== assessmentId ||
      payload.documentRequestId !== documentRequestId
    ) {
      return null;
    }

    const expiresAt = Date.parse(payload.expiresAt);
    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  }

  private sign(value: string): string {
    return createHmac("sha256", this.secret())
      .update(value)
      .digest("base64url");
  }

  private secret(): string {
    return (
      process.env.DOCUMENT_DOWNLOAD_SIGNING_SECRET ??
      process.env.APP_SECRET ??
      "lcsp-local-document-download-secret"
    );
  }
}

function parsePayload(encodedPayload: string): VerifiedDownloadToken | null {
  try {
    const raw = base64UrlDecode(encodedPayload);
    const parsed = JSON.parse(raw) as Partial<SignedDownloadTokenPayload>;
    if (
      typeof parsed.assessmentId !== "string" ||
      typeof parsed.documentRequestId !== "string" ||
      typeof parsed.documentUrl !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return {
      assessmentId: parsed.assessmentId,
      documentRequestId: parsed.documentRequestId,
      documentUrl: parsed.documentUrl,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
