import type { ConflictDetectionCallbackRequest } from "../../contracts/reconciliation/conflict-detection-callback.contract.js";

export class AcceptConflictCommand {
  constructor(
    readonly payload: ConflictDetectionCallbackRequest,
    readonly correlationId: string,
  ) {}
}
