import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { ListAuditEventsHandler } from "./application/queries/list-audit-events/list-audit-events.handler.js";
import { AuditRedactorService } from "./application/services/audit/audit-redactor.service.js";
import { AuditController } from "./presentation/http/audit.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [AuditController],
  providers: [ListAuditEventsHandler, AuditRedactorService],
})
export class AuditModule {}
