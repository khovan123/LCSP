import { randomUUID } from "node:crypto";

import { AI_USAGE_FLOW_STATUSES } from "@lcsp/contracts/scan";

export class AIUsageFlowEntity {
  readonly id: string = randomUUID();

  private constructor(
    readonly technicalProfileId: string,
    readonly assessmentId: string,
    readonly organizationId: string,
    readonly schemaVersion: string,
    readonly providerVersion: string,
    readonly claims: readonly unknown[],
    readonly unknownUsages: readonly unknown[],
    readonly privacyFlags: Record<string, unknown>,
    readonly status: string,
    readonly createdAt: Date,
  ) {}

  static accept(fields: {
    technicalProfileId: string;
    assessmentId: string;
    organizationId: string;
    schemaVersion: string;
    providerVersion: string;
    claims: readonly unknown[];
    unknownUsages: readonly unknown[];
    privacyFlags: Record<string, unknown>;
    createdAt?: Date;
  }): AIUsageFlowEntity {
    return new AIUsageFlowEntity(
      fields.technicalProfileId,
      fields.assessmentId,
      fields.organizationId,
      fields.schemaVersion,
      fields.providerVersion,
      fields.claims,
      fields.unknownUsages,
      fields.privacyFlags,
      AI_USAGE_FLOW_STATUSES.accepted,
      fields.createdAt ?? new Date(),
    );
  }
}
