import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthWorkspaceModule } from "../../modules/auth-workspace/auth-workspace.module.js";
import { RbacContextLoader } from "./rbac-context.loader.js";
import { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import { RbacPreflightController } from "./rbac-preflight.controller.js";
import { RbacPreflightService } from "./rbac-preflight.service.js";
import { RbacGuard } from "./rbac.guard.js";

/**
 * Registers the global RBAC guard, context loader, evaluator, and worker preflight authorization endpoint.
 */
@Global()
@Module({
  imports: [AuthWorkspaceModule, ConfigModule],
  controllers: [RbacPreflightController],
  providers: [
    RbacEvaluatorService,
    RbacContextLoader,
    RbacGuard,
    RbacPreflightService,
  ],
  exports: [
    RbacEvaluatorService,
    RbacContextLoader,
    RbacGuard,
    RbacPreflightService,
    AuthWorkspaceModule,
  ],
})
export class RbacModule {}
