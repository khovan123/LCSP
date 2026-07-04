import { Module } from "@nestjs/common";

import { AppFeatureModule } from "./modules/app/app.module.js";
import { AuthWorkspaceModule } from "./modules/auth-workspace/auth-workspace.module.js";
import { UsersModule } from "./modules/users/users.module.js";

@Module({
  imports: [AppFeatureModule, AuthWorkspaceModule, UsersModule],
})
export class AppModule {}
