import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { SCAN_ERROR_CODES } from "@lcsp/contracts/scan";

import type { LegalRuleMatchItemDto } from "../../contracts/classification/legal-rule-match-callback.contract.js";

@Injectable()
export class CitationGuardrailService {
  validate(
    matches: LegalRuleMatchItemDto[],
    citationAllowlist: string[],
    correlationId?: string,
  ): void {
    const allowSet = new Set(citationAllowlist);

    for (const match of matches) {
      if (
        match.legal_status === "REPEALED" ||
        (typeof match.legal_status === "string" &&
          match.legal_status.toUpperCase() === "REPEALED")
      ) {
        throw new UnprocessableEntityException({
          error_code: SCAN_ERROR_CODES.citationRepealed,
          correlation_id: correlationId,
        });
      }

      for (const chunkId of match.citation_chunk_ids) {
        if (
          chunkId.toLowerCase().includes("repealed") ||
          chunkId.toLowerCase().endsWith(":repealed")
        ) {
          throw new UnprocessableEntityException({
            error_code: SCAN_ERROR_CODES.citationRepealed,
            correlation_id: correlationId,
          });
        }

        if (!allowSet.has(chunkId)) {
          throw new UnprocessableEntityException({
            error_code: SCAN_ERROR_CODES.citationOutOfAllowlist,
            correlation_id: correlationId,
          });
        }
      }
    }
  }
}
