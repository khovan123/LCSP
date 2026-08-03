import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.ts";

export class ListAuthRepositoriesQuery {
  constructor(public readonly context: PbacRequestContext) {}
}
