import { Query } from "@nestjs/cqrs";

import type { AuditEventListDto } from "../../contracts/audit/audit-event-list.contract.js";

export class ListAuditEventsQuery extends Query<AuditEventListDto> {
  constructor(
    public readonly organizationId: string,
    public readonly sessionOrganizationId: string,
    public readonly eventType: string | undefined,
    public readonly actorId: string | undefined,
    public readonly fromDate: string | undefined,
    public readonly toDate: string | undefined,
    public readonly page: number | undefined,
    public readonly pageSize: number | undefined,
    public readonly correlationId: string,
  ) {
    super();
  }
}
