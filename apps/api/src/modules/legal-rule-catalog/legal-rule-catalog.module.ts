import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { LegalRuleCatalogController } from "./presentation/http/legal-rule-catalog.controller.js";
import { LegalCorpusReadinessController } from "./presentation/http/legal-corpus-readiness.controller.js";
import { LegalBasisRetrievalController } from "./presentation/http/legal-basis-retrieval.controller.js";
import { DraftLegalRuleHandler } from "./application/commands/draft-legal-rule/draft-legal-rule.handler.js";
import { ApproveRuleCatalogVersionHandler } from "./application/commands/approve-rule-catalog-version/approve-rule-catalog-version.handler.js";
import { GetActiveRuleCatalogHandler } from "./application/queries/get-active-rule-catalog/get-active-rule-catalog.handler.js";
import { GetActiveLegalCorpusHandler } from "./application/queries/get-active-legal-corpus/get-active-legal-corpus.handler.js";
import { GetLegalCorpusReadinessHandler } from "./application/queries/get-legal-corpus-readiness/get-legal-corpus-readiness.handler.js";
import { RetrieveLegalBasisHandler } from "./application/queries/retrieve-legal-basis/retrieve-legal-basis.handler.js";
import { CitationLocatorValidatorService } from "./application/services/citation-locator-validator.service.js";
import { LegalCorpusService } from "./application/services/legal-corpus.service.js";
import { RuleCatalogVersionService } from "./application/services/rule-catalog-version.service.js";

const Handlers = [
  DraftLegalRuleHandler,
  ApproveRuleCatalogVersionHandler,
  GetActiveRuleCatalogHandler,
  GetActiveLegalCorpusHandler,
  GetLegalCorpusReadinessHandler,
  RetrieveLegalBasisHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [
    LegalRuleCatalogController,
    LegalCorpusReadinessController,
    LegalBasisRetrievalController,
  ],
  providers: [
    ...Handlers,
    CitationLocatorValidatorService,
    LegalCorpusService,
    RuleCatalogVersionService,
  ],
})
export class LegalRuleCatalogModule {}
