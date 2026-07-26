import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { LegalRuleCatalogController } from "./presentation/http/legal-rule-catalog.controller.js";
import { DraftLegalRuleHandler } from "./application/commands/draft-legal-rule/draft-legal-rule.handler.js";
import { ApproveRuleCatalogVersionHandler } from "./application/commands/approve-rule-catalog-version/approve-rule-catalog-version.handler.js";
import { CitationLocatorValidatorService } from "./application/services/citation-locator-validator.service.js";

const Handlers = [DraftLegalRuleHandler, ApproveRuleCatalogVersionHandler];

@Module({
  imports: [CqrsModule],
  controllers: [LegalRuleCatalogController],
  providers: [...Handlers, CitationLocatorValidatorService],
})
export class LegalRuleCatalogModule {}
