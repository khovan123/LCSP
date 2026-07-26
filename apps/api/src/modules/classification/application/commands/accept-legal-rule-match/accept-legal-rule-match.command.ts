import type { AcceptLegalRuleMatchDto } from "../../contracts/classification/legal-rule-match-callback.contract.js";

export class AcceptLegalRuleMatchCommand {
  constructor(
    public readonly payload: AcceptLegalRuleMatchDto,
    public readonly correlationId: string,
  ) {}
}
