import { BillingDomainError } from "./billing.errors.js";

export type EffectiveRuntimeModelConfig = {
  role: string;
  provider: string;
  model: string;
  policyVersion: string;
  effectiveAt: Date;
};

/** Resolves exactly one runtime model config; billing never owns a provider/model allow-list. */
export function resolveEffectiveRuntimeModel(
  configs: readonly EffectiveRuntimeModelConfig[],
  role: string,
  at: Date,
): EffectiveRuntimeModelConfig {
  const candidates = configs
    .filter(
      (config) =>
        config.role === role && config.effectiveAt.getTime() <= at.getTime(),
    )
    .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());
  const selected = candidates[0];
  if (!selected)
    throw new BillingDomainError("No effective runtime model configuration");
  if (
    candidates.filter(
      (config) =>
        config.effectiveAt.getTime() === selected.effectiveAt.getTime(),
    ).length > 1
  )
    throw new BillingDomainError(
      "Ambiguous effective runtime model configuration",
    );
  return selected;
}
