import type { AIUsageFlowCallbackRequest } from "../../contracts/ai-usage-flow/ai-usage-flow-callback.contract.js";

export class AcceptAIUsageFlowCommand {
  constructor(
    readonly payload: AIUsageFlowCallbackRequest,
    readonly correlationId: string,
  ) {}
}
