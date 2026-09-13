import type { EffectiveRuntimeModel } from "./runtime-model.ts";

export type ProviderUsageDimensions = {
  inputTokens?: string;
  cachedInputTokens?: string;
  cacheWriteTokens?: string;
  outputTokens?: string;
  reasoningTokens?: string;
};

/** Worker-to-API accounting payload. Estimates must never use this settled shape. */
export type SettledUsageInput = ProviderUsageDimensions & {
  userId: string;
  reservationId: string;
  effectiveRuntimeModel: EffectiveRuntimeModel;
  invocationId: string;
  providerResponseId?: string;
  totalTokens?: string;
  occurredAt: string;
};
