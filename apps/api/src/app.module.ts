import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { config, configValidationSchema } from "./config/config.js";
import { AppFeatureModule } from "./modules/app/app.module.js";
import { AuthWorkspaceModule } from "./modules/auth-workspace/auth-workspace.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.test", ".env"],
      load: [config],
      validationSchema: configValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    AppFeatureModule,
    AuthWorkspaceModule,
    UsersModule,
  ],
})
export class AppModule {}
