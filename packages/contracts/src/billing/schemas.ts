import { z } from "zod";

import {
  BILLING_ADMIN_GATEWAYS,
  BILLING_ADMIN_PAYMENT_FILTERS,
  BILLING_ADMIN_PERIODS,
} from "./admin.ts";
import { PREPAID_BILLING_CONFIG } from "./prepaid.ts";
import { PAYMENT_RECONCILIATION_STATUSES } from "./statuses.ts";

const nonEmptyText = z.string().trim().min(1);
const flexibleText = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1));
const integerText = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^-?\d+$/));
const nonNegativeIntegerText = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .pipe(z.string().regex(/^\d+$/));

const minimumAmountVnd = Number(PREPAID_BILLING_CONFIG.minimumAmountVnd);
const maximumAmountVnd = Number(PREPAID_BILLING_CONFIG.maximumAmountVnd);
const amountStepVnd = Number(PREPAID_BILLING_CONFIG.amountStepVnd);

/** Canonical validation for prepaid amounts accepted by Billing HTTP requests. */
export const billingAmountVndSchema = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .refine((value) => {
    const normalized = value.replace(/^0+(?=\d)/, "");
    if (normalized.length > PREPAID_BILLING_CONFIG.maximumAmountVnd.length)
      return false;
    const amount = Number(normalized);
    return (
      Number.isSafeInteger(amount) &&
      amount >= minimumAmountVnd &&
      amount <= maximumAmountVnd &&
      amount % amountStepVnd === 0
    );
  });

export const billingCreateOrderSchema = z.object({
  amount_vnd: billingAmountVndSchema,
});
export type BillingCreateOrderInput = z.infer<typeof billingCreateOrderSchema>;

export const billingIdempotencyKeySchema = nonEmptyText;

export const billingHistoryQuerySchema = z.object({
  page: z.preprocess(
    (value) =>
      value === undefined
        ? 1
        : typeof value === "string"
          ? Number(value)
          : value,
    z.number().int().safe().min(1),
  ),
  page_size: z.preprocess(
    (value) =>
      value === undefined
        ? 20
        : typeof value === "string"
          ? Number(value)
          : value,
    z
      .number()
      .int()
      .safe()
      .min(1)
      .transform((value) => Math.min(value, 100)),
  ),
});
export type BillingHistoryQueryInput = z.infer<
  typeof billingHistoryQuerySchema
>;

export const billingResourceIdSchema = nonEmptyText;

export const billingUsageReservationSchema = z.object({
  assessmentId: flexibleText,
  runId: flexibleText,
  idempotencyKey: flexibleText,
  provider: flexibleText,
  model: flexibleText,
  amountCredits: integerText,
  maxChargeCredits: integerText,
  maxInputTokens: nonNegativeIntegerText,
  maxOutputTokens: nonNegativeIntegerText,
  maxReasoningTokens: nonNegativeIntegerText,
  maxInvocations: nonNegativeIntegerText,
  authorizedModels: z
    .array(
      z.object({
        provider: flexibleText,
        model: flexibleText,
      }),
    )
    .min(1),
});
export type BillingUsageReservationRequest = z.infer<
  typeof billingUsageReservationSchema
>;

export const billingUsageReleaseSchema = z.object({
  assessmentId: flexibleText,
});
export type BillingUsageReleaseRequest = z.infer<
  typeof billingUsageReleaseSchema
>;

export const billingUsageClaimSchema = z.object({
  assessmentId: flexibleText,
  invocationId: flexibleText,
});
export type BillingUsageClaimRequest = z.infer<typeof billingUsageClaimSchema>;

const runtimeModelSchema = z.object({
  provider: nonEmptyText.optional(),
  model: nonEmptyText.optional(),
  policyVersion: nonEmptyText.optional(),
  effectiveAt: nonEmptyText.optional(),
});

