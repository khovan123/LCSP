import { BadRequestException } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import type { Prisma } from "@prisma/client";
import { ORGANIZATION_SCOPE_ERROR_CODES } from "@lcsp/contracts/auth";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import type {
  AuditEventListDto,
  AuditEventSummary,
} from "../../contracts/audit/audit-event-list.contract.js";
import { AuditRedactorService } from "../../services/audit/audit-redactor.service.js";
import { ListAuditEventsQuery } from "./list-audit-events.query.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_DATE_RANGE_MS = 90 * 24 * 60 * 60 * 1_000;

@QueryHandler(ListAuditEventsQuery)
export class ListAuditEventsHandler implements IQueryHandler<ListAuditEventsQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redactor: AuditRedactorService,
  ) {}

  async execute(query: ListAuditEventsQuery): Promise<AuditEventListDto> {
    if (query.organizationId !== query.sessionOrganizationId) {
      this.badRequest(
        ORGANIZATION_SCOPE_ERROR_CODES.mismatch,
        query.correlationId,
      );
    }

    const page = this.positiveInteger(
      query.page,
      DEFAULT_PAGE,
      query.correlationId,
    );
    const requestedPageSize = this.positiveInteger(
      query.pageSize,
      DEFAULT_PAGE_SIZE,
      query.correlationId,
    );
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const fromDate = this.parseDate(
      query.fromDate,
      "from_date",
      query.correlationId,
    );
    const toDate = this.parseDate(query.toDate, "to_date", query.correlationId);

    if (fromDate && toDate) {
      const range = toDate.getTime() - fromDate.getTime();
      if (range < 0) {
        this.badRequest("INVALID_DATE_RANGE", query.correlationId);
      }
      if (range > MAX_DATE_RANGE_MS) {
        this.badRequest("AUDIT_DATE_RANGE_EXCEEDED", query.correlationId);
      }
    }

    const where: Prisma.AuthAuditEventWhereInput = {
      organizationId: query.organizationId,
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.authAuditEvent.count({ where }),
      this.prisma.authAuditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          eventType: true,
          actorId: true,
          organizationId: true,
          decision: true,
          payload: true,
          createdAt: true,
        },
      }),
    ]);

    const events: AuditEventSummary[] = rows.map((row) => ({
      event_id: row.id,
      event_type: row.eventType,
      actor_id: row.actorId,
      organization_id: row.organizationId ?? query.organizationId,
      decision: row.decision,
      payload: this.redactor.redact(row.payload),
      occurred_at: row.createdAt.toISOString(),
    }));

    return {
      events,
      total,
      page,
      page_size: pageSize,
      correlation_id: query.correlationId,
    };
  }

  private positiveInteger(
    value: number | undefined,
    fallback: number,
    correlationId: string,
  ): number {
    if (value === undefined) {
      return fallback;
    }
    if (!Number.isInteger(value) || value < 1) {
      this.badRequest("INVALID_AUDIT_QUERY", correlationId);
    }
    return value;
  }

  private parseDate(
    value: string | undefined,
    field: string,
    correlationId: string,
  ): Date | undefined {
    if (value === undefined) {
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      this.badRequest("INVALID_AUDIT_QUERY", correlationId, field);
    }
    return date;
  }

  private badRequest(
    errorCode: string,
    correlationId: string,
    field?: string,
  ): never {
    throw new BadRequestException({
      error_code: errorCode,
      correlation_id: correlationId,
      ...(field ? { field } : {}),
    });
  }
}
