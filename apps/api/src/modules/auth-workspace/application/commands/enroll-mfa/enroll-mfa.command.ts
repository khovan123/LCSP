import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";

export class EnrollMfaCommand {
  constructor(
    public readonly sessionToken: string,
    public readonly requestMeta: RequestMeta,
  ) {}
}
