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

  async findByState(state: string): Promise<GitHubAppInstallState | null> {
    const row = await this.prisma.gitHubAppInstallState.findUnique({
      where: { state },
    });
    if (!row) {
      return null;
    }
    return GitHubAppInstallState.rehydrate({
      id: row.id,
      state: row.state,
      assessmentId: row.assessmentId,
      organizationId: row.organizationId,
      userId: row.userId,
      redirectUri: row.redirectUri,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.gitHubAppInstallState.deleteMany({ where: { id } });
  }
}
