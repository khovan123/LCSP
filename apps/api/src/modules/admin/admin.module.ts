import { Module } from "@nestjs/common";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module.js";
import { AuditModule } from "../../platform/audit/audit.module.js";
import { RbacModule } from "../../platform/rbac/rbac.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminAccountCommandService } from "./application/services/admin-account-command.service.js";
import { AdminAccountReadService } from "./application/services/admin-account-read.service.js";
import { AdminOverviewService } from "./application/services/admin-overview.service.js";
import { AdminOverviewController } from "./presentation/http/admin-overview.controller.js";
import { AdminUsersController } from "./presentation/http/admin-users.controller.js";

@Module({
  imports: [PrismaModule, AuditModule, RbacModule, AuthModule],
  controllers: [AdminUsersController, AdminOverviewController],
  providers: [
    AdminOverviewService,
    AdminAccountReadService,
    AdminAccountCommandService,
  ],
  exports: [
    AdminOverviewService,
    AdminAccountReadService,
    AdminAccountCommandService,
  ],
})
export class AdminModule {}
