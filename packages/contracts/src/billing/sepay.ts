export const BILLING_PROVIDER = { sepay: "SEPAY" } as const;
export const BILLING_RECONCILIATION_EVENT_TYPES = {
  sepayWebhookAccepted: "command.billing.sepay-reconcile.v1",
} as const;

export const BILLING_RECONCILIATION_ERROR_CODES = {
  invalidSignature: "BILLING_WEBHOOK_SIGNATURE_INVALID",
  staleTimestamp: "BILLING_WEBHOOK_TIMESTAMP_STALE",
  malformedBody: "BILLING_WEBHOOK_BODY_MALFORMED",
  invalidPayload: "BILLING_WEBHOOK_PAYLOAD_INVALID",
} as const;

export type SePayNormalizedPayload = {
  providerTransactionId: string;
  paymentCode: string | null;
  amountMinorUnits: bigint;
  transferDirection: "IN" | "OUT" | "UNKNOWN";
  referenceCode: string | null;
  transactionDate: string | null;
  integrityHash: string;
};
