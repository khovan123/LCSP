import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptLegalRuleMatchHandler } from "./application/commands/accept-legal-rule-match/accept-legal-rule-match.handler.js";
import { CitationGuardrailService } from "./application/services/classification/citation-guardrail.service.js";
import { ClassificationController } from "./presentation/http/classification.controller.js";

@Module({
  imports: [CqrsModule],
  controllers: [ClassificationController],
  providers: [
    AcceptLegalRuleMatchHandler,
    CitationGuardrailService,
    WorkerApiKeyGuard,
  ],
})
export class ClassificationModule {}
