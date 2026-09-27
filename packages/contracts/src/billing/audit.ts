export const BILLING_AUDIT_EVENT_TYPES = {
  reservationAutoRefillEnabled: "BILLING_RESERVATION_AUTO_REFILL_ENABLED",
  orderCreated: "billing.order.created",
  orderExpired: "billing.order.expired",
  reconciliationDecided: "billing.reconciliation.decided",
  reconciliationSettled: "billing.reconciliation.settled",
} as const;

export type BillingAuditEventType =
  (typeof BILLING_AUDIT_EVENT_TYPES)[keyof typeof BILLING_AUDIT_EVENT_TYPES];
