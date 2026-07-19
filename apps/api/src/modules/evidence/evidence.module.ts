import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { GetEvidenceHandler } from "./application/queries/get-evidence/get-evidence.handler.js";
import { EvidenceRedactorService } from "./application/services/evidence/evidence-redactor.service.js";
import { EvidenceController } from "./presentation/http/evidence.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [EvidenceController],
  providers: [GetEvidenceHandler, EvidenceRedactorService],
})
export class EvidenceModule {}
