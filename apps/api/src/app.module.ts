import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { config, configValidationSchema } from "./config/config.js";
import { AppFeatureModule } from "./modules/app/app.module.js";
import { AuthWorkspaceModule } from "./modules/auth-workspace/auth-workspace.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { AuditModule } from "./platform/audit/audit.module.js";
import { OutboxModule } from "./platform/outbox/outbox.module.js";
import { PbacModule } from "./platform/pbac/pbac.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.test", ".env"],
      load: [config],
      validationSchema: configValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    AuditModule,
    OutboxModule,
    PbacModule,
    AppFeatureModule,
    AuthWorkspaceModule,
    UsersModule,
  ],
})
export class AppModule {}
