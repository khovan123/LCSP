import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptConflictHandler } from "./application/commands/accept-conflict/accept-conflict.handler.js";
import { InternalReconciliationController } from "./presentation/http/reconciliation.controller.js";

@Module({
  imports: [CqrsModule],
  controllers: [InternalReconciliationController],
  providers: [AcceptConflictHandler, WorkerApiKeyGuard],
})
export class ReconciliationModule {}
