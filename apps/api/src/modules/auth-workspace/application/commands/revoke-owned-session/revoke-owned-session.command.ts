import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.ts";
import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";

export class RevokeOwnedSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly context: PbacRequestContext,
    public readonly requestMeta: RequestMeta = {},
  ) {}
}
