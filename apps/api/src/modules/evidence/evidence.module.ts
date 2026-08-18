import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { AssessmentRuntimeEventService } from "../../platform/runtime-events/assessment-runtime-event.service.js";
import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptTechnicalProfileHandler } from "./application/commands/accept-technical-profile/accept-technical-profile.handler.js";
import { GetEvidenceGraphHandler } from "./application/queries/get-evidence-graph/get-evidence-graph.handler.js";
import { GetEvidenceHandler } from "./application/queries/get-evidence/get-evidence.handler.js";
import { EvidenceRedactorService } from "./application/services/evidence/evidence-redactor.service.js";
import { PythonWorkerRuntimeClient } from "./application/services/evidence/python-worker-runtime.client.js";
import { ClusterBuilderService } from "./application/services/graph/cluster-builder.service.js";
import { EvidenceGraphMapperService } from "./application/services/graph/evidence-graph-mapper.service.js";
import { EvidenceGraphRedactorService } from "./application/services/graph/evidence-graph-redactor.service.js";
import { InternalAgenticToolDispatchController } from "./presentation/http/agentic-tool-dispatch.controller.js";
import {
  EvidenceController,
  InternalEvidenceController,
} from "./presentation/http/evidence.controller.js";

/**
 * Nest evidence module owns persistence/read boundaries only. Program graph traversal,
 * data/decision analysis, provider discovery and remediation processing execute in the
 * Python worker and therefore are intentionally not registered as Nest CQRS handlers.
 */
@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [
    EvidenceController,
    InternalEvidenceController,
    InternalAgenticToolDispatchController,
  ],
  providers: [
    GetEvidenceHandler,
    GetEvidenceGraphHandler,
    AcceptTechnicalProfileHandler,
    EvidenceRedactorService,
    EvidenceGraphMapperService,
    EvidenceGraphRedactorService,
    ClusterBuilderService,
    PythonWorkerRuntimeClient,
    WorkerApiKeyGuard,
    AssessmentRuntimeEventService,
  ],
})
export class EvidenceModule {}
