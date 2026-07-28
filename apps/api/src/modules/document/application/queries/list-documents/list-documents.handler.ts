import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import {
  DOCUMENT_REQUEST_STATUSES,
  DOCUMENT_TYPES,
} from "@lcsp/contracts/document";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { DocumentStorageService } from "../../../infrastructure/storage/document-storage.service.js";
import { ListDocumentsQuery } from "./list-documents.query.js";

const DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000;
const GENERIC_BLOCKED_REASON =
  "Document generation is blocked until the required review items are resolved.";

@QueryHandler(ListDocumentsQuery)
export class ListDocumentsHandler implements IQueryHandler<ListDocumentsQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageService,
  ) {}

  async execute(query: ListDocumentsQuery) {
    const allowRedactedRead = query.selectedAction === "document:read:redacted";
    const allowFullRead = query.selectedAction === "document:read";
    if (!allowFullRead && !allowRedactedRead) {
      this.forbidden(query.correlationId);
    }

    if (allowRedactedRead && query.scope !== query.assessmentId) {
      this.notFound(query.correlationId);
    }

    const rows = await this.prisma.documentRequest.findMany({
      where: {
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
      },
      select: {
        id: true,
        assessmentId: true,
        classificationResultId: true,
        documentType: true,
        status: true,
        documentUrl: true,
        blockedReason: true,
        correlationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const classificationMap = await this.prisma.classificationResult.findMany({
      where: { assessmentId: query.assessmentId },
      select: { id: true, guardrailStatus: true },
    });

    const guardrailById = new Map(
      classificationMap.map((c) => [c.id, c.guardrailStatus]),
    );

    const results = rows
      .map((documentRequest) => {
        const documentType = this.toDocumentType(documentRequest.documentType);
        // If caller only has redacted read, do not include FinalReport
        if (allowRedactedRead && documentType === DOCUMENT_TYPES.finalReport) {
          return null;
        }

        const status = this.toDocumentRequestStatus(documentRequest.status);
        const isReady = status === DOCUMENT_REQUEST_STATUSES.ready;
        const download = isReady
          ? this.buildDownload(
              documentRequest.assessmentId,
              documentRequest.id,
              documentRequest.documentUrl,
            )
          : null;

        return {
          document_request_id: documentRequest.id,
          document_type: documentType,
          status,
          blocked_reason:
            status === DOCUMENT_REQUEST_STATUSES.blocked
              ? this.toBusinessBlockedReason(documentRequest.blockedReason)
              : null,
          guardrail_status:
            guardrailById.get(documentRequest.classificationResultId) ?? null,
          download_url: download?.url ?? null,
          download_url_expires_at: download?.expiresAt ?? null,
          requested_at: documentRequest.createdAt.toISOString(),
          completed_at:
            isReady ||
            status === DOCUMENT_REQUEST_STATUSES.failed ||
            status === DOCUMENT_REQUEST_STATUSES.blocked
              ? documentRequest.updatedAt.toISOString()
              : null,
          correlation_id: documentRequest.correlationId,
        };
      })
      .filter(Boolean);

    return results;
  }

  private buildDownload(
    assessmentId: string,
    documentRequestId: string,
    documentUrl: string | null,
  ) {
    if (!documentUrl) {
      return null;
    }

    const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_MS);
    return {
      url: this.storage.createSignedDownloadUrl({
        assessmentId,
        documentRequestId,
        documentUrl,
        expiresAt,
      }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private toBusinessBlockedReason(reason: string | null): string {
    if (!reason || !reason.trim()) {
      return GENERIC_BLOCKED_REASON;
    }

    return this.looksTechnical(reason) ? GENERIC_BLOCKED_REASON : reason.trim();
  }

  private looksTechnical(reason: string): boolean {
    return /(exception|stack|trace|\/|\\|\.ts\b|\.js\b|sql\b|timeout|503|500)/i.test(
      reason,
    );
  }

  private toDocumentType(value: string) {
    switch (value) {
      case DOCUMENT_TYPES.finalReport:
      case DOCUMENT_TYPES.gapAnalysis:
      case DOCUMENT_TYPES.readinessExport:
        return value;
      default:
        throw new NotFoundException({ error_code: "DOCUMENT_NOT_FOUND" });
    }
  }

  private toDocumentRequestStatus(value: string) {
    switch (value) {
      case DOCUMENT_REQUEST_STATUSES.queued:
      case DOCUMENT_REQUEST_STATUSES.generating:
      case DOCUMENT_REQUEST_STATUSES.ready:
      case DOCUMENT_REQUEST_STATUSES.failed:
      case DOCUMENT_REQUEST_STATUSES.blocked:
        return value;
      default:
        throw new NotFoundException({ error_code: "DOCUMENT_NOT_FOUND" });
    }
  }

  private notFound(correlationId: string): never {
    throw new NotFoundException({
      error_code: "DOCUMENT_NOT_FOUND",
      correlation_id: correlationId,
    });
  }

  private forbidden(correlationId: string): never {
    throw new ForbiddenException({
      error_code: "PBAC_DENIED",
      correlation_id: correlationId,
    });
  }
}
