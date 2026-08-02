import { Query } from "@nestjs/cqrs";
import type { ReadinessExportContent } from "@lcsp/contracts/wizard";

import type { ManagerOnlyAuthorizationContext } from "../../commands/save-wizard-draft/save-wizard-draft.command.js";

export class GetReadinessExportQuery extends Query<ReadinessExportContent> {
  constructor(
    public readonly assessmentId: string,
    public readonly exportId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {
    super();
  }
}
