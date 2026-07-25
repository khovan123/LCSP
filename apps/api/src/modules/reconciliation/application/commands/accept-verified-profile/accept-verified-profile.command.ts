import type { VerifiedProfileCallbackRequest } from "../../contracts/reconciliation/verified-profile-callback.contract.js";

export class AcceptVerifiedProfileCommand {
  constructor(
    readonly payload: VerifiedProfileCallbackRequest,
    readonly correlationId: string,
  ) {}
}
