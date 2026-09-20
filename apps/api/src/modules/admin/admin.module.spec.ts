import { describe, expect, it } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module.js";
import { AuditModule } from "../../platform/audit/audit.module.js";
import { RbacModule } from "../../platform/rbac/rbac.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdminModule } from "./admin.module.js";
import { AdminUsersController } from "./presentation/http/admin-users.controller.js";
import { AdminOverviewController } from "./presentation/http/admin-overview.controller.js";
import { AdminAccountCommandService } from "./application/services/admin-account-command.service.js";
import { AdminAccountReadService } from "./application/services/admin-account-read.service.js";
import { AdminOverviewService } from "./application/services/admin-overview.service.js";

describe("AdminModule", () => {
  it("compiles and resolves all admin controllers and services", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuditModule,
        RbacModule,
        AuthModule,
        AdminModule,
      ],
    }).compile();

    expect(moduleRef.get(AdminUsersController)).toBeDefined();
    expect(moduleRef.get(AdminOverviewController)).toBeDefined();
    expect(moduleRef.get(AdminAccountCommandService)).toBeDefined();
    expect(moduleRef.get(AdminAccountReadService)).toBeDefined();
    expect(moduleRef.get(AdminOverviewService)).toBeDefined();
  });
});
