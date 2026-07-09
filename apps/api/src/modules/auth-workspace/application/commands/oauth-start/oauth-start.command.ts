import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { OAuthStartPayload } from "../../contracts/auth-workspace/oauth.contract.ts";

export class OAuthStartCommand {
  readonly payload: OAuthStartPayload;
  readonly requestMeta: RequestMeta;

  constructor(payload: OAuthStartPayload, requestMeta: RequestMeta = {}) {
    this.payload = payload;
    this.requestMeta = requestMeta;
  }
}
