import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { RequestRecoveryPayload } from "../../contracts/auth-workspace/recovery.contract.ts";

export class RequestPasswordRecoveryCommand {
  constructor(
    public readonly payload: RequestRecoveryPayload,
    public readonly requestMeta: RequestMeta,
  ) {}
}
