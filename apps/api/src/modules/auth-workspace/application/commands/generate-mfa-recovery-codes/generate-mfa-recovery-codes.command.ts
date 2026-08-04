import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";

export class GenerateMfaRecoveryCodesCommand {
  constructor(
    public readonly sessionToken: string,
    public readonly requestMeta: RequestMeta = {},
  ) {}
}
