import type { IQuery } from "@nestjs/cqrs";

export class GetSystemGraphQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly assessmentId: string,
  ) {}
}
