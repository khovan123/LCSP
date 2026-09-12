import { Injectable } from "@nestjs/common";
import { BillingAccountingService } from "./billing-accounting.service.js";
import { BillingIdempotencyConflictError } from "../../domain/billing.errors.js";
import type { BillingTransactionPort } from "../../domain/repositories/billing-transaction.port.js";

@Injectable()
export class BillingPaymentService {
  constructor(
    private readonly transactions: BillingTransactionPort,
    private readonly accounting: BillingAccountingService,
  ) {}
  async createOrder(i: {
    userId: string;
    paymentCode: string;
    idempotencyKey: string;
    amountMinorUnits: bigint;
    creditUnits: bigint;
    requestFingerprint?: string;
  }) {
    return this.transactions.runForUser(i.userId, async ({ order }) => {
      const old = await order.findByIdempotencyKey(i.userId, i.idempotencyKey);
      if (old) {
        if (old.requestFingerprint !== (i.requestFingerprint ?? null))
          throw new BillingIdempotencyConflictError("Order replay differs");
        return old;
      }
      return order.createPending(i);
    });
  }
  reconcilePayment(i: {
    provider: string;
    providerTransactionId: string;
    paymentCode: string;
    amountMinorUnits: bigint;
    sanitizedPayload?: unknown;
  }) {
    return this.transactions.runForUser(
      `payment:${i.provider}:${i.providerTransactionId}`,
      async (repos) => {
        const webhook = await repos.webhook.recordReceived({
          provider: i.provider,
          providerTransactionId: i.providerTransactionId,
          sanitizedPayload: i.sanitizedPayload,
        });
        const prior = await repos.payment.findByProviderTransaction(
          i.provider,
          i.providerTransactionId,
        );
        if (prior) return prior;
        const order = await repos.order.findByPaymentCode(i.paymentCode);
        if (!order)
          return repos.payment.create({
            provider: i.provider,
            providerTransactionId: i.providerTransactionId,
            amountMinorUnits: i.amountMinorUnits,
            reconciliationStatus: "UNMATCHED",
            webhookEventId: webhook.id,
          });
        if (order.status !== "PENDING_PAYMENT")
          return repos.payment.create({
            provider: i.provider,
            providerTransactionId: i.providerTransactionId,
            amountMinorUnits: i.amountMinorUnits,
            userId: order.userId,
            billingOrderId: order.id,
            reconciliationStatus:
              order.status === "CREDITED" ? "DUPLICATE" : "NEEDS_REVIEW",
            webhookEventId: webhook.id,
          });
        if (order.amountMinorUnits !== i.amountMinorUnits) {
          await repos.order.transition(
            order.id,
            "PENDING_PAYMENT",
            "PENDING_RECONCILIATION",
          );
          return repos.payment.create({
            provider: i.provider,
            providerTransactionId: i.providerTransactionId,
            amountMinorUnits: i.amountMinorUnits,
            userId: order.userId,
            billingOrderId: order.id,
            reconciliationStatus: "AMOUNT_MISMATCH",
            webhookEventId: webhook.id,
          });
        }
        await repos.lockUserAccount(order.userId);
        const wallet = await repos.wallet.getOrCreateForUser(order.userId);
        await this.accounting.creditOrderInTransaction(repos, {
          userId: order.userId,
          walletId: wallet.id,
          orderId: order.id,
          creditUnits: order.creditUnits,
        });
        const credited = await repos.order.transition(
          order.id,
          "PENDING_PAYMENT",
          "CREDITED",
        );
        if (!credited)
          return repos.payment.create({
            provider: i.provider,
            providerTransactionId: i.providerTransactionId,
            amountMinorUnits: i.amountMinorUnits,
            userId: order.userId,
            billingOrderId: order.id,
            reconciliationStatus: "DUPLICATE",
            webhookEventId: webhook.id,
          });
        return repos.payment.create({
          provider: i.provider,
          providerTransactionId: i.providerTransactionId,
          amountMinorUnits: i.amountMinorUnits,
          userId: order.userId,
          billingOrderId: order.id,
          reconciliationStatus: "MATCHED",
          webhookEventId: webhook.id,
        });
      },
    );
  }
}
