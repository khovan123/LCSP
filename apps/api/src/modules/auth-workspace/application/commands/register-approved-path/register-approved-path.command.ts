import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { RegisterPayload } from "../../contracts/auth-workspace/register-approved-path.contract.ts";

export class RegisterApprovedPathCommand {
  readonly payload: RegisterPayload;
  readonly requestMeta: RequestMeta;

  constructor(
    payload: RegisterPayload,
    requestMeta: RequestMeta = {},
  ) {
    this.payload = payload;
    this.requestMeta = requestMeta;
  }
}
