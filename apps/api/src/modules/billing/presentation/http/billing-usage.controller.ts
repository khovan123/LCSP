import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { BILLING_ERROR_CODES } from "@lcsp/contracts/billing";
import { BillingUsageService } from "../../application/services/billing-usage.service.js";
import {
  BillingConcurrencyError,
  BillingDomainError,
  BillingIdempotencyConflictError,
  InsufficientCreditError,
  InvalidReservationTransitionError,
  OwnershipMismatchError,
} from "../../domain/billing.errors.js";

@Controller("internal/billing")
export class BillingUsageController {
  constructor(private readonly usage: BillingUsageService) {}

  @Post("reservations")
  @UseGuards(WorkerApiKeyGuard)
  async reserve(@Body() body: Record<string, unknown>) {
    const text = (value: unknown) =>
      typeof value === "string" || typeof value === "number"
        ? String(value).trim()
        : "";
    const amount = text(body.amountCredits);
    const assessmentId = text(body.assessmentId);
    const runId = text(body.runId);
    const idempotencyKey = text(body.idempotencyKey);
    try {
      if (!assessmentId || !runId || !idempotencyKey || !amount)
        throw new BillingDomainError("Reservation input is required");
      const result = await this.usage.reserveForAssessment({
        assessmentId,
        runId,
        amountCredits: parseInteger(amount, "amountCredits"),
        idempotencyKey,
      });
      return resultEnvelope(serializeBillingData(projectReservation(result)));
    } catch (error) {
      throw mapUsageError(error);
    }
  }

  @Post("reservations/:reservationId/release")
  @UseGuards(WorkerApiKeyGuard)
  async release(
    @Param("reservationId") reservationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const assessmentId =
      typeof body.assessmentId === "string" ? body.assessmentId.trim() : "";
    try {
      if (!assessmentId || !reservationId.trim())
        throw new BillingDomainError("Release input is required");
      const result = await this.usage.releaseForAssessment({
        assessmentId,
        reservationId: reservationId.trim(),
      });
      return resultEnvelope(serializeBillingData(projectReservation(result)));
    } catch (error) {
      throw mapUsageError(error);
    }
  }

  @Post("usage")
  @UseGuards(WorkerApiKeyGuard)
  async settle(@Body() body: Record<string, unknown>) {
    const text = (value: unknown) =>
      typeof value === "string" || typeof value === "number"
        ? String(value)
        : "";
    const bigintField = (name: string) => {
      const value = body[name];
      return value === undefined ? undefined : parseInteger(text(value), name);
    };
    const runtimeValue = body.effectiveRuntimeModel;
    const runtime =
      runtimeValue &&
      typeof runtimeValue === "object" &&
      !Array.isArray(runtimeValue)
        ? (runtimeValue as Record<string, unknown>)
        : undefined;
    const provider =
      text(body.provider) ||
      (runtime && typeof runtime.provider === "string"
        ? runtime.provider.trim()
        : "");
    const model =
      text(body.model) ||
      (runtime && typeof runtime.model === "string"
        ? runtime.model.trim()
        : "");
    try {
      if (
        typeof body.assessmentId !== "string" ||
        !body.assessmentId.trim() ||
        typeof body.runId !== "string" ||
        !body.runId.trim() ||
        typeof body.agentRole !== "string" ||
        !body.agentRole.trim() ||
        !provider ||
        !model
      )
        throw new BillingDomainError("usage identity is required");
      if (runtimeValue !== undefined && !runtime)
        throw new BillingDomainError("effective runtime model is invalid");
      if (
        runtime &&
        ((typeof runtime.provider === "string" &&
          runtime.provider.trim() !== provider) ||
          (typeof runtime.model === "string" && runtime.model.trim() !== model))
      )
        throw new BillingDomainError(
          "Usage provider/model differs from effective runtime policy",
        );
      const assessmentId = body.assessmentId.trim();
      const runId = body.runId.trim();
      const userId = await this.usage.resolveAssessmentOwner(assessmentId);
      const effectiveRuntimeModel =
        runtime &&
        typeof runtime.policyVersion === "string" &&
        typeof runtime.effectiveAt === "string" &&
        !Number.isNaN(new Date(runtime.effectiveAt).getTime())
          ? {
              provider,
              model,
              policyVersion: runtime.policyVersion,
              effectiveAt: runtime.effectiveAt,
            }
          : undefined;
      const result = await this.usage.recordAndSettleUsage({
        userId,
        assessmentId,
        runId,
        reservationId: text(body.reservationId),
        invocationId: text(body.invocationId),
        agentRole: body.agentRole.trim(),
        provider,
        model,
        effectiveRuntimeModel,
        providerResponseId: body.providerResponseId
          ? text(body.providerResponseId)
          : undefined,
        inputTokens: bigintField("inputTokens"),
        cachedInputTokens: bigintField("cachedInputTokens"),
        cacheWriteTokens: bigintField("cacheWriteTokens"),
        outputTokens: bigintField("outputTokens"),
        reasoningTokens: bigintField("reasoningTokens"),
        totalTokens: bigintField("totalTokens"),
        occurredAt: body.occurredAt
          ? new Date(text(body.occurredAt))
          : undefined,
      });
      return resultEnvelope(serializeBillingData(result));
    } catch (error) {
      throw mapUsageError(error);
    }
  }
}

function mapUsageError(error: unknown) {
  const code =
    error instanceof InsufficientCreditError
      ? BILLING_ERROR_CODES.insufficientCredits
      : error instanceof OwnershipMismatchError
        ? BILLING_ERROR_CODES.ownershipMismatch
        : error instanceof BillingIdempotencyConflictError
          ? BILLING_ERROR_CODES.idempotencyConflict
          : error instanceof InvalidReservationTransitionError
            ? BILLING_ERROR_CODES.reservationTransition
            : error instanceof BillingConcurrencyError
              ? BILLING_ERROR_CODES.concurrencyConflict
              : error instanceof BillingDomainError
                ? BILLING_ERROR_CODES.validationFailed
                : null;
  if (!code) return error;
  const status =
    code === BILLING_ERROR_CODES.insufficientCredits
      ? HttpStatus.PAYMENT_REQUIRED
      : code === BILLING_ERROR_CODES.ownershipMismatch
        ? HttpStatus.FORBIDDEN
        : code === BILLING_ERROR_CODES.idempotencyConflict ||
            code === BILLING_ERROR_CODES.reservationTransition ||
            code === BILLING_ERROR_CODES.concurrencyConflict
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST;
  return problemException(code, "billing-usage", { status });
}

function serializeBillingData(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeBillingData);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      serializeBillingData(entry),
    ]),
  );
}

function projectReservation(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const reservation = value as Record<string, unknown>;
  return {
    reservationId: reservation.id ?? reservation.reservationId,
    assessmentId: reservation.assessmentId,
    runId: reservation.runId,
    amountCredits: reservation.amountCredits,
    remainingCredits: reservation.remainingCredits,
    status: reservation.status,
  };
}

function parseInteger(value: string, field: string): bigint {
  if (!/^-?\d+$/.test(value))
    throw new BillingDomainError(`${field} must be an integer`);
  try {
    return BigInt(value);
  } catch {
    throw new BillingDomainError(`${field} is invalid`);
  }
}
