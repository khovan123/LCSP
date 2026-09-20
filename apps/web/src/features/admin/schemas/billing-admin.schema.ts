import { z } from "zod";
import {
  BILLING_ADMIN_PERIODS,
  BILLING_ORDER_STATUSES,
  PAYMENT_RECONCILIATION_REASONS,
  PAYMENT_RECONCILIATION_STATUSES,
} from "@lcsp/contracts/billing";

const accountSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable(),
});

const billingAdminPaymentRowSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  providerTransactionId: z.string().min(1),
  amountVnd: z.string().regex(/^\d+$/),
  reconciliationStatus: z.enum(PAYMENT_RECONCILIATION_STATUSES),
  reconciliationReason: z.enum(PAYMENT_RECONCILIATION_REASONS).nullable(),
  receivedAt: z.string().min(1),
  reconciledAt: z.string().nullable(),
  account: accountSchema.nullable(),
  order: z
    .object({
      id: z.string().min(1),
      paymentCode: z.string().min(1),
      status: z.enum(BILLING_ORDER_STATUSES),
    })
    .nullable(),
});

export const billingAdminDashboardSchema = z.object({
  period: z.enum(BILLING_ADMIN_PERIODS),
  summary: z.object({
    settledTopUpVnd: z.string().regex(/^\d+$/),
    usageRevenueVnd: z.string().regex(/^\d+$/),
    pendingReconciliationCount: z.number().int().nonnegative(),
    duplicatePaymentCount: z.number().int().nonnegative(),
  }),
  items: z.array(billingAdminPaymentRowSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
});

export function parseBillingAdminDashboard(value: unknown) {
  const parsed = billingAdminDashboardSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
