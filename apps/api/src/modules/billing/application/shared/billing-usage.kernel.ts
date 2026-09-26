import { createHash } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  BillingReservationStatus,
  RepositoryScanJobStatus,
} from "@prisma/client";
import {
  LLM_USAGE_AVAILABILITY_REASONS,
  LLM_USAGE_STATUSES,
} from "@lcsp/contracts/billing";
import type { EffectiveRuntimeModel } from "@lcsp/contracts/billing";
import {
  BillingDomainError,
  BillingIdempotencyConflictError,
  InsufficientCreditError,
  InvalidReservationTransitionError,
  OwnershipMismatchError,
  PricingSnapshotUnavailableError,
} from "../../domain/billing.errors.js";
import {
  BILLING_TRANSACTION_PORT,
  type BillingTransactionPort,
} from "../../domain/repositories/billing-transaction.port.js";
import { BillingAccountingKernel } from "./billing-accounting.kernel.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import {
  assertEffectiveRuntimeModelAt,
  assertMatchesEffectiveRuntimeModel,
} from "../../domain/effective-runtime-model.js";
import {
  calculateCustomerChargeVnd,
  calculateUsageChargeCredits,
  worstCaseUsageForPricing,
} from "../../domain/usage-pricing.js";

function invocationAuthorizationFingerprint(input: {
  provider: string;
  model: string;
  estimatedInputTokens: bigint;
  estimatedInputBytes?: bigint;
  maxOutputTokens: bigint;
  maxReasoningTokens: bigint;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider: input.provider,
        model: input.model,
        estimatedInputTokens: input.estimatedInputTokens.toString(),
        estimatedInputBytes: input.estimatedInputBytes?.toString() ?? null,
        maxOutputTokens: input.maxOutputTokens.toString(),
        maxReasoningTokens: input.maxReasoningTokens.toString(),
      }),
    )
    .digest("hex");
}

export const BILLING_USAGE_KERNEL = Symbol("BILLING_USAGE_KERNEL");

export type BillingUsagePort = {
  resolveAssessmentOwner(assessmentId: string): Promise<string>;
  resolveReservationOwner(reservationId: string): Promise<string>;
  reserveForAssessment(input: {
    workspaceId?: string;
    assessmentId: string;
    scanJobId?: string;
    threadId?: string;
    runId: string;
    invocationId?: string;
    modelInvocationId?: string;
    amountCredits: bigint;
    maxChargeCredits: bigint;
    provider: string;
    model: string;
    maxInputTokens: bigint;
    maxOutputTokens: bigint;
    maxReasoningTokens: bigint;
    maxInvocations: bigint;
    authorizedModels: Array<{ provider: string; model: string }>;
    idempotencyKey: string;
  }): Promise<unknown>;
  releaseForAssessment(input: {
    assessmentId: string;
    reservationId: string;
  }): Promise<unknown>;
  releaseInactiveScanReservations(
    assessmentId: string,
  ): Promise<{ releasedReservationIds: string[] }>;
  claimInvocation(input: {
    assessmentId: string;
    reservationId: string;
    invocationId: string;
    provider?: string;
    model?: string;
    estimatedInputTokens?: bigint;
    estimatedInputBytes?: bigint;
    maxOutputTokens?: bigint;
    maxReasoningTokens?: bigint;
  }): Promise<unknown>;
  recordAndSettleUsage(input: {
    userId: string;
    assessmentId?: string;
    runId?: string;
    reservationId: string;
    invocationId: string;
    agentRole: string;
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
  }): Promise<unknown>;
};

