import type { CitationLocatorRef } from "../services/citation-locator-validator.service.js";

export interface DraftLegalRuleRequest {
  legalRuleId: string;
  legalRuleCatalogVersionId: string;
  ruleFamily: string;
  requiredFacts: Record<string, unknown>;
  optionalFacts: Record<string, unknown> | null;
  blockingFacts: Record<string, unknown> | null;
  unknownFactPolicy: string;
  citationLocatorRefs: CitationLocatorRef[];
}

export interface DraftLegalRuleResponse {
  id: string;
  legalRuleId: string;
  status: string;
}
