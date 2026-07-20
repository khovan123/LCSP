import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.ts";

export class GetDeveloperTaskContextQuery {
  constructor(
    readonly context: PbacRequestContext,
    readonly correlationId: string,
  ) {}
}
