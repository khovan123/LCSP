import * as crypto from "node:crypto";

import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  AUDIT_DECISIONS,
  AUDIT_REDACTION_STATUSES,
} from "@lcsp/contracts/audit";
import { buildOutboxMessageInput } from "@lcsp/contracts/outbox";
import {
  CLASSIFICATION_GUARDRAIL_STATUSES,
  CLASSIFICATION_RESULT_SCHEMA_VERSIONS,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
} from "@lcsp/contracts/scan";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import type { ClassificationResultCallbackResponseDto } from "../../contracts/classification/classification-result-callback.contract.js";
import { OverclaimGuardrailService } from "../../services/classification/overclaim-guardrail.service.js";
import { AcceptClassificationCommand } from "./accept-classification.command.js";

const CLASSIFICATION_WORKER_ACTOR_ID = "classification-result-worker";

@CommandHandler(AcceptClassificationCommand)
export class AcceptClassificationHandler implements ICommandHandler<AcceptClassificationCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly outboxRepository: OutboxRepository,
    private readonly overclaimGuardrail: OverclaimGuardrailService,
  ) {}

  async execute(
    command: AcceptClassificationCommand,
  ): Promise<ClassificationResultCallbackResponseDto> {
    this.validate(command);

    const payload = command.payload;

    this.overclaimGuardrail.validate(
      payload.classification_data,
      command.correlationId,
    );

    const verifiedProfile = await this.prisma.verifiedProfile.findFirst({
      where: {
        id: payload.verified_profile_id,
        assessmentId: payload.assessment_id,
      },
      select: {
        id: true,
        assessmentId: true,
        organizationId: true,
      },
    });

    if (!verifiedProfile) {
      throw new NotFoundException(
        this.errorBody(command, SCAN_ERROR_CODES.verifiedProfileNotFound),
      );
    }

    const legalRuleMatch = await this.prisma.legalRuleMatch.findFirst({
      where: {
        id: payload.legal_rule_match_id,
        assessmentId: payload.assessment_id,
        verifiedProfileId: payload.verified_profile_id,
      },
      select: {
        id: true,
        assessmentId: true,
        guardrailStatus: true,
      },
    });

    if (!legalRuleMatch) {
      throw new NotFoundException(
        this.errorBody(command, SCAN_ERROR_CODES.legalRuleMatchNotFound),
      );
    }

    if (legalRuleMatch.guardrailStatus === "blocked") {
      throw new UnprocessableEntityException(
        this.errorBody(command, SCAN_ERROR_CODES.legalRuleMatchNotFound),
      );
    }

    const existingResult = await this.prisma.classificationResult.findUnique({
      where: { legalRuleMatchId: payload.legal_rule_match_id },
      select: { id: true },
    });

    if (existingResult) {
      throw new ConflictException(
        this.errorBody(command, SCAN_ERROR_CODES.resultAlreadyExists),
      );
    }

    const classificationResultId = crypto.randomUUID();
    const guardrailStatus = payload.guardrail_status;
    const blockedReason =
      guardrailStatus === CLASSIFICATION_GUARDRAIL_STATUSES.blocked
        ? "CITATION_BASIS_MISSING"
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.classificationResult.create({
        data: {
          id: classificationResultId,
          legalRuleMatchId: payload.legal_rule_match_id,
          verifiedProfileId: payload.verified_profile_id,
          assessmentId: payload.assessment_id,
          organizationId: verifiedProfile.organizationId,
          schemaVersion: payload.schema_version,
          classificationData: payload.classification_data as Prisma.InputJsonValue,
          guardrailStatus,
          blockedReason,
          status: "accepted",
        },
      });

      await this.enqueueReadyEvent(
        command,
        tx,
        verifiedProfile,
        classificationResultId,
        guardrailStatus,
      );

      await this.writeAuditLog(
        command,
        tx,
        verifiedProfile,
        classificationResultId,
        guardrailStatus,
        blockedReason,
      );
    });

    return {
      accepted: true,
      classification_result_id: classificationResultId,
      guardrail_status: guardrailStatus,
      correlation_id: command.correlationId,
    };
  }

  private validate(command: AcceptClassificationCommand): void {
    const payload = command.payload;
    if (
      !isRecord(payload) ||
      !clean(payload.legal_rule_match_id) ||
      !clean(payload.verified_profile_id) ||
      !clean(payload.assessment_id) ||
      !CLASSIFICATION_RESULT_SCHEMA_VERSIONS.includes(
        payload.schema_version as (typeof CLASSIFICATION_RESULT_SCHEMA_VERSIONS)[number],
      ) ||
      !isRecord(payload.classification_data) ||
      !Object.values(CLASSIFICATION_GUARDRAIL_STATUSES).includes(
        payload.guardrail_status as (typeof CLASSIFICATION_GUARDRAIL_STATUSES)[keyof typeof CLASSIFICATION_GUARDRAIL_STATUSES],
      )
    ) {
      throw new UnprocessableEntityException(
        this.errorBody(command, SCAN_ERROR_CODES.classificationSchemaInvalid),
      );
    }
  }

  private async enqueueReadyEvent(
    command: AcceptClassificationCommand,
    tx: Prisma.TransactionClient,
    verifiedProfile: {
      id: string;
      assessmentId: string;
      organizationId: string;
    },
    classificationResultId: string,
    guardrailStatus: string,
  ): Promise<void> {
    const correlationId = command.correlationId || classificationResultId;
    const message = buildOutboxMessageInput({
      aggregateType: "ClassificationResult",
      aggregateId: classificationResultId,
      eventType: SCAN_EVENT_TYPES.classificationResultReady,
      organizationId: verifiedProfile.organizationId,
      assessmentId: verifiedProfile.assessmentId,
      correlationId,
      causationId: verifiedProfile.id,
      actor: { id: CLASSIFICATION_WORKER_ACTOR_ID, type: "service" },
      result: SCAN_EVENT_TYPES.classificationResultReady,
      redactionStatus: AUDIT_REDACTION_STATUSES.none,
      idempotencyKey: `${classificationResultId}:${SCAN_EVENT_TYPES.classificationResultReady}`,
      payload: {
        classificationResultId,
        assessmentId: verifiedProfile.assessmentId,
        guardrailStatus,
        correlationId,
      },
    });

    await this.outboxRepository.enqueue(message, tx);
  }

  private async writeAuditLog(
    command: AcceptClassificationCommand,
    tx: Prisma.TransactionClient,
    verifiedProfile: {
      id: string;
      assessmentId: string;
      organizationId: string;
    },
    classificationResultId: string,
    guardrailStatus: string,
    blockedReason: string | null,
  ): Promise<void> {
    const isBlocked =
      guardrailStatus === CLASSIFICATION_GUARDRAIL_STATUSES.blocked;

    const auditEventType = isBlocked
      ? SCAN_EVENT_TYPES.classificationBlockedAudit
      : SCAN_EVENT_TYPES.classificationAcceptedAudit;

    const correlationId = command.correlationId || classificationResultId;

    await this.auditWriter.writeInTx(
      {
        eventType: auditEventType,
        actorId: CLASSIFICATION_WORKER_ACTOR_ID,
        organizationId: verifiedProfile.organizationId,
        assessmentId: verifiedProfile.assessmentId,
        resourceType: "ClassificationResult",
        resourceId: classificationResultId,
        correlationId,
        causationId: verifiedProfile.id,
        decision: isBlocked ? AUDIT_DECISIONS.deny : AUDIT_DECISIONS.allow,
        result: auditEventType,
        redactionStatus: AUDIT_REDACTION_STATUSES.none,
        actor: { id: CLASSIFICATION_WORKER_ACTOR_ID, type: "service" },
        payload: {
          assessmentId: verifiedProfile.assessmentId,
          guardrailStatus,
          blockedReason,
          correlationId,
        },
      },
      tx,
    );
  }

  private errorBody(command: AcceptClassificationCommand, errorCode: string) {
    return {
      error_code: String(errorCode),
      correlation_id: command.correlationId,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
