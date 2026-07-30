import { HttpStatus, Injectable } from "@nestjs/common";
import { SCAN_ERROR_CODES } from "@lcsp/contracts/scan";
import { problemException } from "../../../../../platform/problems/problem-factory.js";

import type { LegalRuleMatchItemDto } from "../../contracts/classification/legal-rule-match-callback.contract.js";

@Injectable()
export class CitationGuardrailService {
  validate(
    matches: LegalRuleMatchItemDto[],
    citationAllowlist: string[],
    correlationId: string,
  ): void {
    const allowSet = new Set(citationAllowlist);

    for (const match of matches) {
      if (
        match.legal_status === "REPEALED" ||
        (typeof match.legal_status === "string" &&
          match.legal_status.toUpperCase() === "REPEALED")
      ) {
        throw problemException(
          SCAN_ERROR_CODES.citationRepealed,
          correlationId,
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
          },
        );
      }

      for (const chunkId of match.citation_chunk_ids) {
        if (
          chunkId.toLowerCase().includes("repealed") ||
          chunkId.toLowerCase().endsWith(":repealed")
        ) {
          throw problemException(
            SCAN_ERROR_CODES.citationRepealed,
            correlationId,
            { status: HttpStatus.UNPROCESSABLE_ENTITY },
          );
        }

        if (!allowSet.has(chunkId)) {
          throw problemException(
            SCAN_ERROR_CODES.citationOutOfAllowlist,
            correlationId,
            { status: HttpStatus.UNPROCESSABLE_ENTITY },
          );
        }
      }
    }
  }
}
