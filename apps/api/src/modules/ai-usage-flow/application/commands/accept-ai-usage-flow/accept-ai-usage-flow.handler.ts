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
  buildAuditEventInput,
} from "@lcsp/contracts/audit";
import { buildOutboxMessageInput } from "@lcsp/contracts/outbox";
import {
  AI_USAGE_FLOW_SCHEMA_VERSIONS,
  AI_USAGE_FLOW_STATUSES,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
  TECHNICAL_PROFILE_STATUSES,
} from "@lcsp/contracts/scan";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import type {
  AIUsageFlowCallbackDto,
  AIUsageFlowClaimRequest,
} from "../../contracts/ai-usage-flow/ai-usage-flow-callback.contract.js";
import { AcceptAIUsageFlowCommand } from "./accept-ai-usage-flow.command.js";

const AI_USAGE_FLOW_WORKER_ACTOR_ID = "ai-usage-flow-worker";
const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "codesnippet",
  "filecontent",
  "fullastbody",
  "fullprompt",
  "rawoutput",
  "rawsource",
  "rawsourcecode",
  "snippet",
  "sourcecode",
  "sourcecontent",
]);
const SECRET_PATTERNS = [
  /\bgh[oprsu]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-ant-[A-Za-z0-9_-]{16,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/i,
];

@CommandHandler(AcceptAIUsageFlowCommand)
export class AcceptAIUsageFlowHandler implements ICommandHandler<AcceptAIUsageFlowCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: AcceptAIUsageFlowCommand,
  ): Promise<AIUsageFlowCallbackDto> {
    this.validate(command);

    const payload = command.payload;
    const technicalProfile = await this.prisma.technicalProfile.findFirst({
      where: {
        id: payload.technical_profile_id,
        assessmentId: payload.assessment_id,
        status: TECHNICAL_PROFILE_STATUSES.accepted,
      },
      select: {
        id: true,
        assessmentId: true,
        organizationId: true,
      },
    });
    if (!technicalProfile) {
      throw new NotFoundException(
        this.errorBody(command, SCAN_ERROR_CODES.technicalProfileNotFound),
      );
    }

    const existing = await this.prisma.aIUsageFlow.findUnique({
      where: { technicalProfileId: technicalProfile.id },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        this.errorBody(command, SCAN_ERROR_CODES.aiUsageFlowAlreadyExists),
      );
    }

    const aiUsageFlowId = crypto.randomUUID();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.aIUsageFlow.create({
          data: {
            id: aiUsageFlowId,
            technicalProfileId: technicalProfile.id,
            assessmentId: technicalProfile.assessmentId,
            organizationId: technicalProfile.organizationId,
            schemaVersion: payload.schema_version,
            providerVersion: payload.provider_version,
            claims: payload.claims as unknown as Prisma.InputJsonValue,
            unknownUsages:
              payload.unknown_usages as unknown as Prisma.InputJsonValue,
            privacyFlags: payload.privacy_flags as Prisma.InputJsonValue,
            status: AI_USAGE_FLOW_STATUSES.accepted,
          },
        });

        const outboxEvent = buildOutboxMessageInput({
          aggregateType: "AIUsageFlow",
          aggregateId: aiUsageFlowId,
          eventType: SCAN_EVENT_TYPES.aiUsageFlowReady,
          organizationId: technicalProfile.organizationId,
          assessmentId: technicalProfile.assessmentId,
          correlationId: command.correlationId,
          causationId: technicalProfile.id,
          actor: { id: AI_USAGE_FLOW_WORKER_ACTOR_ID, type: "service" },
          result: SCAN_EVENT_TYPES.aiUsageFlowAcceptedAudit,
          redactionStatus: AUDIT_REDACTION_STATUSES.none,
          idempotencyKey: `${aiUsageFlowId}:${SCAN_EVENT_TYPES.aiUsageFlowReady}`,
          payload: {
            aiUsageFlowId,
            assessmentId: technicalProfile.assessmentId,
            technicalProfileId: technicalProfile.id,
            correlationId: command.correlationId,
          },
        });
        await tx.outboxMessage.create({
          data: {
            id: crypto.randomUUID(),
            aggregateType: outboxEvent.aggregateType,
            aggregateId: outboxEvent.aggregateId,
            eventType: outboxEvent.eventType,
            payload: outboxEvent.payload as Prisma.InputJsonValue,
          },
        });

        const auditEvent = buildAuditEventInput({
          eventType: SCAN_EVENT_TYPES.aiUsageFlowAcceptedAudit,
          actorId: AI_USAGE_FLOW_WORKER_ACTOR_ID,
          organizationId: technicalProfile.organizationId,
          assessmentId: technicalProfile.assessmentId,
          resourceType: "AIUsageFlow",
          resourceId: aiUsageFlowId,
          correlationId: command.correlationId,
          causationId: technicalProfile.id,
          decision: AUDIT_DECISIONS.allow,
          result: SCAN_EVENT_TYPES.aiUsageFlowAcceptedAudit,
          redactionStatus: AUDIT_REDACTION_STATUSES.none,
          actor: { id: AI_USAGE_FLOW_WORKER_ACTOR_ID, type: "service" },
          payload: {
            aiUsageFlowId,
            assessmentId: technicalProfile.assessmentId,
            technicalProfileId: technicalProfile.id,
            correlationId: command.correlationId,
          },
        });
        await tx.authAuditEvent.create({
          data: {
            id: crypto.randomUUID(),
            eventType: auditEvent.eventType,
            actorId: auditEvent.actorId,
            organizationId: auditEvent.organizationId,
            resourceType: auditEvent.resourceType ?? null,
            resourceId: auditEvent.resourceId ?? null,
            correlationId: auditEvent.correlationId,
            reasonCode: auditEvent.reasonCode ?? null,
            decision: auditEvent.decision,
            payload: auditEvent.payload as Prisma.InputJsonValue,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          this.errorBody(command, SCAN_ERROR_CODES.aiUsageFlowAlreadyExists),
        );
      }
      throw error;
    }

    return {
      accepted: true,
      ai_usage_flow_id: aiUsageFlowId,
      correlation_id: command.correlationId,
    };
  }

  private validate(command: AcceptAIUsageFlowCommand): void {
    const payload = command.payload;
    if (
      !isRecord(payload) ||
      !clean(payload.technical_profile_id) ||
      !clean(payload.assessment_id) ||
      !AI_USAGE_FLOW_SCHEMA_VERSIONS.includes(
        payload.schema_version as (typeof AI_USAGE_FLOW_SCHEMA_VERSIONS)[number],
      ) ||
      !clean(payload.provider_version) ||
      !Array.isArray(payload.claims) ||
      !payload.claims.every(isClaim) ||
      !Array.isArray(payload.unknown_usages) ||
      !payload.unknown_usages.every(isRecord) ||
      !isRecord(payload.privacy_flags)
    ) {
      throw new UnprocessableEntityException(
        this.errorBody(command, SCAN_ERROR_CODES.aiUsageFlowSchemaInvalid),
      );
    }

    if (payload.claims.some(isMaterialClaimMissingEvidence)) {
      throw new UnprocessableEntityException(
        this.errorBody(command, SCAN_ERROR_CODES.claimMissingEvidenceRef),
      );
    }

    if (
      payload.privacy_flags.containsSourceCode !== false ||
      payload.privacy_flags.secretsRedacted !== true ||
      containsUnsafePayload(payload.claims) ||
      containsUnsafePayload(payload.unknown_usages)
    ) {
      throw new UnprocessableEntityException(
        this.errorBody(command, SCAN_ERROR_CODES.privacyFlagsInvalid),
      );
    }
  }

  private errorBody(command: AcceptAIUsageFlowCommand, errorCode: string) {
    return {
      error_code: errorCode,
      correlation_id: command.correlationId,
    };
  }
}

function isClaim(value: unknown): value is AIUsageFlowClaimRequest {
  if (!isRecord(value)) return false;
  return (
    Boolean(clean(value.claim_id)) &&
    Boolean(clean(value.claim_type)) &&
    Boolean(clean(value.confidence)) &&
    Array.isArray(value.evidence_refs) &&
    value.evidence_refs.every((entry) => Boolean(clean(entry))) &&
    (typeof value.uncertainty_reason === "string" ||
      value.uncertainty_reason === null) &&
    Boolean(clean(value.description)) &&
    typeof value.is_material === "boolean"
  );
}

function isMaterialClaimMissingEvidence(
  claim: AIUsageFlowClaimRequest,
): boolean {
  return claim.is_material && claim.evidence_refs.length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function containsUnsafePayload(value: unknown): boolean {
  if (typeof value === "string") {
    return SECRET_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (Array.isArray(value)) {
    return value.some(containsUnsafePayload);
  }
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, entry]) => {
    const normalizedKey = key.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    return (
      FORBIDDEN_PAYLOAD_KEYS.has(normalizedKey) || containsUnsafePayload(entry)
    );
  });
}
