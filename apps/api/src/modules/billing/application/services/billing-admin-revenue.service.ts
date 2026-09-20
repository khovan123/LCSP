import { Injectable } from "@nestjs/common";
import {
  BILLING_ADMIN_PAYMENT_FILTERS,
  BILLING_ADMIN_PERIODS,
  BILLING_ORDER_STATUSES,
  LLM_USAGE_STATUSES,
  PAYMENT_RECONCILIATION_STATUSES,
} from "@lcsp/contracts/billing";
import type {
  BillingAdminDashboard,
  BillingAdminPeriod,
  BillingAdminPaymentFilter,
} from "@lcsp/contracts/billing";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";

const OPEN_RECONCILIATION_STATUSES = [
  PAYMENT_RECONCILIATION_STATUSES.UNMATCHED,
  PAYMENT_RECONCILIATION_STATUSES.AMOUNT_MISMATCH,
  PAYMENT_RECONCILIATION_STATUSES.NEEDS_REVIEW,
] as const;

@Injectable()
export class BillingAdminRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(input: {
    period: BillingAdminPeriod;
    status: BillingAdminPaymentFilter;
    page: number;
    pageSize: number;
    now?: Date;
  }): Promise<BillingAdminDashboard> {
    const now = input.now ?? new Date();
    const days = periodDays(input.period);
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const paymentWhere: Prisma.PaymentTransactionWhereInput = {
      receivedAt: { gte: from, lte: now },
      ...(input.status !== BILLING_ADMIN_PAYMENT_FILTERS.all
        ? { reconciliationStatus: input.status }
        : {}),
    };

    const [
      topUps,
      usage,
      pendingReconciliationCount,
      duplicatePaymentCount,
      items,
      totalCount,
    ] = await Promise.all([
      this.prisma.billingOrder.aggregate({
        where: {
          status: BILLING_ORDER_STATUSES.CREDITED,
          creditedAt: { gte: from, lte: now },
        },
        _sum: { amountMinorUnits: true },
      }),
      this.prisma.llmUsageEvent.aggregate({
        where: {
          status: LLM_USAGE_STATUSES.SETTLED,
          occurredAt: { gte: from, lte: now },
        },
        _sum: { customerChargeVnd: true },
      }),
      this.prisma.paymentTransaction.count({
        where: {
          reconciliationStatus: { in: [...OPEN_RECONCILIATION_STATUSES] },
        },
      }),
      this.prisma.paymentTransaction.count({
        where: {
          reconciliationStatus: PAYMENT_RECONCILIATION_STATUSES.DUPLICATE,
          receivedAt: { gte: from, lte: now },
        },
      }),
      this.prisma.paymentTransaction.findMany({
        where: paymentWhere,
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          billingOrder: {
            select: {
              id: true,
              paymentCode: true,
              status: true,
              user: { select: { id: true, email: true, displayName: true } },
            },
          },
        },
        orderBy: { receivedAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.paymentTransaction.count({ where: paymentWhere }),
    ]);

    return {
      period: input.period,
      summary: {
        settledTopUpVnd: (topUps._sum.amountMinorUnits ?? 0n).toString(),
        usageRevenueVnd: (usage._sum.customerChargeVnd ?? 0n).toString(),
        pendingReconciliationCount,
        duplicatePaymentCount,
      },
      items: items.map((payment) => {
        const account = payment.billingOrder?.user ?? payment.user ?? null;
        return {
          id: payment.id,
          provider: payment.provider,
          providerTransactionId: payment.providerTransactionId,
          amountVnd: payment.amountMinorUnits.toString(),
          reconciliationStatus: payment.reconciliationStatus,
          reconciliationReason: payment.reconciliationReason,
          receivedAt: payment.receivedAt.toISOString(),
          reconciledAt: payment.reconciledAt?.toISOString() ?? null,
          account: account
            ? {
                userId: account.id,
                email: account.email,
                displayName: account.displayName,
              }
            : null,
          order: payment.billingOrder
            ? {
                id: payment.billingOrder.id,
                paymentCode: payment.billingOrder.paymentCode,
                status: payment.billingOrder.status,
              }
            : null,
        };
      }),
      page: input.page,
      pageSize: input.pageSize,
      totalCount,
    };
  }
}

export function normalizeBillingAdminPeriod(
  value?: string,
): BillingAdminPeriod {
  if (value === BILLING_ADMIN_PERIODS.d7) return BILLING_ADMIN_PERIODS.d7;
  if (value === BILLING_ADMIN_PERIODS.d90) return BILLING_ADMIN_PERIODS.d90;
  return BILLING_ADMIN_PERIODS.d30;
}

export function normalizeBillingAdminFilter(
  value?: string,
): BillingAdminPaymentFilter {
  if (
    value &&
    Object.values(BILLING_ADMIN_PAYMENT_FILTERS).includes(
      value as BillingAdminPaymentFilter,
    )
  ) {
    return value as BillingAdminPaymentFilter;
  }
  return BILLING_ADMIN_PAYMENT_FILTERS.all;
}

function periodDays(period: BillingAdminPeriod): number {
  if (period === BILLING_ADMIN_PERIODS.d7) return 7;
  if (period === BILLING_ADMIN_PERIODS.d90) return 90;
  return 30;
}
