import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.js";

export class RerunScanCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly snapshotId: string,
    public readonly idempotencyKey: string,
    public readonly pbacContext: PbacRequestContext,
    public readonly correlationId: string,
    public readonly reason?: string,
  ) {}
}
