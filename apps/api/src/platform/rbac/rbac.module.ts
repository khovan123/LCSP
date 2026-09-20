import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module.js";
import { AuthModule } from "../../modules/auth/auth.module.js";
import { PrismaAuthorizationDecisionRepository } from "./prisma-authorization-decision.repository.js";
import { RbacContextLoader } from "./rbac-context.loader.js";
import { RbacPreflightController } from "./rbac-preflight.controller.js";
import { RbacPreflightService } from "./rbac-preflight.service.js";
import { RbacGuard } from "./rbac.guard.js";

/**
 * Registers the global RBAC guard, context loader, and worker preflight authorization endpoint.
 */
@Global()
@Module({
  imports: [PrismaModule, AuthModule, ConfigModule],
  controllers: [RbacPreflightController],
  providers: [
    PrismaAuthorizationDecisionRepository,
    RbacContextLoader,
    RbacGuard,
    RbacPreflightService,
  ],
  exports: [
    RbacContextLoader,
    RbacGuard,
    RbacPreflightService,
    PrismaAuthorizationDecisionRepository,
  ],
})
export class RbacModule {}
