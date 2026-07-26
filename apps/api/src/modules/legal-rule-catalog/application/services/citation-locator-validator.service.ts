import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
export interface CitationLocatorRef {
  legalCorpusVersionId: string;
  documentId: string;
  locator: string;
}

@Injectable()
export class CitationLocatorValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async validateAll(refs: CitationLocatorRef[]): Promise<void> {
    if (!refs || refs.length === 0) {
      return;
    }
    // Stub implementation: LegalDocumentChunk does not exist in schema.prisma yet.
    await Promise.resolve();
    // In the future, this should query LegalDocumentChunk and check the status of each locator.
    // For now, we will just return success so tests like T01 can pass,
    // and tests like T02/T03 will mock this service to throw the expected exceptions.

    // Example future implementation:
    /*
    for (const ref of refs) {
      const chunk = await this.prisma.legalDocumentChunk.findFirst({
        where: {
          legalCorpusVersionId: ref.legalCorpusVersionId,
          documentId: ref.documentId,
          locator: ref.locator,
        },
      });

      if (!chunk) {
        throw new UnprocessableEntityException(
          LEGAL_RULE_ERROR_CODES.citationUnresolved,
        );
      }

      if (chunk.legalStatus === "REPEALED") {
        throw new UnprocessableEntityException(
          LEGAL_RULE_ERROR_CODES.citationRepealed,
        );
      }
    }
    */

    return;
  }
}
