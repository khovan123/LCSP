import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { WorkerApiKeyGuard } from "../scan/presentation/http/worker-api-key.guard.js";
import { AcceptTechnicalProfileHandler } from "./application/commands/accept-technical-profile/accept-technical-profile.handler.js";
import { GetEvidenceHandler } from "./application/queries/get-evidence/get-evidence.handler.js";
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
    AcceptTechnicalProfileHandler,
    EvidenceRedactorService,
    WorkerApiKeyGuard,
  ],
})
export class EvidenceModule {}
