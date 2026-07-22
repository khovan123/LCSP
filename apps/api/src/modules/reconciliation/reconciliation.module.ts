import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptConflictHandler } from "./application/commands/accept-conflict/accept-conflict.handler.js";
import { ListConflictsHandler } from "./application/queries/list-conflicts/list-conflicts.handler.js";
import {
  InternalReconciliationController,
  ReconciliationController,
} from "./presentation/http/reconciliation.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [InternalReconciliationController, ReconciliationController],
  providers: [AcceptConflictHandler, ListConflictsHandler, WorkerApiKeyGuard],
})
export class ReconciliationModule {}
