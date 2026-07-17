import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { GitHubAppCallbackHandler } from "./application/commands/github-app-callback/github-app-callback.handler.js";
import { GitHubAppStartHandler } from "./application/commands/github-app-start/github-app-start.handler.js";
import { GITHUB_APP_INSTALL_STATE_REPOSITORY } from "./application/ports/persistence/github-app-install-state.repository.js";
import { REPOSITORY_CONNECTION_REPOSITORY } from "./application/ports/persistence/repository-connection.repository.js";
import { GitHubAppClient } from "./infrastructure/github/github-app.client.js";
import { PrismaGitHubAppInstallStateRepository } from "./infrastructure/persistence/prisma-github-app-install-state.repository.js";
import { PrismaRepositoryConnectionRepository } from "./infrastructure/persistence/prisma-github-integration.repository.js";
import { GitHubIntegrationController } from "./presentation/http/github-integration.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [GitHubIntegrationController],
  providers: [
    GitHubAppStartHandler,
    GitHubAppCallbackHandler,
    GitHubAppClient,
    PrismaGitHubAppInstallStateRepository,
    PrismaRepositoryConnectionRepository,
    {
      provide: GITHUB_APP_INSTALL_STATE_REPOSITORY,
      useExisting: PrismaGitHubAppInstallStateRepository,
    },
    {
      provide: REPOSITORY_CONNECTION_REPOSITORY,
      useExisting: PrismaRepositoryConnectionRepository,
    },
  ],
})
export class GitHubIntegrationModule {}
