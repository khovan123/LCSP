import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import {
  INTERVIEW_AUDIT_EVENT_TYPES,
  type InterviewAuditEventType,
  type InterviewAuditTrailItem,
  type InterviewAuditTrailResponse,
} from "@lcsp/contracts/audit";
import { HttpStatus, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { cleanString, isRecord } from "../../../../../common/utils/type-guards.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AuditRedactorService } from "../../services/audit/audit-redactor.service.js";
import { GetInterviewAuditTrailQuery } from "./get-interview-audit-trail.query.js";

/**
 * Handles retrieval of the chronological Interview audit trail and material provenance for an assessment.
 *
 * Enforces Tenant/Assessment Isolation:
 * - Verifies the assessment exists.
 * - Enforces that CUSTOMER subjects can only view assessments they own.
 * - Admin subjects can view any assessment within their authorized scope.
 */
@Injectable()
@QueryHandler(GetInterviewAuditTrailQuery)
export class GetInterviewAuditTrailHandler
  implements IQueryHandler<GetInterviewAuditTrailQuery, InterviewAuditTrailResponse>
{
  /**
   * Creates the query handler with Prisma and redactor dependencies.
   *
   * @param prisma Database service for querying assessments and audit records.
   * @param redactor Service applying secret redaction rules to audit payloads.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly redactor: AuditRedactorService,
  ) {}

  /**
   * Executes the query to fetch, filter, and normalize the interview audit trail.
   *
   * @param query Query containing assessment ID and caller security context.
   * @returns Chronological list of interview audit events.
   */
  async execute(
    query: GetInterviewAuditTrailQuery,
  ): Promise<InterviewAuditTrailResponse> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: query.assessmentId },
      select: { id: true, ownerId: true },
    });

    if (!assessment) {
      this.throwNotFound(query.correlationId);
    }

    if (
      query.subjectRole === AUTH_USER_ROLES.customer &&
      assessment.ownerId !== query.sessionUserId
    ) {
      this.throwNotFound(query.correlationId);
    }

    const eventTypes = Object.values(INTERVIEW_AUDIT_EVENT_TYPES);

    const auditRows = await this.prisma.auditEvent.findMany({
      where: {
        resourceId: query.assessmentId,
        eventType: { in: eventTypes },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        eventType: true,
        actorId: true,
        payload: true,
        createdAt: true,
      },
    });

    const events: InterviewAuditTrailItem[] = auditRows.map((row) => {
      const redactedPayload = this.redactor.redact(row.payload) ?? {};
      const payloadRecord = isRecord(redactedPayload) ? redactedPayload : {};

      const respondent = isRecord(payloadRecord.respondentRef)
        ? payloadRecord.respondentRef
        : isRecord(payloadRecord.actor)
          ? payloadRecord.actor
          : null;

      const actorRole = cleanString(respondent?.role);
      const actorName = cleanString(respondent?.name);

      const revision =
        cleanString(payloadRecord.interviewContextRevision) ??
        cleanString(payloadRecord.newRevision) ??
        "1";

      const evidenceRefs = Array.isArray(payloadRecord.evidenceRefs)
        ? payloadRecord.evidenceRefs
            .filter((e): e is string => typeof e === "string")
            .map((e) => e.trim())
            .filter(Boolean)
        : [];

      const isConflict =
        row.eventType === INTERVIEW_AUDIT_EVENT_TYPES.contextConflicted;

      return {
        id: row.id,
        eventType: row.eventType as InterviewAuditEventType,
        actorId: row.actorId,
        actorRole,
        actorName,
        assessmentId: query.assessmentId,
        interviewContextRevision: revision,
        statementKey: cleanString(payloadRecord.statementKey) ?? undefined,
        statementValue: payloadRecord.statementValue ?? payloadRecord.newValue,
        priorValue: payloadRecord.priorValue,
        priorRevision: cleanString(payloadRecord.priorRevision) ?? undefined,
        isConflict,
        questionId: cleanString(payloadRecord.questionId) ?? undefined,
        evidenceRefs,
        originatingInvestigationReference: cleanString(
          payloadRecord.originatingInvestigationReference,
        ),
        downstreamImpact:
          row.eventType === INTERVIEW_AUDIT_EVENT_TYPES.downstreamImpactEmitted ||
          Boolean(payloadRecord.downstreamImpact),
        occurredAt: row.createdAt.toISOString(),
      };
    });

    return {
      assessmentId: query.assessmentId,
      events,
      total: events.length,
    };
  }

  /**
   * Throws a standardized 404 NOT_FOUND problem for isolation failures.
   */
  private throwNotFound(correlationId: string): never {
    throw problemException(ASSESSMENT_ERROR_CODES.notFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
}

