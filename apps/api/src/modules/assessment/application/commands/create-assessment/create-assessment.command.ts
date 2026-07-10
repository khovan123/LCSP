import { Command } from "@nestjs/cqrs";

import type { CreateAssessmentDto } from "../../contracts/assessment/create-assessment.contract.js";

export class CreateAssessmentCommand extends Command<CreateAssessmentDto> {
  constructor(
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly name: string | undefined,
    public readonly description: string | undefined,
    public readonly correlationId: string,
  ) {
    super();
  }
}
