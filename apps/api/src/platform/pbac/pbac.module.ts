import { Global, Module } from "@nestjs/common";

import { PbacEvaluatorService } from "./pbac-evaluator.service.js";

@Global()
@Module({
  providers: [PbacEvaluatorService],
  exports: [PbacEvaluatorService],
})
export class PbacModule {}
