import type { AcceptClassificationDto } from "../../contracts/classification/classification-result-callback.contract.js";

export class AcceptClassificationCommand {
  constructor(
    public readonly payload: AcceptClassificationDto,
    public readonly correlationId?: string,
  ) {}
}
