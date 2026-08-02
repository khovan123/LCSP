import { describe, expect, it, jest } from "@jest/globals";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import {
  READINESS_EXPORT_GUARDRAIL_REASONS,
  READINESS_EXPORT_STATUSES,
  WIZARD_EVENT_TYPES,
} from "@lcsp/contracts/wizard";
import {
  ASSESSMENT_LOCK_REASONS,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";

import type { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import type { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import type { ReadinessEvaluatorService } from "../../services/wizard/readiness-evaluator.service.js";
import type { ReadinessExportGuardrailService } from "../../services/wizard/readiness-export-guardrail.service.js";
import { GenerateReadinessExportCommand } from "./generate-readiness-export.command.js";
import { GenerateReadinessExportHandler } from "./generate-readiness-export.handler.js";

describe("GenerateReadinessExportHandler", () => {
  it("persists a safe blocked artifact and guardrail audit event", async () => {
    const create = jest
      .fn<(input: unknown) => Promise<unknown>>()
      .mockResolvedValue({});
    const writeInTx = jest
      .fn<(event: unknown, transaction: unknown) => Promise<unknown>>()
      .mockResolvedValue({});
    const tx = { readinessExport: { create } };
    const prisma = {
      assessment: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: "assessment-1",
            organizationId: "org-1",
            ownerId: "manager-1",
          }),
        ),
      },
      wizardProfile: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: "wizard-1",
            version: 2,
            status: WIZARD_STATUS_CODES.submitted,
            answers: [],
          }),
        ),
      },
      repositoryConnection: { findFirst: jest.fn(() => Promise.resolve(null)) },
      technicalEvidenceReport: {
        findFirst: jest.fn(() => Promise.resolve(null)),
      },
      readinessExport: { findFirst: jest.fn(() => Promise.resolve(null)) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const auditWriter = {
      writeInTx,
      write: jest.fn(() => Promise.resolve({})),
    } as unknown as AuditWriterService;
    const evaluator = {
      evaluate: jest.fn(() => ({
        classification_locked: true,
        lock_reason: ASSESSMENT_LOCK_REASONS.evidenceRequired,
        missing_evidence: [],
        unresolved_unknown_items: [],
        completed_steps: ["wizard_profile"],
        next_action: "HIGH risk classification result",
      })),
    } as unknown as ReadinessEvaluatorService;
    const guardrail = {
      check: jest.fn(() => ({
        passed: false,
        blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.overclaim,
      })),
    } as unknown as ReadinessExportGuardrailService;
    const handler = new GenerateReadinessExportHandler(
      prisma,
      auditWriter,
      evaluator,
      guardrail,
    );

    const response = await handler.execute(
      new GenerateReadinessExportCommand(
        "assessment-1",
        "org-1",
        "manager-1",
        "corr-1",
        {
          subjectRole: SUBJECT_ROLES.manager,
          selectedAction: PBAC_ACTIONS.wizardExport,
          policyId: "manager-policy",
          policyVersion: "1",
        },
      ),
    );

    expect(response.status).toBe(READINESS_EXPORT_STATUSES.blocked);
    expect(JSON.stringify(response)).not.toMatch(
      /\b(high|medium|low|risk|legal conclusion|classification result)\b/i,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentJson: undefined,
          blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.overclaim,
        }),
      }),
    );
    expect(writeInTx).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WIZARD_EVENT_TYPES.readinessExportBlocked,
        reasonCode: READINESS_EXPORT_GUARDRAIL_REASONS.overclaim,
      }),
      tx,
    );
  });
});
