import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import type { Request } from "express";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { ListAuditEventsQuery } from "../../application/queries/list-audit-events/list-audit-events.query.js";

interface AuditRequest extends Request {
  pbacContext?: PbacRequestContext;
  correlationId?: string;
}

@Controller("organizations/:orgId/audit-events")
export class AuditController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @UseGuards(PbacGuard)
  @RequireAction("audit:read")
  async listAuditEvents(
    @Param("orgId") organizationId: string,
    @Query("event_type") eventType: string | undefined,
    @Query("actor_id") actorId: string | undefined,
    @Query("from_date") fromDate: string | undefined,
    @Query("to_date") toDate: string | undefined,
    @Query("page") page: string | undefined,
    @Query("page_size") pageSize: string | undefined,
    @Req() request: AuditRequest,
  ) {
    const context = request.pbacContext as PbacRequestContext;

    return this.queryBus.execute(
      new ListAuditEventsQuery(
        organizationId,
        context.organizationId,
        eventType,
        actorId,
        fromDate,
        toDate,
        page === undefined ? undefined : Number(page),
        pageSize === undefined ? undefined : Number(pageSize),
        request.correlationId as string,
      ),
    );
  }
}
