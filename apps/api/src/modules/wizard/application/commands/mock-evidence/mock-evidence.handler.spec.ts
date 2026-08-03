import { ForbiddenException } from "@nestjs/common";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { SCAN_EVENT_TYPES } from "@lcsp/contracts/scan";

import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { MockEvidenceCommand } from "./mock-evidence.command.js";
import { MockEvidenceHandler } from "./mock-evidence.handler.js";

import { jest } from "@jest/globals";

/* eslint-disable @typescript-eslint/unbound-method */

describe("MockEvidenceHandler", () => {
  it("denies and audits service-level mock evidence generation without Manager wizard:write context", async () => {
    const prisma = {
      assessment: {
        findFirst: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    const auditWriter = {
      write: jest.fn<AuditWriterService["write"]>(),
    } as unknown as jest.Mocked<AuditWriterService>;
    const handler = new MockEvidenceHandler(prisma, auditWriter);

    await expect(
      handler.execute(
        new MockEvidenceCommand(
          "assessment-1",
          "org-1",
          "developer-1",
          "corr-mock-evidence-deny",
          {
            subjectRole: SUBJECT_ROLES.developer,
            selectedAction: PBAC_ACTIONS.wizardWrite,
            policyId: "policy-developer",
            policyVersion: "2026-06-26",
          },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.assessment.findFirst).not.toHaveBeenCalled();
    expect(auditWriter.write).toHaveBeenCalledWith({
      eventType: SCAN_EVENT_TYPES.evidenceAcceptedAudit,
      actorId: "developer-1",
      organizationId: "org-1",
      resourceType: AUDIT_RESOURCE_TYPES.technicalEvidenceReport,
      resourceId: null,
      assessmentId: "assessment-1",
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.pbacDenied,
      correlationId: "corr-mock-evidence-deny",
      policyId: "policy-developer",
      policyVersion: "2026-06-26",
      payload: {
        assessmentId: "assessment-1",
        action: PBAC_ACTIONS.wizardWrite,
        result: AUDIT_DECISIONS.deny,
      },
    });
  });
});
