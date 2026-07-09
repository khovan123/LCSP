import { Global, Module } from "@nestjs/common";

import { AuthWorkspaceModule } from "../../modules/auth-workspace/auth-workspace.module.js";
import { PbacContextLoader } from "./pbac-context.loader.js";
import { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import { PbacGuard } from "./pbac.guard.js";

@Global()
@Module({
  imports: [AuthWorkspaceModule],
  providers: [PbacEvaluatorService, PbacContextLoader, PbacGuard],
  exports: [PbacEvaluatorService, PbacGuard],
})
export class PbacModule {}
