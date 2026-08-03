import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { HttpStatus } from "@nestjs/common";
import { MockEvidenceCommand } from "./mock-evidence.command.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AssessmentNotFoundException } from "../../../domain/exceptions/wizard.exceptions.js";
import { randomUUID } from "node:crypto";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  SCAN_EVENT_TYPES,
  TECHNICAL_EVIDENCE_REPORT_STATUSES,
} from "@lcsp/contracts/scan";
import { toPrismaEvidenceAcceptanceStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";

@CommandHandler(MockEvidenceCommand)
export class MockEvidenceHandler implements ICommandHandler<
  MockEvidenceCommand,
  void
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async execute(command: MockEvidenceCommand): Promise<void> {
    const { assessmentId, organizationId, userId } = command;
    await this.assertManagerOnlyAction(command);

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

  private async assertManagerOnlyAction(
    command: MockEvidenceCommand,
  ): Promise<void> {
    const allowed =
      command.authorization.subjectRole === SUBJECT_ROLES.manager &&
      command.authorization.selectedAction === PBAC_ACTIONS.wizardWrite &&
      command.authorization.policyId !== null &&
      command.authorization.policyVersion !== null;

    if (allowed) return;

    await this.auditWriter.write({
      eventType: SCAN_EVENT_TYPES.evidenceAcceptedAudit,
      actorId: command.userId,
      organizationId: command.organizationId,
      resourceType: AUDIT_RESOURCE_TYPES.technicalEvidenceReport,
      resourceId: null,
      assessmentId: command.assessmentId,
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      correlationId: command.correlationId,
      policyId: command.authorization.policyId,
      policyVersion: command.authorization.policyVersion,
      payload: {
        assessmentId: command.assessmentId,
        action: PBAC_ACTIONS.wizardWrite,
        result: AUDIT_DECISIONS.deny,
      },
    });

    throw problemException(AUTH_ERROR_CODES.pbacDenied, command.correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }
}
