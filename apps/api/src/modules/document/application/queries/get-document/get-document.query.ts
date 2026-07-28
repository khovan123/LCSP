import { Query } from "@nestjs/cqrs";

import type { DocumentStatusDto } from "../../contracts/document/document-status.contract.js";

export class GetDocumentQuery extends Query<DocumentStatusDto> {
  constructor(
    public readonly assessmentId: string,
    public readonly documentRequestId: string,
    public readonly organizationId: string,
    public readonly scope: string | null,
    public readonly selectedAction: string | null,
    public readonly correlationId: string,
  ) {
    super();
  }
}
