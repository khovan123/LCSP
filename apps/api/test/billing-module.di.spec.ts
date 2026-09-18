import { Test } from "@nestjs/testing";
import { afterEach, describe, expect, it } from "@jest/globals";
import { BillingModule } from "../src/modules/billing/billing.module.js";
import { BillingAccountingService } from "../src/modules/billing/application/services/billing-accounting.service.js";
import { BillingPaymentService } from "../src/modules/billing/application/services/billing-payment.service.js";
import { BILLING_USAGE_COMMAND_KERNEL } from "../src/modules/billing/application/services/billing-usage-command-kernel.js";

describe("BillingModule dependency injection", () => {
  let moduleRef: { close: () => Promise<void> } | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  it("resolves billing command handlers through the runtime transaction token", async () => {
    const compiled = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();
    moduleRef = compiled;
    expect(compiled.get(BillingAccountingService)).toBeInstanceOf(
      BillingAccountingService,
    );
    expect(compiled.get(BillingPaymentService)).toBeInstanceOf(
      BillingPaymentService,
    );
    expect(compiled.get(BILLING_USAGE_COMMAND_KERNEL)).toBeDefined();
  });
});
