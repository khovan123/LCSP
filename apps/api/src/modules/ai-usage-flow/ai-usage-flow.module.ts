import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptAIUsageFlowHandler } from "./application/commands/accept-ai-usage-flow/accept-ai-usage-flow.handler.js";
import { InternalAIUsageFlowController } from "./presentation/http/ai-usage-flow.controller.js";

@Module({
  imports: [CqrsModule],
  controllers: [InternalAIUsageFlowController],
  providers: [AcceptAIUsageFlowHandler, WorkerApiKeyGuard],
})
export class AIUsageFlowModule {}
