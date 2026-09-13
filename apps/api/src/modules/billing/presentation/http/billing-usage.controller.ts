import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { BillingUsageService } from "../../application/services/billing-usage.service.js";

@Controller("internal/billing")
export class BillingUsageController {
  constructor(private readonly usage: BillingUsageService) {}

  @Post("usage")
  @UseGuards(WorkerApiKeyGuard)
  async settle(@Body() body: Record<string, unknown>) {
    const text = (value: unknown) =>
      typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    const bigintField = (name: string) => {
      const value = body[name];
      return value === undefined ? undefined : BigInt(text(value));
    };
    const runtime = body.effectiveRuntimeModel as
      Record<string, unknown> | undefined;
    if (
      !runtime ||
      typeof runtime.provider !== "string" ||
      typeof runtime.model !== "string"
    )
      throw new Error("effectiveRuntimeModel is required");
    const result = await this.usage.recordAndSettleUsage({
      userId: text(body.userId),
      reservationId: text(body.reservationId),
      invocationId: text(body.invocationId),
      provider: runtime.provider,
      model: runtime.model,
      effectiveRuntimeModel: {
        provider: runtime.provider,
        model: runtime.model,
        policyVersion: String(runtime.policyVersion),
        effectiveAt: String(runtime.effectiveAt),
      },
      providerResponseId: body.providerResponseId
        ? text(body.providerResponseId)
        : undefined,
      inputTokens: bigintField("inputTokens"),
      cachedInputTokens: bigintField("cachedInputTokens"),
      cacheWriteTokens: bigintField("cacheWriteTokens"),
      outputTokens: bigintField("outputTokens"),
      reasoningTokens: bigintField("reasoningTokens"),
      totalTokens: bigintField("totalTokens"),
      occurredAt: body.occurredAt ? new Date(text(body.occurredAt)) : undefined,
    });
    return resultEnvelope(result);
  }
}
