import { Global, Module } from "@nestjs/common";

import { AuditWriterService } from "./audit-writer.service.js";

@Global()
@Module({
  providers: [AuditWriterService],
  exports: [AuditWriterService],
})
export class AuditModule {}
