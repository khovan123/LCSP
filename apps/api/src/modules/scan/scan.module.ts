import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { ProcessScanCallbackHandler } from "./application/commands/process-scan-callback/process-scan-callback.handler.js";
import { GetScanJobHandler } from "./application/queries/get-scan-job/get-scan-job.handler.js";
import { EvidenceSchemaValidatorService } from "./application/services/scan/evidence-schema-validator.service.js";
import {
  InternalScanController,
  InternalTargetedReanalysisController,
  ScanController,
} from "./presentation/http/scan.controller.js";
import { ArchitectureScopeController } from "./presentation/http/architecture-scope.controller.js";
import { WorkspaceRuntimeEventsController } from "./presentation/http/workspace-runtime-events.controller.js";
import { WorkerApiKeyGuard } from "./presentation/http/worker-api-key.guard.js";
import { RerunScanHandler } from "./application/commands/rerun-scan/rerun-scan.handler.js";
import { RequestTargetedReanalysisHandler } from "./application/commands/request-targeted-reanalysis/request-targeted-reanalysis.handler.js";
import { AssessmentRuntimeEventService } from "../../platform/runtime-events/assessment-runtime-event.service.js";
import { EvidenceNormalizerService } from "./application/services/graph/evidence-normalizer.service.js";
import { GraphBuilderService } from "./application/services/graph/graph-builder.service.js";
import { ReconciliationEngineService } from "./application/services/graph/reconciliation-engine.service.js";
import { GetSystemGraphHandler } from "./application/queries/get-system-graph/get-system-graph.handler.js";
import { GetArchitectureScopeQueryHandler } from "./application/queries/get-architecture-scope/get-architecture-scope.query.js";
import { SaveArchitectureScopeCommandHandler } from "./application/commands/save-architecture-scope/save-architecture-scope.command.js";
import { TriggerMultiRepoScanHandler } from "./application/commands/trigger-multi-repo-scan/trigger-multi-repo-scan.handler.js";

/**
 * Wires scan-job reads/reruns, worker callbacks, targeted reanalysis, evidence validation, and workspace runtime-event streaming.
 */
@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [
    ScanController,
    ArchitectureScopeController,
    InternalScanController,
    InternalTargetedReanalysisController,
    WorkspaceRuntimeEventsController,
  ],
  providers: [
    GetScanJobHandler,
    ProcessScanCallbackHandler,
    RerunScanHandler,
    RequestTargetedReanalysisHandler,
    EvidenceSchemaValidatorService,
    WorkerApiKeyGuard,
    AssessmentRuntimeEventService,
    EvidenceNormalizerService,
    GraphBuilderService,
    ReconciliationEngineService,
    GetSystemGraphHandler,
    GetArchitectureScopeQueryHandler,
    SaveArchitectureScopeCommandHandler,
    TriggerMultiRepoScanHandler,
  ],
})
export class ScanModule {}
