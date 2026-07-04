import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";

export type UpdateProfilePayload = {
  session_token?: string;
  display_name?: string;
  recovery_email?: string;
};

export class UpdateProfileCommand {
  constructor(
    public readonly payload: UpdateProfilePayload,
    public readonly requestMeta: RequestMeta,
  ) {}
}
