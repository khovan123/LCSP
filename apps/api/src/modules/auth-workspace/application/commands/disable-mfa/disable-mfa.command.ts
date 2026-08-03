import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";

export class DisableMfaCommand {
  constructor(
    readonly sessionToken: string,
    readonly requestMeta: RequestMeta = {},
  ) {}
}
