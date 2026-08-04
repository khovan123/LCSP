import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { MfaRecoveryCodeAccessAction } from "../../contracts/auth-workspace/mfa.contract.ts";

export class RecordMfaRecoveryCodeAccessCommand {
  constructor(
    public readonly sessionToken: string,
    public readonly action: MfaRecoveryCodeAccessAction,
    public readonly requestMeta: RequestMeta = {},
  ) {}
}
