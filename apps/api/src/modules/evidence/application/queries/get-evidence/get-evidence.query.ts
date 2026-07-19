import { Query } from "@nestjs/cqrs";

import type { EvidenceDetailDto } from "../../contracts/evidence/evidence-detail.contract.js";

export class GetEvidenceQuery extends Query<EvidenceDetailDto> {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly scope: string | null,
    public readonly selectedAction: string | null,
    public readonly correlationId: string,
  ) {
    super();
  }
}
