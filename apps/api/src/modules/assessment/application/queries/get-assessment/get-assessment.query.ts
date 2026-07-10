import { Query } from "@nestjs/cqrs";

import type { AssessmentDetailDto } from "../../contracts/assessment/assessment-detail.contract.js";
import type { SubjectRole } from "../../../../../platform/pbac/pbac.types.js";

export class GetAssessmentQuery extends Query<AssessmentDetailDto> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly sessionUserId: string,
    public readonly subjectRole: SubjectRole,
    public readonly correlationId: string,
  ) {
    super();
  }
}
