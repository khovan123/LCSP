import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { ConfirmRecoveryPayload } from "../../contracts/auth-workspace/recovery.contract.ts";

export class ConfirmPasswordRecoveryCommand {
  constructor(
    public readonly payload: ConfirmRecoveryPayload,
    public readonly requestMeta: RequestMeta,
  ) {}
}
