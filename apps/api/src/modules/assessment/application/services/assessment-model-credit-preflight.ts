import { BILLING_ERROR_CODES } from "@lcsp/contracts/billing";
import { HttpStatus, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../platform/http/filters/error.factory.js";
import { BillingAccountingKernel } from "../../../billing/application/shared/billing-accounting.kernel.js";

/**
 * Refuses Customer-triggered model work the worker could not bill. The worker
 * reserves billing.reservationCredits from the assessment owner's wallet before
 * any model call; queueing work the wallet cannot cover only strands the
 * Customer on a QUEUED step that never starts.
 */
@Injectable()
export class AssessmentModelCreditPreflight {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly billingAccounting?: BillingAccountingKernel,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async assertAvailable(
    assessmentId: string,
    correlationId: string,
  ): Promise<void> {
    if (
      !this.billingAccounting ||
      !this.config?.get<boolean>("billing.meteringEnabled", false)
    ) {
      return;
    }
    const configured = this.config
      .get<string>("billing.reservationCredits", "")
      .trim();
    if (!/^[0-9]+$/.test(configured)) return;
    const requiredCredits = BigInt(configured);
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { ownerId: true },
    });
    if (!assessment?.ownerId) return;
    const availableCredits = await this.billingAccounting
      .rebuildProjection(assessment.ownerId)
      .then((projection) => projection.availableBalance)
      .catch(() => 0n);
    if (availableCredits < requiredCredits) {
      throw problemException(
        BILLING_ERROR_CODES.insufficientCredits,
        correlationId,
        {
          status: HttpStatus.PAYMENT_REQUIRED,
          meta: {
            requiredCredits: requiredCredits.toString(),
            availableCredits: availableCredits.toString(),
          },
        },
      );
    }
  }
}
