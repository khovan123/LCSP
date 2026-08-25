import { Query } from "@nestjs/cqrs";

import type { ConflictListDto } from "../../contracts/reconciliation/conflict-list.contract.js";
import type { SubjectRole } from "../../../../../platform/rbac/rbac.types.js";

export class ListConflictsQuery extends Query<ConflictListDto> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly sessionUserId: string,
    public readonly subjectRole: SubjectRole,
    public readonly page: number | undefined,
    public readonly pageSize: number | undefined,
    public readonly status: string | undefined,
    public readonly correlationId: string,
  ) {
    super();
  }
}
