import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { RequestFinalReportHandler } from "./application/commands/request-final-report/request-final-report.handler.js";
import { DocumentController } from "./presentation/http/document.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [DocumentController],
  providers: [RequestFinalReportHandler],
})
export class DocumentModule {}
