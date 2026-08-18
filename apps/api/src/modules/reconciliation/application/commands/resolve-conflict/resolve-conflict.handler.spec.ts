import { ForbiddenException } from "@nestjs/common";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  CONFLICT_RECORD_STATUSES,
  SCAN_EVENT_TYPES,
} from "@lcsp/contracts/scan";
import type { Prisma } from "@prisma/client";

import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { ResolveConflictCommand } from "./resolve-conflict.command.js";
import { ResolveConflictHandler } from "./resolve-conflict.handler.js";

import { jest } from "@jest/globals";

/* eslint-disable @typescript-eslint/unbound-method */

describe("ResolveConflictHandler", () => {
  it("appends a versioned reconciliation decision without mutating scanner evidence", async () => {
    const tx = {
      conflictRecord: {
        findFirst: jest.fn().mockResolvedValue({
          id: "conflict-1",
          aiUsageFlowId: "flow-1",
          assessmentId: "assessment-1",
          organizationId: "org-1",
          status: CONFLICT_RECORD_STATUSES.pending,
          evidenceRefs: ["evidence-report-1::finding-1"],
        }),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      aIUsageFlow: {
        findFirst: jest.fn().mockResolvedValue({
          id: "flow-1",
          technicalProfileId: "technical-profile-1",
          schemaVersion: "1.0.0",
          providerVersion: "ai-usage-flow-worker@1.0.0",
        }),
      },
      technicalProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: "technical-profile-1",
          evidenceReportId: "evidence-report-1",
          schemaVersion: "1.0.0",
          providerVersion: "technical-profile-worker@1.0.0",
        }),
      },
      technicalEvidenceReport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "evidence-report-1",
          schemaVersion: "1.0.0",
          configHash: { semgrep: "sha256:abc" },
        }),
      },
      reconciliationDecision: {
        aggregate: jest.fn().mockResolvedValue({
          _max: { resolutionVersion: 2 },
        }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest
        .fn<
          (
            callback: (client: Prisma.TransactionClient) => Promise<boolean>,
          ) => Promise<boolean>
        >()
        .mockImplementation((callback) =>
          callback(tx as unknown as Prisma.TransactionClient),
        ),
    } as unknown as jest.Mocked<PrismaService>;
    const auditWriter = {
      writeInTx: jest.fn<AuditWriterService["writeInTx"]>(),
    } as unknown as jest.Mocked<AuditWriterService>;
    const outboxRepository = {
      enqueue: jest.fn<OutboxRepository["enqueue"]>(),
    } as unknown as jest.Mocked<OutboxRepository>;
    const handler = new ResolveConflictHandler(
      prisma,
      auditWriter,
      outboxRepository,
    );

    await handler.execute(
      new ResolveConflictCommand(
        "assessment-1",
        "conflict-1",
        "org-1",
        "user-1",
        SUBJECT_ROLES.manager,
        CONFLICT_RECORD_STATUSES.resolved,
        "Manager accepts the scanner-backed evidence.",
        "corr-resolution",
        {
          selectedAction: PBAC_ACTIONS.conflictResolve,
          policyId: "policy-manager",
          policyVersion: "2026-06-26",
        },
      ),
    );

    expect(tx.reconciliationDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conflictRecordId: "conflict-1",
        aiUsageFlowId: "flow-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        resolution: CONFLICT_RECORD_STATUSES.resolved,
        resolutionVersion: 3,
        actorId: "user-1",
        rationale: "Manager accepts the scanner-backed evidence.",
        evidenceRefs: ["evidence-report-1::finding-1"],
        technicalEvidenceReportId: "evidence-report-1",
        technicalEvidenceReportVersion: "1.0.0",
        technicalEvidenceReportHash: { semgrep: "sha256:abc" },
        technicalProfileId: "technical-profile-1",
        technicalProfileVersion: "1.0.0:technical-profile-worker@1.0.0",
        originalConflictStatus: CONFLICT_RECORD_STATUSES.pending,
      }),
    });
    expect(tx.conflictRecord.update).toHaveBeenCalledWith({
      where: { id: "conflict-1" },
      data: {
        status: CONFLICT_RECORD_STATUSES.resolved,
        resolvedAt: expect.any(Date),
        resolvedById: "user-1",
        resolutionNote: "Manager accepts the scanner-backed evidence.",
      },
    });
    expect(outboxRepository.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          aiUsageFlowId: "flow-1",
          lastReconciliationDecisionRef: expect.stringMatching(
            /^reconciliation-decision:/u,
          ),
          resolutionVersion: 3,
          technicalEvidenceReportId: "evidence-report-1",
          technicalProfileId: "technical-profile-1",
        }),
      }),
      tx,
    );
  });

  it("audits service-level deny before resolving a Manager-only conflict action", async () => {
    const prisma = {} as jest.Mocked<PrismaService>;
    const auditWriter = {
      write: jest.fn<AuditWriterService["write"]>(),
    } as unknown as jest.Mocked<AuditWriterService>;
    const outboxRepository = {} as jest.Mocked<OutboxRepository>;
    const handler = new ResolveConflictHandler(
      prisma,
      auditWriter,
      outboxRepository,
    );

    await expect(
      handler.execute(
        new ResolveConflictCommand(
          "assessment-1",
          "conflict-1",
          "org-1",
          "developer-1",
          SUBJECT_ROLES.developer,
          CONFLICT_RECORD_STATUSES.resolved,
          null,
          "corr-conflict-deny",
          {
            selectedAction: PBAC_ACTIONS.conflictResolve,
            policyId: "policy-developer",
            policyVersion: "2026-06-26",
          },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(auditWriter.write).toHaveBeenCalledWith({
      eventType: SCAN_EVENT_TYPES.conflictResolvedAudit,
      actorId: "developer-1",
      organizationId: "org-1",
      assessmentId: "assessment-1",
      resourceType: AUDIT_RESOURCE_TYPES.conflictRecord,
      resourceId: "conflict-1",
      correlationId: "corr-conflict-deny",
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      policyId: "policy-developer",
      policyVersion: "2026-06-26",
      payload: {
        assessmentId: "assessment-1",
        conflictId: "conflict-1",
        action: PBAC_ACTIONS.conflictResolve,
        result: AUDIT_DECISIONS.deny,
      },
    });
  });
});
