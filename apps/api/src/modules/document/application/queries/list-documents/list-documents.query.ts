import { Query } from "@nestjs/cqrs";

export class ListDocumentsQuery extends Query<unknown[]> {
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
