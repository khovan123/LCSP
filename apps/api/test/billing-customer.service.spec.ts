import { describe, expect, it, jest } from "@jest/globals";
import { BillingCustomerService } from "../src/modules/billing/application/services/billing-customer.service.js";
import { BillingPaymentService } from "../src/modules/billing/application/services/billing-payment.service.js";
import { BILLING_TRANSACTION_PORT } from "../src/modules/billing/domain/repositories/billing-transaction.port.js";
import { PREPAID_BILLING_CONFIG } from "@lcsp/contracts/billing";

const order = {
  id: "order-1",
  userId: "user-1",
  paymentCode: "LCSPABC123",
  idempotencyKey: "key-1",
  requestFingerprint: "hash",
  status: "PENDING_PAYMENT",
  amountMinorUnits: 10000n,
  creditUnits: 10000n,
  expiresAt: new Date("2030-01-01"),
  creditedAt: null,
  createdAt: new Date("2029-01-01"),
  updatedAt: new Date("2029-01-01"),
};

describe("BillingCustomerService", () => {
  it("uses the configured prepaid limits and conversion", () => {
    const service = new BillingCustomerService({} as never, {} as never);
    expect(
      service.estimate(PREPAID_BILLING_CONFIG.minimumAmountVnd),
    ).toMatchObject({
      currency: "VND",
      amountVnd: "10000",
      creditUnits: "10000",
    });
    expect(() => service.estimate(1n)).toThrow();
  });

  it("derives order ownership from the supplied authenticated user", async () => {
    const createOrder = jest
      .fn<(input: unknown) => Promise<any>>()
      .mockResolvedValue(order);
    const service = new BillingCustomerService(
      {} as never,
      { createOrder } as unknown as BillingPaymentService,
    );
    const result = await service.createOrder("user-1", 10000n, "key-1");
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        idempotencyKey: "key-1",
        amountMinorUnits: 10000n,
      }),
    );
    expect(result.paymentCode).toBe("LCSPABC123");
    expect(result.status).toBe("PENDING_PAYMENT");
  });

  it("queries orders through the owner-scoped repository", async () => {
    const findForUser = jest
      .fn<(user: string, id: string) => Promise<any>>()
      .mockResolvedValue(order);
    const transactions = {
      runForUser: jest.fn((_user: string, op: (r: never) => unknown) =>
        Promise.resolve(op({ order: { findForUser } } as never)),
      ),
    };
    const service = new BillingCustomerService(
      transactions as never,
      {} as never,
    );
    await service.getOrder("user-1", "order-1");
    expect(findForUser).toHaveBeenCalledWith("user-1", "order-1");
  });
});