export const billingUsageSettlementSchema = z
  .object({
    assessmentId: nonEmptyText,
    runId: nonEmptyText,
    agentRole: nonEmptyText,
    provider: nonEmptyText.optional(),
    model: nonEmptyText.optional(),
    effectiveRuntimeModel: runtimeModelSchema.optional(),
    reservationId: flexibleText.optional(),
    invocationId: flexibleText.optional(),
    providerResponseId: flexibleText.optional(),
    inputTokens: integerText.optional(),
    cachedInputTokens: integerText.optional(),
    cacheWriteTokens: integerText.optional(),
    outputTokens: integerText.optional(),
    reasoningTokens: integerText.optional(),
    totalTokens: integerText.optional(),
    occurredAt: z.iso.datetime().optional(),
  })
  .superRefine((value, context) => {
    const provider = value.provider ?? value.effectiveRuntimeModel?.provider;
    const model = value.model ?? value.effectiveRuntimeModel?.model;
    if (!provider || !model) {
      context.addIssue({
        code: "custom",
        message: "Usage provider and model are required",
      });
      return;
    }
    if (
      (value.effectiveRuntimeModel?.provider &&
        value.effectiveRuntimeModel.provider !== provider) ||
      (value.effectiveRuntimeModel?.model &&
        value.effectiveRuntimeModel.model !== model)
    ) {
      context.addIssue({
        code: "custom",
        message: "Usage provider/model differs from effective runtime policy",
      });
    }
  });
export type BillingUsageSettlementRequest = z.infer<
  typeof billingUsageSettlementSchema
>;

const positiveQueryInteger = (fallback: number, maximum?: number) =>
  z.preprocess(
    (value) =>
      value === undefined
        ? fallback
        : typeof value === "string"
          ? Number(value)
          : value,
    z
      .number()
      .int()
      .safe()
      .min(1)
      .transform((value) =>
        maximum === undefined ? value : Math.min(value, maximum),
      ),
  );

const optionalPositiveQueryInteger = z.preprocess(
  (value) =>
    value === undefined
      ? undefined
      : typeof value === "string"
        ? Number(value)
        : value,
  z
    .number()
    .int()
    .safe()
    .min(1)
    .transform((value) => Math.min(value, 100))
    .optional(),
);

export const billingAdminDashboardQuerySchema = z.object({
  period: z.enum(BILLING_ADMIN_PERIODS).default(BILLING_ADMIN_PERIODS.d30),
  status: z
    .enum(BILLING_ADMIN_PAYMENT_FILTERS)
    .default(BILLING_ADMIN_PAYMENT_FILTERS.all),
  gateway: z.enum(BILLING_ADMIN_GATEWAYS).default(BILLING_ADMIN_GATEWAYS.all),
  page: positiveQueryInteger(1),
  pageSize: positiveQueryInteger(20, 100),
});
export type BillingAdminDashboardQuery = z.infer<
  typeof billingAdminDashboardQuerySchema
>;

export const billingAdminReconciliationListQuerySchema = z.object({
  status: z.enum(PAYMENT_RECONCILIATION_STATUSES).optional(),
  page: positiveQueryInteger(1),
  take: positiveQueryInteger(50, 100),
  pageSize: optionalPositiveQueryInteger,
  page_size: optionalPositiveQueryInteger,
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  provider: nonEmptyText.optional(),
  userId: nonEmptyText.optional(),
  email: nonEmptyText.optional(),
  paymentCode: nonEmptyText.optional(),
  orderId: nonEmptyText.optional(),
});
export type BillingAdminReconciliationListQuery = z.infer<
  typeof billingAdminReconciliationListQuerySchema
>;

export const billingAdminResolveSchema = z.object({
  billingOrderId: nonEmptyText,
  expectedVersion: z.number().int().safe().min(0),
  rationale: nonEmptyText,
});
export type BillingAdminResolveRequest = z.infer<
  typeof billingAdminResolveSchema
>;

export const billingAdminRejectSchema = z.object({
  expectedStatus: z
    .enum(PAYMENT_RECONCILIATION_STATUSES)
    .default(PAYMENT_RECONCILIATION_STATUSES.NEEDS_REVIEW),
  expectedVersion: z.number().int().safe().min(0),
  rationale: nonEmptyText,
});
export type BillingAdminRejectRequest = z.infer<
  typeof billingAdminRejectSchema
>;

/** SePay JSON is parsed only after raw-body signature and timestamp verification. */
export const sePayWebhookPayloadSchema = z
  .object({
    id: z
      .union([z.string(), z.number()])
      .transform(String)
      .pipe(z.string().trim().min(1).max(128)),
    transferAmount: z
      .union([z.string(), z.number()])
      .transform(String)
      .pipe(z.string().regex(/^\d+$/)),
  })
  .passthrough();
export type SePayWebhookPayload = z.infer<typeof sePayWebhookPayloadSchema>;
