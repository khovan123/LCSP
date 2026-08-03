import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { MockEvidenceCommand } from "./mock-evidence.command.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AssessmentNotFoundException } from "../../../domain/exceptions/wizard.exceptions.js";
import { randomUUID } from "node:crypto";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";
import { toPrismaEvidenceAcceptanceStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";

@CommandHandler(MockEvidenceCommand)
export class MockEvidenceHandler
  implements ICommandHandler<MockEvidenceCommand, void>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: MockEvidenceCommand): Promise<void> {
    const { assessmentId, organizationId, userId } = command;

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
    });

    if (!assessment) {
      throw new AssessmentNotFoundException(command.correlationId);
    }

    // Mock Repository Connection
    const repoConnectionId = randomUUID();
    await this.prisma.repositoryConnection.create({
      data: {
        id: repoConnectionId,
        assessmentId,
        organizationId,
        userId,
        installationId: "mock-install-123",
        repositoryId: "mock-repo-123",
        repositoryName: "mock-repo",
        repositoryFullName: "mock/mock-repo",
        defaultBranch: "main",
        permissions: { admin: true, push: true, pull: true },
        status: "ACTIVE",
      },
    });

    const snapshotId = randomUUID();
    await this.prisma.repositorySnapshot.create({
      data: {
        id: snapshotId,
        assessmentId,
        organizationId,
        connectionId: repoConnectionId,
        repositoryId: "mock-repo-123",
        repositoryFullName: "mock/mock-repo",
        branch: "main",
        ref: "refs/heads/main",
        commitSha: "mocksha123",
        providerMetadata: {},
        actorId: userId,
        status: "READY",
      },
    });

    const scanJobId = randomUUID();
    await this.prisma.repositoryScanJob.create({
      data: {
        id: scanJobId,
        assessmentId,
        snapshotId,
        organizationId,
        idempotencyKey: randomUUID(),
        triggerSource: "MANUAL",
        status: "COMPLETED",
        correlationId: command.correlationId,
      },
    });

    // Mock Technical Evidence Report
    await this.prisma.technicalEvidenceReport.create({
      data: {
        id: randomUUID(),
        scanJobId,
        assessmentId,
        organizationId,
        snapshotId,
        schemaVersion: "1.0.0",
        toolsVersion: { lcspScanner: "1.0.0" },
        configHash: { hash: "mockhash123" },
        evidencePayload: {},
        privacyFlags: {},
        status: toPrismaEvidenceAcceptanceStatus(
          TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
        ),
      },
    });
  }
}
