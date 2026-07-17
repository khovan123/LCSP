import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { config, configValidationSchema } from "./config/config.js";
import { AppFeatureModule } from "./modules/app/app.module.js";
import { AssessmentModule } from "./modules/assessment/assessment.module.js";
import { AuditModule as AuditFeatureModule } from "./modules/audit/audit.module.js";
import { AuthWorkspaceModule } from "./modules/auth-workspace/auth-workspace.module.js";
import { GitHubIntegrationModule } from "./modules/github-integration/github-integration.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { OutboxModule } from "./platform/outbox/outbox.module.js";
import { PbacModule } from "./platform/pbac/pbac.module.js";
import { AuditModule as AuditPlatformModule } from "./platform/audit/audit.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "test" ? [".env.test", ".env"] : [".env"],
      load: [config],
      validationSchema: configValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    AuditPlatformModule,
    OutboxModule,
    PbacModule,
    AppFeatureModule,
    AuthWorkspaceModule,
    UsersModule,
    AssessmentModule,
    GitHubIntegrationModule,
    AuditFeatureModule,
    HealthModule,
  ],
})
export class AppModule {}
