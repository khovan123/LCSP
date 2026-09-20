import {
  BILLING_ORDER_STATUSES,
  PAYMENT_RECONCILIATION_REASONS,
  PAYMENT_RECONCILIATION_STATUSES,
} from "./statuses.ts";

export const BILLING_ADMIN_PERIODS = {
  d7: "7D",
  d30: "30D",
  d90: "90D",
} as const;

export type BillingAdminPeriod =
  (typeof BILLING_ADMIN_PERIODS)[keyof typeof BILLING_ADMIN_PERIODS];

export const BILLING_ADMIN_PAYMENT_FILTERS = {
  all: "ALL",
  matched: PAYMENT_RECONCILIATION_STATUSES.MATCHED,
  unmatched: PAYMENT_RECONCILIATION_STATUSES.UNMATCHED,
  amountMismatch: PAYMENT_RECONCILIATION_STATUSES.AMOUNT_MISMATCH,
  duplicate: PAYMENT_RECONCILIATION_STATUSES.DUPLICATE,
  rejected: PAYMENT_RECONCILIATION_STATUSES.REJECTED,
  needsReview: PAYMENT_RECONCILIATION_STATUSES.NEEDS_REVIEW,
} as const;

export type BillingAdminPaymentFilter =
  (typeof BILLING_ADMIN_PAYMENT_FILTERS)[keyof typeof BILLING_ADMIN_PAYMENT_FILTERS];

export type BillingAdminSummary = {
  settledTopUpVnd: string;
  usageRevenueVnd: string;
  pendingReconciliationCount: number;
  duplicatePaymentCount: number;
};

export type BillingAdminPaymentRow = {
  id: string;
  provider: string;
  providerTransactionId: string;
  amountVnd: string;
  reconciliationStatus: (typeof PAYMENT_RECONCILIATION_STATUSES)[keyof typeof PAYMENT_RECONCILIATION_STATUSES];
  reconciliationReason:
    | (typeof PAYMENT_RECONCILIATION_REASONS)[keyof typeof PAYMENT_RECONCILIATION_REASONS]
    | null;
  receivedAt: string;
  reconciledAt: string | null;
  account: { userId: string; email: string; displayName: string | null } | null;
  order: {
    id: string;
    paymentCode: string;
    status: (typeof BILLING_ORDER_STATUSES)[keyof typeof BILLING_ORDER_STATUSES];
  } | null;
};

export type BillingAdminDashboard = {
  period: BillingAdminPeriod;
  summary: BillingAdminSummary;
  items: BillingAdminPaymentRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};
