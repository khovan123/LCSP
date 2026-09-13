import { Inject, Injectable } from "@nestjs/common";
import type { EffectiveRuntimeModel } from "@lcsp/contracts/billing";
import {
  BillingDomainError,
  BillingIdempotencyConflictError,
  OwnershipMismatchError,
} from "../../domain/billing.errors.js";
import {
  calculateCustomerChargeCredits,
  calculateUsageChargeCredits,
} from "../../domain/usage-pricing.js";
import {
  BILLING_TRANSACTION_PORT,
  type BillingTransactionPort,
} from "../../domain/repositories/billing-transaction.port.js";
import { BillingAccountingService } from "./billing-accounting.service.js";

@Injectable()
export class BillingUsageService {
  constructor(
    @Inject(BILLING_TRANSACTION_PORT)
    private readonly transactions: BillingTransactionPort,
    private readonly accounting: BillingAccountingService,
  ) {}
  recordAndSettleUsage(i: {
    userId: string;
    reservationId: string;
    invocationId: string;
    provider?: string;
    model?: string;
    effectiveRuntimeModel?: EffectiveRuntimeModel;
    providerResponseId?: string;
    inputTokens?: bigint;
    cachedInputTokens?: bigint;
    cacheWriteTokens?: bigint;
    outputTokens?: bigint;
    reasoningTokens?: bigint;
    totalTokens?: bigint;
    occurredAt?: Date;
  }) {
    return this.transactions.runForUser(i.userId, async (repos) => {
      const { usage, pricing, reservation } = repos;
      const provider = i.effectiveRuntimeModel?.provider ?? i.provider;
      const model = i.effectiveRuntimeModel?.model ?? i.model;
      if (!i.invocationId || !provider || !model)
        throw new BillingDomainError("Usage identity is required");
      if (
        i.effectiveRuntimeModel &&
        ((i.provider && i.provider !== i.effectiveRuntimeModel.provider) ||
          (i.model && i.model !== i.effectiveRuntimeModel.model))
      )
        throw new BillingDomainError(
          "Usage provider/model differs from effective runtime policy",
        );
      const input = i.inputTokens ?? 0n;
      const cachedInput = i.cachedInputTokens ?? 0n;
      const cacheWrite = i.cacheWriteTokens ?? 0n;
      const output = i.outputTokens ?? 0n;
      const reasoning = i.reasoningTokens ?? 0n;
      if (
        [input, cachedInput, cacheWrite, output, reasoning].some((x) => x < 0n)
      )
        throw new BillingDomainError("Token counts cannot be negative");
      if (i.totalTokens !== undefined && i.totalTokens < 0n)
        throw new BillingDomainError("Token counts cannot be negative");
      if (
        i.totalTokens !== undefined &&
        i.totalTokens < input + cachedInput + cacheWrite + output + reasoning
      )
        throw new BillingDomainError("Total tokens are inconsistent");
      const existing = await usage.findByInvocation(i.userId, i.invocationId);
      if (existing) {
        if (
          existing.provider !== provider ||
          existing.model !== model ||
          existing.inputTokens !== input ||
          existing.cachedInputTokens !== cachedInput ||
          existing.cacheWriteTokens !== cacheWrite ||
          existing.outputTokens !== output ||
          existing.reasoningTokens !== reasoning ||
          existing.totalTokens !==
            (i.totalTokens ??
              input + cachedInput + cacheWrite + output + reasoning) ||
          existing.providerResponseId !== (i.providerResponseId ?? null) ||
          existing.reservationId !== i.reservationId ||
          (i.occurredAt !== undefined &&
            existing.occurredAt.getTime() !== i.occurredAt.getTime())
        )
          throw new BillingIdempotencyConflictError("Usage replay differs");
        return existing;
      }
      const occurredAt = i.occurredAt ?? new Date();
      const snapshot = await pricing.findApplicable(
        provider,
        model,
        occurredAt,
      );
      if (!snapshot)
        throw new BillingDomainError("No applicable pricing snapshot");
      // At settlement time a non-zero markup must be anchored to a traceable
      // snapshot row.  Zero-markup rows need no authority anchor.
      if (snapshot.markupBps && snapshot.markupBps > 0n && !snapshot.markupSnapshotId)
        throw new BillingDomainError(
          "Pricing snapshot has non-zero markupBps but markupSnapshotId is not linked",
        );
      const providerCost = calculateUsageChargeCredits(
        {
          inputTokens: input,
          cachedInputTokens: cachedInput,
          cacheWriteTokens: cacheWrite,
          outputTokens: output,
          reasoningTokens: reasoning,
        },
        snapshot,
      );
      const charge = calculateCustomerChargeCredits(
        {
          inputTokens: input,
          cachedInputTokens: cachedInput,
          cacheWriteTokens: cacheWrite,
          outputTokens: output,
          reasoningTokens: reasoning,
        },
        snapshot,
      );
      // FX integrity: partial configuration is a data error.
      // Fully absent FX is valid — pricing row has no VND conversion configured.
      const hasFxNumerator = snapshot.fxRateVndNumerator !== undefined;
      const hasFxDenominator = snapshot.fxRateVndDenominator !== undefined;
      if (hasFxNumerator !== hasFxDenominator)
        throw new BillingDomainError(
          "Pricing snapshot has partial FX rate: both fxRateVndNumerator and fxRateVndDenominator must be present or both absent",
        );
      if (hasFxNumerator && !snapshot.fxSnapshotId)
        throw new BillingDomainError(
          "Pricing snapshot has FX rate but fxSnapshotId is not linked",
        );
      const customerChargeVnd = hasFxNumerator
        ? (charge * snapshot.fxRateVndNumerator!) / snapshot.fxRateVndDenominator!
        : undefined;
      if (i.providerResponseId) {
        const response = await usage.findByProviderResponse(
          provider,
          i.providerResponseId,
        );
        if (response)
          throw new BillingIdempotencyConflictError(
            "Provider response already recorded",
          );
      }
      const r = await reservation.findForUser(i.userId, i.reservationId);
      if (!r)
        throw new OwnershipMismatchError("Reservation does not belong to user");
      const event = await usage.create({
        userId: i.userId,
        provider,
        model,
        invocationId: i.invocationId,
        providerResponseId: i.providerResponseId,
        inputTokens: input,
        cachedInputTokens: cachedInput,
        cacheWriteTokens: cacheWrite,
        outputTokens: output,
        reasoningTokens: reasoning,
        totalTokens:
          i.totalTokens ??
          input + cachedInput + cacheWrite + output + reasoning,
        pricingSnapshotId: snapshot.id,
        providerCostCredits: providerCost,
        customerChargeVnd,
        markupSnapshotId: snapshot.markupSnapshotId,
        fxSnapshotId: snapshot.fxSnapshotId,
        reservationId: i.reservationId,
        chargedCredits: charge,
        occurredAt,
      });
      await this.accounting.settleWithinTransaction(repos, {
        userId: i.userId,
        reservationId: i.reservationId,
        chargedCredits: charge,
      });
      return event;
    });
  }
}
