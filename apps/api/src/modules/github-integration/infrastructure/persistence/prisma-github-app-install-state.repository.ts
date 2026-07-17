import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { GitHubAppInstallStateRepository } from "../../application/ports/persistence/github-app-install-state.repository.js";
import { GitHubAppInstallState } from "../../domain/entities/github-app-install-state.entity.js";

@Injectable()
export class PrismaGitHubAppInstallStateRepository implements GitHubAppInstallStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(installState: GitHubAppInstallState): Promise<void> {
    await this.prisma.gitHubAppInstallState.create({
      data: {
        id: installState.id,
        state: installState.state,
        assessmentId: installState.assessmentId,
        organizationId: installState.organizationId,
        userId: installState.userId,
        redirectUri: installState.redirectUri,
        expiresAt: installState.expiresAt,
        createdAt: installState.createdAt,
      },
    });
  }
}
