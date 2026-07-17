import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SaveWizardDraftCommand } from "./save-wizard-draft.command.js";
import type { SaveWizardDraftResponse } from "../../contracts/wizard/wizard-draft.contract.js";
import { WIZARD_PROFILE_REPOSITORY } from "../../ports/persistence/wizard-profile.repository.js";
import type { WizardProfileRepository } from "../../ports/persistence/wizard-profile.repository.js";
import {
  AssessmentNotFoundException,
  WizardAlreadySubmittedException,
} from "../../../domain/exceptions/wizard.exceptions.js";
import { WizardProfileEntity } from "../../../domain/entities/wizard-profile.entity.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { WIZARD_STATUS_CODES } from "@lcsp/contracts/assessment";

@CommandHandler(SaveWizardDraftCommand)
export class SaveWizardDraftHandler implements ICommandHandler<
  SaveWizardDraftCommand,
  SaveWizardDraftResponse
> {
  constructor(
    @Inject(WIZARD_PROFILE_REPOSITORY)
    private readonly wizardRepository: WizardProfileRepository,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(
    command: SaveWizardDraftCommand,
  ): Promise<SaveWizardDraftResponse> {
    const { assessmentId, organizationId, ownerId, answers, correlationId } =
      command;

    // 1. Verify assessment exists and is owned by caller
    const isOwned = await this.wizardRepository.verifyAssessmentOwnership(
      assessmentId,
      organizationId,
      ownerId,
    );
    if (!isOwned) {
      throw new AssessmentNotFoundException();
    }

    // 2. Fetch existing profile or prepare a new one
    let profile = await this.wizardRepository.findByAssessmentId(assessmentId);

    if (profile) {
      if (profile.status === WIZARD_STATUS_CODES.submitted) {
        throw new WizardAlreadySubmittedException();
      }
      profile.answers = { ...profile.answers, ...answers };
      profile.version += 1;
    } else {
      profile = new WizardProfileEntity({
        id: randomUUID(),
        assessmentId,
        organizationId,
        ownerId,
        version: 1,
        status: WIZARD_STATUS_CODES.inProgress,
        answers,
      });
    }

    // 3. Upsert draft to DB
    const savedProfile = await this.wizardRepository.upsertDraft(profile);

    // 4. Audit logging
    await this.auditWriter.write({
      eventType: "WIZARD_DRAFT_SAVED",
      actorId: ownerId,
      organizationId,
      resourceType: "wizard_profile",
      resourceId: savedProfile.id,
      decision: "allow",
      payload: {
        assessmentId,
        wizardProfileId: savedProfile.id,
        version: savedProfile.version,
      },
      correlationId,
    });

    // 5. Map response
    return {
      wizard_profile_id: savedProfile.id,
      status: savedProfile.status,
      version: savedProfile.version,
      updated_at: savedProfile.updatedAt.toISOString(),
      correlation_id: correlationId,
    };
  }
}
