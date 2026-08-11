import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptTechnicalProfileHandler } from "./application/commands/accept-technical-profile/accept-technical-profile.handler.js";
import { GetEvidenceHandler } from "./application/queries/get-evidence/get-evidence.handler.js";
import { GetFindingDetailHandler } from "./application/queries/get-finding-detail/get-finding-detail.handler.js";
import { SearchEvidenceHandler } from "./application/queries/search-evidence/search-evidence.handler.js";
import { FindProviderInvocationsHandler } from "./application/queries/find-provider-invocations/find-provider-invocations.handler.js";
import { GetEvidenceSubgraphHandler } from "./application/queries/get-evidence-subgraph/get-evidence-subgraph.handler.js";
import { GetSymbolContextHandler } from "./application/queries/get-symbol-context/get-symbol-context.handler.js";
import { TraceStaticFlowHandler } from "./application/queries/trace-static-flow/trace-static-flow.handler.js";
import { InspectHumanReviewPathHandler } from "./application/queries/inspect-human-review-path/inspect-human-review-path.handler.js";
import { EvidenceRedactorService } from "./application/services/evidence/evidence-redactor.service.js";
import {
  EvidenceController,
  InternalEvidenceController,
} from "./presentation/http/evidence.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [EvidenceController, InternalEvidenceController],
  providers: [
    GetEvidenceHandler,
    GetFindingDetailHandler,
    SearchEvidenceHandler,
    FindProviderInvocationsHandler,
    GetEvidenceSubgraphHandler,
    GetSymbolContextHandler,
    TraceStaticFlowHandler,
    InspectHumanReviewPathHandler,
    AcceptTechnicalProfileHandler,
    EvidenceRedactorService,
    WorkerApiKeyGuard,
  ],
})
export class EvidenceModule {}
