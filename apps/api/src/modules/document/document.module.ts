import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { RequestFinalReportHandler } from "./application/commands/request-final-report/request-final-report.handler.js";
import { RequestGapAnalysisHandler } from "./application/commands/request-gap-analysis/request-gap-analysis.handler.js";
import { ProcessDocumentCallbackHandler } from "./application/commands/process-document-callback/process-document-callback.handler.js";
import { DocumentController } from "./presentation/http/document.controller.js";
import { InternalDocumentController } from "./presentation/http/internal-document.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [DocumentController, InternalDocumentController],
  providers: [RequestFinalReportHandler, RequestGapAnalysisHandler, ProcessDocumentCallbackHandler],
})
export class DocumentModule {}
