import { Query } from "@nestjs/cqrs";
import type { ReadinessResponse } from "../../contracts/wizard/readiness.contract.js";

export interface ReadinessAuthorizationContext {
  subjectRole: string;
  selectedAction: string | null;
}

export class GetReadinessQuery extends Query<ReadinessResponse> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly correlationId: string,
    public readonly authorization: ReadinessAuthorizationContext,
  ) {
    super();
  }
}
