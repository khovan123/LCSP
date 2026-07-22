import { Command } from "@nestjs/cqrs";
import type { SubjectRole } from "@lcsp/contracts/pbac";

import type { CreateAssessmentDto } from "../../contracts/assessment/create-assessment.contract.js";

export type ManagerOnlyAuthorizationContext = {
  subjectRole: SubjectRole;
  selectedAction: string | null;
  policyId: string | null;
  policyVersion: string | null;
};

export class CreateAssessmentCommand extends Command<CreateAssessmentDto> {
  constructor(
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly name: string | undefined,
    public readonly description: string | undefined,
    public readonly correlationId: string,
    public readonly authorization: ManagerOnlyAuthorizationContext,
  ) {
    super();
  }
}
