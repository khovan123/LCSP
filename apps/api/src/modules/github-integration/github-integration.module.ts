import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { GitHubAppStartHandler } from "./application/commands/github-app-start/github-app-start.handler.js";
import { GITHUB_APP_INSTALL_STATE_REPOSITORY } from "./application/ports/persistence/github-app-install-state.repository.js";
import { GitHubAppClient } from "./infrastructure/github/github-app.client.js";
import { PrismaGitHubAppInstallStateRepository } from "./infrastructure/persistence/prisma-github-app-install-state.repository.js";
import { GitHubIntegrationController } from "./presentation/http/github-integration.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [GitHubIntegrationController],
  providers: [
    GitHubAppStartHandler,
    GitHubAppClient,
    PrismaGitHubAppInstallStateRepository,
    {
      provide: GITHUB_APP_INSTALL_STATE_REPOSITORY,
      useExisting: PrismaGitHubAppInstallStateRepository,
    },
  ],
})
export class GitHubIntegrationModule {}
