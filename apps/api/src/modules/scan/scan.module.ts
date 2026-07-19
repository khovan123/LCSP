import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { GetScanJobHandler } from "./application/queries/get-scan-job/get-scan-job.handler.js";
import { ScanController } from "./presentation/http/scan.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [ScanController],
  providers: [GetScanJobHandler],
})
export class ScanModule {}
