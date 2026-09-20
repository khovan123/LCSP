import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module.js";
import { AuditModule } from "../../platform/audit/audit.module.js";
import { RbacModule } from "../../platform/rbac/rbac.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { ADMIN_COMMAND_HANDLERS } from "./application/commands/index.js";
import { ADMIN_QUERY_HANDLERS } from "./application/queries/index.js";
import { AdminAccountCommandService } from "./application/services/admin-account-command.service.js";
import { AdminAccountReadService } from "./application/services/admin-account-read.service.js";
import { AdminOverviewService } from "./application/services/admin-overview.service.js";
import { AdminOverviewController } from "./presentation/http/admin-overview.controller.js";
import { AdminUsersController } from "./presentation/http/admin-users.controller.js";

@Module({
  imports: [PrismaModule, AuditModule, RbacModule, CqrsModule, AuthModule],
  controllers: [AdminUsersController, AdminOverviewController],
  providers: [
    AdminOverviewService,
    AdminAccountReadService,
    AdminAccountCommandService,
    ...ADMIN_COMMAND_HANDLERS,
    ...ADMIN_QUERY_HANDLERS,
  ],
  exports: [
    AdminOverviewService,
    AdminAccountReadService,
    AdminAccountCommandService,
  ],
})
export class AdminModule {}
