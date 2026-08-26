import { ForbiddenException } from "@nestjs/common";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import { RBAC_ACTIONS } from "@lcsp/contracts/rbac";
import {
  CONFLICT_RECORD_STATUSES,
  SCAN_EVENT_TYPES,
} from "@lcsp/contracts/scan";

import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { ResolveConflictCommand } from "./resolve-conflict.command.js";
import { ResolveConflictHandler } from "./resolve-conflict.handler.js";

import { jest } from "@jest/globals";

/* eslint-disable @typescript-eslint/unbound-method */

describe("ResolveConflictHandler", () => {
  it("audits service-level deny before resolving a customer-only conflict action", async () => {
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
          "system-admin-1",
          AUTH_USER_ROLES.admin,
          CONFLICT_RECORD_STATUSES.resolved,
          null,
          "corr-conflict-deny",
          {
            selectedAction: RBAC_ACTIONS.conflictResolve,
          },
        ),
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(auditWriter.write).toHaveBeenCalledWith({
      eventType: SCAN_EVENT_TYPES.conflictResolvedAudit,
      actorId: "system-admin-1",
      assessmentId: "assessment-1",
      resourceType: AUDIT_RESOURCE_TYPES.conflictRecord,
      resourceId: "conflict-1",
      correlationId: "corr-conflict-deny",
      decision: AUDIT_DECISIONS.deny,
      reasonCode: AUTH_ERROR_CODES.rbacDenied,
      payload: {
        assessmentId: "assessment-1",
        conflictId: "conflict-1",
        action: RBAC_ACTIONS.conflictResolve,
        result: AUDIT_DECISIONS.deny,
      },
    });
  });
});
