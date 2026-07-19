import type { ScanCallbackRequest } from "../../contracts/scan/scan-callback.contract.js";

export class ProcessScanCallbackCommand {
  constructor(
    public readonly scanJobId: string,
    public readonly payload: ScanCallbackRequest,
    public readonly correlationId: string,
  ) {}
}
