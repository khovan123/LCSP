export const PREPAID_BILLING_CONFIG = {
  currency: "VND",
  minimumAmountVnd: 10_000n,
  maximumAmountVnd: 10_000_000n,
  amountStepVnd: 1_000n,
  creditUnitsPerVnd: 1n,
  orderExpiryHours: 24,
  paymentCodePrefix: "LCSP",
} as const;

export type PrepaidOrderInput = {
  amountVnd: string;
};

export type PrepaidEstimate = {
  currency: typeof PREPAID_BILLING_CONFIG.currency;
  amountVnd: string;
  creditUnits: string;
  expiresInHours: number;
};

export type BillingWalletView = {
  walletId: string;
  availableCredits: string;
  reservedCredits: string;
  totalCredits: string;
  version: number;
};

export type BillingOrderView = {
  id: string;
  amountVnd: string;
  creditUnits: string;
  paymentCode: string;
  status: string;
  expiresAt: string | null;
  creditedAt: string | null;
  createdAt: string;
  updatedAt: string;
  paymentInstructions: {
    currency: "VND";
    paymentCode: string;
    amountVnd: string;
  };
};

export type BillingHistoryView = {
  orders: BillingOrderView[];
  page: number;
  pageSize: number;
  totalCount: number;
};
