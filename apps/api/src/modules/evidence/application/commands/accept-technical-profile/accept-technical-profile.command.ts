import type { TechnicalProfileCallbackRequest } from "../../contracts/evidence/technical-profile-callback.contract.js";

export class AcceptTechnicalProfileCommand {
  constructor(
    readonly payload: TechnicalProfileCallbackRequest,
    readonly correlationId: string,
  ) {}
}
