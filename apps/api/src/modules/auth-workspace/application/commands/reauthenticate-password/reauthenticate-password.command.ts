import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { PasswordReauthPayload } from "../../contracts/auth-workspace/password-reauth.contract.ts";

export class ReauthenticatePasswordCommand {
  constructor(
    public readonly password: string,
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly requestMeta: RequestMeta = {},
  ) {}
}
