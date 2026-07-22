import { CONFLICT_RECORD_STATUSES } from "@lcsp/contracts/scan";

export class ConflictRecordEntity {
  private constructor(
    readonly id: string,
    readonly aiUsageFlowId: string,
    readonly assessmentId: string,
    readonly organizationId: string,
    readonly conflictType: string,
    readonly conflictScore: number,
    readonly scoreExplanation: string,
    readonly evidenceRefs: readonly string[],
    readonly status: string,
    readonly createdAt: Date,
  ) {}

  static pending(fields: {
    id: string;
    aiUsageFlowId: string;
    assessmentId: string;
    organizationId: string;
    conflictType: string;
    conflictScore: number;
    scoreExplanation: string;
    evidenceRefs: readonly string[];
    createdAt?: Date;
  }): ConflictRecordEntity {
    return new ConflictRecordEntity(
      fields.id,
      fields.aiUsageFlowId,
      fields.assessmentId,
      fields.organizationId,
      fields.conflictType,
      fields.conflictScore,
      fields.scoreExplanation,
      fields.evidenceRefs,
      CONFLICT_RECORD_STATUSES.pending,
      fields.createdAt ?? new Date(),
    );
  }
}
