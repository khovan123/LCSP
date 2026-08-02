import { Query } from "@nestjs/cqrs";
import type { ReadinessExportHistoryItem } from "@lcsp/contracts/wizard";

import type { ManagerOnlyAuthorizationContext } from "../../commands/save-wizard-draft/save-wizard-draft.command.js";

export class ListReadinessExportsQuery extends Query<
  ReadinessExportHistoryItem[]
> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {
    super();
  }
}
