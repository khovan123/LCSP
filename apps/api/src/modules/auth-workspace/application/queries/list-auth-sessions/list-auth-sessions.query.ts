import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.ts";

export class ListAuthSessionsQuery {
  constructor(public readonly context: PbacRequestContext) {}
}
