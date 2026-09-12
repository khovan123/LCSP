import { Module } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { BillingAccountingService } from "./application/services/billing-accounting.service.js";
import { PrismaBillingTransaction } from "./infrastructure/persistence/prisma-billing-transaction.js";
import { BillingPaymentService } from "./application/services/billing-payment.service.js";
import { BillingUsageService } from "./application/services/billing-usage.service.js";

@Module({
  providers: [
    PrismaService,
    PrismaBillingTransaction,
    BillingAccountingService,
    BillingPaymentService,
    BillingUsageService,
  ],
  exports: [
    BillingAccountingService,
    BillingPaymentService,
    BillingUsageService,
  ],
})
export class BillingModule {}
