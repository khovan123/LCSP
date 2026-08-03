import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.ts";

export class GetAuthProfileQuery {
  constructor(
    public readonly context: PbacRequestContext,
    public readonly correlationId: string,
  ) {}
}