@Injectable()
export class BillingUsageKernel {
  constructor(
    @Inject(BILLING_TRANSACTION_PORT)
    private readonly transactions: BillingTransactionPort,
    private readonly accounting: BillingAccountingKernel,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async resolveAssessmentOwner(assessmentId: string): Promise<string> {
    if (!this.prisma)
      throw new BillingDomainError(
        "Assessment ownership resolver is unavailable",
      );
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { ownerId: true },
    });
    if (!assessment)
      throw new OwnershipMismatchError("Assessment does not exist");
    return assessment.ownerId;
  }

  async resolveReservationOwner(reservationId: string): Promise<string> {
    if (!this.prisma)
      throw new BillingDomainError(
        "Reservation ownership resolver is unavailable",
      );
    const reservation = await this.prisma.billingReservation.findUnique({
      where: { id: reservationId },
      select: { userId: true },
    });
    if (!reservation)
      throw new OwnershipMismatchError("Reservation does not exist");
    return reservation.userId;
  }

  async reserveForAssessment(input: {
    workspaceId?: string;
    assessmentId: string;
    scanJobId?: string;
    threadId?: string;
    runId: string;
    invocationId?: string;
    modelInvocationId?: string;
    amountCredits: bigint;
    maxChargeCredits: bigint;
    provider: string;
    model: string;
    maxInputTokens: bigint;
    maxOutputTokens: bigint;
    maxReasoningTokens: bigint;
    maxInvocations: bigint;
    authorizedModels: Array<{ provider: string; model: string }>;
    idempotencyKey: string;
  }) {
    const provider = input.provider.trim().toUpperCase();
    const model = input.model.trim();
    const authorizedModels = input.authorizedModels.map((candidate) => ({
      provider: candidate.provider.trim().toUpperCase(),
      model: candidate.model.trim(),
    }));
    if (input.amountCredits < input.maxChargeCredits)
      throw new BillingDomainError(
        "Reservation is below the maximum invocation charge",
      );
    if (
      !authorizedModels.some(
        (candidate) =>
          candidate.provider === provider && candidate.model === model,
      )
    )
      throw new BillingDomainError(
        "Primary runtime model is outside the authorized pricing envelope",
      );
    const userId = await this.resolveAssessmentOwner(input.assessmentId);
    const oneInvocationWorstCase = await this.transactions.runForUser(
      userId,
      async (repos) => {
        const charges = await Promise.all(
          authorizedModels.map(async (authorized) => {
            const pricing = await repos.pricing.findApplicable(
              authorized.provider,
              authorized.model,
              new Date(),
            );
            if (!pricing)
              throw new PricingSnapshotUnavailableError(
                `Pricing snapshot is required before reserving provider spend: ${authorized.provider}/${authorized.model}`,
              );
            return calculateCustomerChargeVnd(
              worstCaseUsageForPricing(
                {
                  maxInputTokens: input.maxInputTokens,
                  maxOutputTokens: input.maxOutputTokens,
                  maxReasoningTokens: input.maxReasoningTokens,
                },
                pricing,
              ),
              pricing,
            );
          }),
        );
        return charges.reduce(
          (maximum, charge) => (charge > maximum ? charge : maximum),
          0n,
        );
      },
    );
    if (input.maxChargeCredits < oneInvocationWorstCase)
      throw new BillingDomainError(
        "Reservation is below the authoritative worst-case provider charge",
      );
    return this.accounting.reserveCredits({
      userId,
      workspaceId: input.workspaceId,
      assessmentId: input.assessmentId,
      scanJobId: input.scanJobId,
      threadId: input.threadId,
      runId: input.runId,
      provider,
      model,
      invocationId: input.invocationId,
      modelInvocationId: input.modelInvocationId,
      amountCredits: input.amountCredits,
      idempotencyKey: input.idempotencyKey,
      maxInvocations: input.maxInvocations,
    });
  }

  async claimInvocation(input: {
    assessmentId: string;
    reservationId: string;
    invocationId: string;
    provider?: string;
    model?: string;
    estimatedInputTokens?: bigint;
    estimatedInputBytes?: bigint;
    maxOutputTokens?: bigint;
    maxReasoningTokens?: bigint;
  }) {
    const userId = await this.resolveAssessmentOwner(input.assessmentId);
    const hasAuthorizationMetrics =
      input.provider !== undefined ||
      input.model !== undefined ||
      input.estimatedInputTokens !== undefined ||
      input.estimatedInputBytes !== undefined ||
      input.maxOutputTokens !== undefined ||
      input.maxReasoningTokens !== undefined;
    if (!hasAuthorizationMetrics)
      return this.accounting.claimInvocation({
        userId,
        reservationId: input.reservationId,
        assessmentId: input.assessmentId,
        invocationId: input.invocationId,
      });
    if (
      !input.provider ||
      !input.model ||
      input.estimatedInputTokens === undefined ||
      input.maxOutputTokens === undefined ||
      input.maxReasoningTokens === undefined
    )
      throw new BillingDomainError(
        "Invocation authorization metrics are incomplete",
      );
    const provider = input.provider.trim().toUpperCase();
    const model = input.model.trim();
    if (
      input.estimatedInputTokens < 0n ||
      (input.estimatedInputBytes !== undefined &&
        input.estimatedInputBytes < 0n) ||
      input.maxOutputTokens < 0n ||
      input.maxReasoningTokens < 0n
    )
      throw new BillingDomainError(
        "Invocation authorization metrics are invalid",
      );
    const estimatedInputTokens = input.estimatedInputTokens;
    const maxOutputTokens = input.maxOutputTokens;
    const maxReasoningTokens = input.maxReasoningTokens;
    const authorizationFingerprint = invocationAuthorizationFingerprint({
      provider,
      model,
      estimatedInputTokens,
      estimatedInputBytes: input.estimatedInputBytes,
      maxOutputTokens,
      maxReasoningTokens,
    });

    return this.transactions.runForUser(userId, async (repos) => {
      const reservation = await repos.reservation.findForUser(
        userId,
        input.reservationId,
      );
      if (!reservation || reservation.status !== "RESERVED")
        throw new BillingDomainError("Reservation is not spendable");
      if (reservation.assessmentId !== input.assessmentId)
        throw new OwnershipMismatchError(
          "Reservation does not belong to the assessment",
        );

      const existingClaim = await repos.reservation.findInvocationClaim(
        input.reservationId,
        input.invocationId,
      );
      if (existingClaim) {
        if (existingClaim.authorizationFingerprint !== authorizationFingerprint)
          throw new BillingIdempotencyConflictError(
            "Invocation authorization replay differs",
          );
        return {
          reservationId: input.reservationId,
          authorizedChargeCredits: existingClaim.authorizedChargeCredits,
        };
      }

      const pricing = await repos.pricing.findApplicable(
        provider,
        model,
        new Date(),
      );
      if (!pricing)
        throw new PricingSnapshotUnavailableError(
          `Pricing snapshot is required before authorizing provider spend: ${provider}/${model}`,
        );
      const authorizedChargeCredits = calculateCustomerChargeVnd(
        worstCaseUsageForPricing(
          {
            maxInputTokens: estimatedInputTokens,
            maxOutputTokens,
            maxReasoningTokens,
          },
          pricing,
        ),
        pricing,
      );
      const outstandingAuthorizedCredits =
        await repos.reservation.sumUnsettledAuthorizedChargeCredits(
          input.reservationId,
        );
      const availableForAuthorization =
        reservation.remainingCredits - outstandingAuthorizedCredits;
      if (
        availableForAuthorization < 0n ||
        authorizedChargeCredits > availableForAuthorization
      )
        throw new InsufficientCreditError(
          "Billing budget exhausted for provider invocation",
        );
      if (
        !(await repos.reservation.claimInvocation({
          reservationId: input.reservationId,
          invocationId: input.invocationId,
          authorizedChargeCredits,
          authorizationFingerprint,
        }))
      )
        throw new BillingDomainError(
          "Reservation invocation claim raced with reservation lifecycle",
        );
      return {
        reservationId: input.reservationId,
        authorizedChargeCredits,
      };
    });
  }

  async releaseForAssessment(input: {
    assessmentId: string;
    reservationId: string;
  }) {
    const userId = await this.resolveAssessmentOwner(input.assessmentId);
    return this.accounting.releaseReservation({
      userId,
      reservationId: input.reservationId,
      assessmentId: input.assessmentId,
    });
  }
  /**
   * Releases credits held for scans that can no longer spend them.
   *
   * A scan-bound reservation only funds an active scan. The worker keeps it after
   * a retryable failure so a redelivery can reuse it; once the scan is terminal or
   * deleted by a rerun, no worker will spend or release it again.
   */
  async releaseInactiveScanReservations(
    assessmentId: string,
  ): Promise<{ releasedReservationIds: string[] }> {
    if (!this.prisma)
      throw new BillingDomainError("Scan reservation resolver is unavailable");
    const held = await this.prisma.billingReservation.findMany({
      where: {
        assessmentId,
        status: BillingReservationStatus.RESERVED,
        scanJobId: { not: null },
      },
      select: { id: true, userId: true, scanJobId: true },
    });
    const scanJobIds = held.flatMap((r) => (r.scanJobId ? [r.scanJobId] : []));
    if (scanJobIds.length === 0) return { releasedReservationIds: [] };
    const activeScans = await this.prisma.repositoryScanJob.findMany({
      where: {
        id: { in: scanJobIds },
        status: {
          in: [RepositoryScanJobStatus.QUEUED, RepositoryScanJobStatus.RUNNING],
        },
      },
      select: { id: true },
    });
    const active = new Set(activeScans.map((scan) => scan.id));
    const releasedReservationIds: string[] = [];
    for (const r of held) {
      if (!r.scanJobId || active.has(r.scanJobId)) continue;
      try {
        await this.accounting.releaseReservation({
          userId: r.userId,
          reservationId: r.id,
          assessmentId,
        });
        releasedReservationIds.push(r.id);
      } catch (error) {
        // Settled or released concurrently: the credits are no longer held.
        if (!(error instanceof InvalidReservationTransitionError)) throw error;
      }
    }
    return { releasedReservationIds };
  }

  recordAndSettleUsage(i: {
    userId: string;
    assessmentId?: string;
    runId?: string;
    reservationId: string;
    invocationId: string;
    agentRole: string;
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
      const occurredAt = i.occurredAt ?? new Date();
      if ((i.assessmentId && !i.runId) || (!i.assessmentId && i.runId))
        throw new BillingDomainError(
          "Assessment and run identifiers must be supplied together",
        );
      const provider = i.provider ?? i.effectiveRuntimeModel?.provider;
      const model = i.model ?? i.effectiveRuntimeModel?.model;
      if (!i.invocationId || !provider || !model)
        throw new BillingDomainError("Usage identity is required");
      if (i.effectiveRuntimeModel)
        assertEffectiveRuntimeModelAt(i.effectiveRuntimeModel, occurredAt);
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
      const r = await reservation.findForUser(i.userId, i.reservationId);
      if (!r)
        throw new OwnershipMismatchError("Reservation does not belong to user");
      if (i.assessmentId && r.assessmentId !== i.assessmentId)
        throw new OwnershipMismatchError(
          "Usage callback assessment does not match reservation",
        );
      if (i.runId && r.runId !== i.runId)
        throw new OwnershipMismatchError(
          "Usage callback run does not match reservation",
        );
      const assessmentId = r.assessmentId ?? i.assessmentId;
      const runId = r.runId ?? i.runId;
      const existing = await usage.findByInvocation(i.userId, i.invocationId);
      const hasRequiredProviderUsage =
        i.inputTokens !== undefined && i.outputTokens !== undefined;
      const retryableExisting =
        existing?.status === LLM_USAGE_STATUSES.RETRYABLE;
      const settleAuthorizationClaimIfPresent = async () => {
        const claim = await reservation.findInvocationClaim(
          i.reservationId,
          i.invocationId,
        );
        if (!claim || claim.settledAt) return;
        if (
          await reservation.settleInvocationClaim({
            reservationId: i.reservationId,
            invocationId: i.invocationId,
          })
        )
          return;
        const concurrent = await reservation.findInvocationClaim(
          i.reservationId,
          i.invocationId,
        );
        if (!concurrent?.settledAt)
          throw new BillingDomainError(
            "Invocation authorization settlement failed",
          );
      };
      if (existing) {
        if (
          existing.provider !== provider ||
          existing.model !== model ||
          existing.agentRole !== i.agentRole ||
          (existing.inputTokens !== input && !retryableExisting) ||
          (existing.cachedInputTokens !== cachedInput && !retryableExisting) ||
          (existing.cacheWriteTokens !== cacheWrite && !retryableExisting) ||
          (existing.outputTokens !== output && !retryableExisting) ||
          (existing.reasoningTokens !== reasoning && !retryableExisting) ||
          (existing.totalTokens !== (i.totalTokens ?? null) &&
            !retryableExisting) ||
          (existing.providerResponseId !== (i.providerResponseId ?? null) &&
            !retryableExisting) ||
          existing.assessmentId !== (assessmentId ?? null) ||
          existing.runId !== (runId ?? null) ||
          existing.reservationId !== i.reservationId ||
          (i.occurredAt !== undefined &&
            existing.occurredAt.getTime() !== i.occurredAt.getTime())
        )
          throw new BillingIdempotencyConflictError("Usage replay differs");
        if (!retryableExisting || !hasRequiredProviderUsage) {
          if (existing.status === LLM_USAGE_STATUSES.UNAVAILABLE)
            await settleAuthorizationClaimIfPresent();
          return existing;
        }
      }
      if (i.providerResponseId) {
        const response = await usage.findByProviderResponse(
          provider,
          i.providerResponseId,
        );
        if (response && response.id !== existing?.id)
          throw new BillingIdempotencyConflictError(
            "Provider response already recorded",
          );
      }
      const createUnavailable = async (availabilityReason: string) => {
        const event =
          existing ??
          (await usage.create({
            userId: i.userId,
            assessmentId: assessmentId ?? undefined,
            runId: runId ?? undefined,
            agentRole: i.agentRole,
            provider,
            model,
            invocationId: i.invocationId,
            providerResponseId: i.providerResponseId,
            inputTokens: i.inputTokens,
            cachedInputTokens: i.cachedInputTokens,
            cacheWriteTokens: i.cacheWriteTokens,
            outputTokens: i.outputTokens,
            reasoningTokens: i.reasoningTokens,
            totalTokens: i.totalTokens,
            reservationId: i.reservationId,
            chargedCredits: 0n,
            providerCostCredits: 0n,
            customerChargeVnd: 0n,
            status: LLM_USAGE_STATUSES.UNAVAILABLE,
            availabilityReason,
            occurredAt,
          }));
        await settleAuthorizationClaimIfPresent();
        return event;
      };
      if (assessmentId && runId && !hasRequiredProviderUsage)
        return createUnavailable(
          LLM_USAGE_AVAILABILITY_REASONS.providerUsageMetadataMissing,
        );
      const selected = await repos.runtimePolicy.findApplicable(
        i.agentRole,
        provider,
        model,
        occurredAt,
      );
      if (!selected) {
        if (assessmentId && runId)
          return createUnavailable(
            LLM_USAGE_AVAILABILITY_REASONS.runtimePolicySnapshotMissing,
          );
        throw new BillingDomainError(
          "No effective runtime model configuration",
        );
      }
      const effectiveRuntimeModel = i.effectiveRuntimeModel ?? {
        provider: selected.provider,
        model: selected.model,
        policyVersion: selected.policyVersion,
        effectiveAt: selected.effectiveAt.toISOString(),
      };
      if (
        provider !== effectiveRuntimeModel.provider ||
        model !== effectiveRuntimeModel.model
      )
        throw new BillingDomainError(
          "Usage provider/model differs from effective runtime policy",
        );
      assertMatchesEffectiveRuntimeModel(selected, effectiveRuntimeModel);
      const snapshot = await pricing.findApplicable(
        provider,
        model,
        occurredAt,
      );
      if (!snapshot) {
        if (assessmentId && runId)
          return createUnavailable(
            LLM_USAGE_AVAILABILITY_REASONS.pricingSnapshotMissing,
          );
        throw new BillingDomainError("No applicable pricing snapshot");
      }
      let providerCost: bigint;
      let customerChargeVnd: bigint;
      try {
        providerCost = calculateUsageChargeCredits(
          {
            inputTokens: input,
            cachedInputTokens: cachedInput,
            cacheWriteTokens: cacheWrite,
            outputTokens: output,
            reasoningTokens: reasoning,
          },
          snapshot,
        );
        customerChargeVnd = calculateCustomerChargeVnd(
          {
            inputTokens: input,
            cachedInputTokens: cachedInput,
            cacheWriteTokens: cacheWrite,
            outputTokens: output,
            reasoningTokens: reasoning,
          },
          snapshot,
        );
      } catch (error) {
        if (assessmentId && runId && error instanceof BillingDomainError)
          return createUnavailable(
            LLM_USAGE_AVAILABILITY_REASONS.pricingSnapshotInvalid,
          );
        throw error;
      }
      const event =
        existing && retryableExisting
          ? await usage.updateRetryable({
              id: existing.id,
              providerResponseId: i.providerResponseId,
              inputTokens: input,
              cachedInputTokens: cachedInput,
              cacheWriteTokens: cacheWrite,
              outputTokens: output,
              reasoningTokens: reasoning,
              totalTokens: i.totalTokens,
              pricingSnapshotId: snapshot.id,
              runtimePolicySnapshotId: selected.id,
              providerCostCredits: providerCost,
              customerChargeVnd,
            })
          : await usage.create({
              userId: i.userId,
              assessmentId: assessmentId ?? undefined,
              runId: runId ?? undefined,
              agentRole: i.agentRole,
              provider,
              model,
              invocationId: i.invocationId,
              providerResponseId: i.providerResponseId,
              inputTokens: input,
              cachedInputTokens: cachedInput,
              cacheWriteTokens: cacheWrite,
              outputTokens: output,
              reasoningTokens: reasoning,
              // Provider totals can overlap canonical billable dimensions; they are
              // informational and must never be rebuilt from billed buckets.
              totalTokens: i.totalTokens,
              pricingSnapshotId: snapshot.id,
              runtimePolicySnapshotId: selected.id,
              providerCostCredits: providerCost,
              customerChargeVnd,
              reservationId: i.reservationId,
              chargedCredits: customerChargeVnd,
              occurredAt,
            });
      if (assessmentId && runId) {
        await this.accounting.settleUsageWithinTransaction(repos, {
          userId: i.userId,
          reservationId: i.reservationId,
          invocationId: i.invocationId,
          usageEventId: event.id,
          chargedCredits: customerChargeVnd,
        });
      } else {
        await this.accounting.settleWithinTransaction(repos, {
          userId: i.userId,
          reservationId: i.reservationId,
          chargedCredits: customerChargeVnd,
        });
      }
      return event;
    });
  }
}
