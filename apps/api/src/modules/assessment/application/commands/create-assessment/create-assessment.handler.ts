import { Inject, UnprocessableEntityException } from "@nestjs/common";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";

import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { Assessment } from "../../../domain/entities/assessment.entity.js";
import { AssessmentMapper } from "../../mappers/assessment.mapper.js";
import {
  ASSESSMENT_REPOSITORY,
  type AssessmentRepository,
} from "../../ports/persistence/assessment.repository.js";
import type { CreateAssessmentDto } from "../../contracts/assessment/create-assessment.contract.js";
import { CreateAssessmentCommand } from "./create-assessment.command.js";

const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 1000;

@CommandHandler(CreateAssessmentCommand)
export class CreateAssessmentHandler implements ICommandHandler<CreateAssessmentCommand> {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY)
    private readonly assessmentRepository: AssessmentRepository,
    private readonly auditWriter: AuditWriterService,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(
    command: CreateAssessmentCommand,
  ): Promise<CreateAssessmentDto> {
    this.assertValid(command);

    const assessment = Assessment.create({
      organizationId: command.organizationId,
      ownerId: command.ownerId,
      name: command.name as string,
      description: command.description,
    });

    await this.assessmentRepository.save(assessment);

    await this.auditWriter.write({
      eventType: "ASSESSMENT_CREATED",
      actorId: assessment.ownerId,
      organizationId: assessment.organizationId,
      resourceType: "Assessment",
      resourceId: assessment.id,
      correlationId: command.correlationId,
      decision: "allow",
      payload: {
        assessmentId: assessment.id,
        organizationId: assessment.organizationId,
        ownerId: assessment.ownerId,
        correlationId: command.correlationId,
      },
    });

    await this.outboxRepository.enqueue({
      aggregateType: "Assessment",
      aggregateId: assessment.id,
      eventType: "assessment.created",
      payload: {
        assessmentId: assessment.id,
        organizationId: assessment.organizationId,
        ownerId: assessment.ownerId,
        status: assessment.status,
        correlationId: command.correlationId,
      },
    });

    return AssessmentMapper.toCreateDto(assessment, command.correlationId);
  }

  private assertValid(command: CreateAssessmentCommand): void {
    const name = command.name?.trim() ?? "";
    const nameInvalid = name.length === 0 || name.length > NAME_MAX_LENGTH;
    const descriptionInvalid =
      (command.description?.length ?? 0) > DESCRIPTION_MAX_LENGTH;

    if (nameInvalid || descriptionInvalid) {
      throw new UnprocessableEntityException({
        error_code: "INVALID_REQUEST",
        correlation_id: command.correlationId,
      });
    }
  }
}
