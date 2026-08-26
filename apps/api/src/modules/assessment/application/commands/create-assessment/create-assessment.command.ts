import { Command } from "@nestjs/cqrs";
import type { AuthUserRole } from "@lcsp/contracts/auth";

import type { CreateAssessmentDto } from "../../contracts/assessment/create-assessment.contract.js";

export type AssessmentCreateAuthorizationContext = {
  subjectRole: AuthUserRole;
  selectedAction: string | null;
};

/**
 * Carries assessment-creation input together with the RBAC decision context required for the owner-created operation.
 */
export class CreateAssessmentCommand extends Command<CreateAssessmentDto> {
  /**
   * Creates an assessment-creation command.
   *
   * @param ownerId - Authenticated user who will own the assessment.
   * @param name - Requested assessment name.
   * @param description - Optional assessment description.
   * @param correlationId - Correlation identifier propagated to audit, outbox, and response metadata.
   * @param authorization - RBAC role and selected action used to authorize the mutation.
   */
  constructor(
    public readonly ownerId: string,
    public readonly name: string | undefined,
    public readonly description: string | undefined,
    public readonly correlationId: string,
    public readonly authorization: AssessmentCreateAuthorizationContext,
  ) {
    super();
  }
}
