import { Injectable } from "@nestjs/common";
import { PREPAID_BILLING_CONFIG } from "@lcsp/contracts/billing";
import type {
  BillingHistoryView,
  BillingOrderView,
  BillingWalletView,
  PrepaidEstimate,
} from "@lcsp/contracts/billing";
import { BillingDomainError } from "../../domain/billing.errors.js";
import {
  BILLING_TRANSACTION_PORT,
  type BillingTransactionPort,
  type OrderRecord,
} from "../../domain/repositories/billing-transaction.port.js";
import { Inject } from "@nestjs/common";
import { BillingPaymentService } from "./billing-payment.service.js";
import { BILLING_ORDER_STATUSES } from "@lcsp/contracts/billing";

@Injectable()
export class BillingCustomerService {
  constructor(
    @Inject(BILLING_TRANSACTION_PORT)
    private readonly transactions: BillingTransactionPort,
    private readonly payments: BillingPaymentService,
  ) {}

  estimate(amountVnd: bigint): PrepaidEstimate {
    this.validateAmount(amountVnd);
    return {
      currency: PREPAID_BILLING_CONFIG.currency,
      amountVnd: amountVnd.toString(),
      creditUnits: (
        amountVnd * PREPAID_BILLING_CONFIG.creditUnitsPerVnd
      ).toString(),
      expiresInHours: PREPAID_BILLING_CONFIG.orderExpiryHours,
    };
  }

  async createOrder(userId: string, amountVnd: bigint, idempotencyKey: string) {
    const estimate = this.estimate(amountVnd);
    const order = await this.payments.createOrder({
      userId,
      idempotencyKey,
      amountMinorUnits: amountVnd,
      creditUnits: BigInt(estimate.creditUnits),
    });
    return this.toOrderView(order);
  }

  async getWallet(userId: string): Promise<BillingWalletView> {
    const wallet = await this.transactions.runForUser(userId, (r) =>
      r.wallet.getOrCreateForUser(userId),
    );
    return {
      walletId: wallet.id,
      availableCredits: wallet.availableCredits.toString(),
      reservedCredits: wallet.reservedCredits.toString(),
      totalCredits: (
        wallet.availableCredits + wallet.reservedCredits
      ).toString(),
      version: wallet.version,
    };
  }

  async getOrder(userId: string, id: string): Promise<BillingOrderView> {
    const order = await this.transactions.runForUser(userId, (r) =>
      r.order.findForUser(userId, id),
    );
    if (!order) throw new BillingDomainError("Billing order not found");
    if (
      order.status === BILLING_ORDER_STATUSES.PENDING_PAYMENT &&
      order.expiresAt &&
      order.expiresAt <= new Date()
    ) {
      await this.transactions.runForUser(userId, (r) =>
        r.order.transition(
          order.id,
          BILLING_ORDER_STATUSES.PENDING_PAYMENT,
          BILLING_ORDER_STATUSES.EXPIRED,
        ),
      );
      const expired = await this.transactions.runForUser(userId, (r) =>
        r.order.findForUser(userId, id),
      );
      return this.toOrderView(expired ?? order);
    }
    return this.toOrderView(order);
  }

  async listHistory(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<BillingHistoryView> {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safePageSize =
      Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;
    const result = await this.transactions.runForUser(userId, (r) =>
      r.order.listForUser({
        userId,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    );
    return {
      orders: result.orders.map((order) => this.toOrderView(order)),
      page: safePage,
      pageSize: safePageSize,
      totalCount: result.totalCount,
    };
  }

  private validateAmount(amountVnd: bigint) {
    if (
      amountVnd < PREPAID_BILLING_CONFIG.minimumAmountVnd ||
      amountVnd > PREPAID_BILLING_CONFIG.maximumAmountVnd ||
      amountVnd % PREPAID_BILLING_CONFIG.amountStepVnd !== 0n
    )
      throw new BillingDomainError("Invalid prepaid amount");
  }

  private toOrderView(order: OrderRecord): BillingOrderView {
    const amountVnd = order.amountMinorUnits.toString();
    return {
      id: order.id,
      amountVnd,
      creditUnits: order.creditUnits.toString(),
      paymentCode: order.paymentCode,
      status: order.status,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      creditedAt: order.creditedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      paymentInstructions: {
        currency: "VND",
        paymentCode: order.paymentCode,
        amountVnd,
      },
    };
  }
}
