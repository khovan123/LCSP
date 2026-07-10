import { Query } from "@nestjs/cqrs";

import type { AssessmentListDto } from "../../contracts/assessment/assessment-list.contract.js";
import type { SubjectRole } from "../../../../../platform/pbac/pbac.types.js";

export class ListAssessmentsQuery extends Query<AssessmentListDto> {
  constructor(
    public readonly organizationId: string,
    public readonly sessionUserId: string,
    public readonly subjectRole: SubjectRole,
    public readonly scope: string | null,
    public readonly page: number | undefined,
    public readonly pageSize: number | undefined,
    public readonly status: string | undefined,
    public readonly correlationId: string,
  ) {
    super();
  }
}
