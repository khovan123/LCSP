import { describe, expect, it, jest } from "@jest/globals";
import { HttpException } from "@nestjs/common";
import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import {
  LEGAL_CORPUS_RECOVERY_MISSING_REQUIREMENTS,
  LEGAL_CORPUS_RECOVERY_REQUEST_COMMAND,
  LEGAL_MATCHING_REQUEST_COMMAND,
} from "@lcsp/contracts/legal-rule-catalog";
import { OUTBOX_STATUSES } from "@lcsp/contracts/outbox";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { VERIFIED_PROFILE_STATUSES } from "@lcsp/contracts/scan";

import type { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import type { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import type { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { ApproveVerifiedProfileCommand } from "./approve-verified-profile.command.js";
import { ApproveVerifiedProfileHandler } from "./approve-verified-profile.handler.js";

function command() {
  return new ApproveVerifiedProfileCommand(
    "assessment-1",
    "vp-1",
    "org-1",
    "manager-1",
    SUBJECT_ROLES.manager,
    "corr-1",
    {
      selectedAction: PBAC_ACTIONS.verifiedProfileApprove,
      policyId: "policy-manager-workspace",
      policyVersion: "2026-06-26",
    },
  );
}

function buildHandler(input?: { owned?: boolean }) {
  const owned = input?.owned ?? true;
  const findAssessment = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(owned ? { id: "assessment-1" } : null),
    );
  const findProfile = jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: "vp-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      status: VERIFIED_PROFILE_STATUSES.pendingApproval,
      approvedAt: null,
      approvedById: null,
    }),
  );
  const countConflicts = jest.fn().mockImplementation(() => Promise.resolve(0));
  const findExistingLegalRuleMatch = jest
    .fn()
    .mockImplementation(() => Promise.resolve(null));
  const findInFlightOutbox = jest
    .fn()
    .mockImplementation(() => Promise.resolve(null));
  const findCorpus = jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: "corpus-1",
      approvedAt: new Date("2026-08-12T00:00:00.000Z"),
    }),
  );
  const findIndex = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ id: "index-1" }));
  const findCatalog = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ id: "catalog-1" }));
  const updateProfile = jest.fn().mockImplementation(() => Promise.resolve({}));
  const tx = {
    verifiedProfile: {
      findFirst: findProfile,
      update: updateProfile,
    },
    legalRuleMatch: { findFirst: findExistingLegalRuleMatch },
    outboxMessage: { findFirst: findInFlightOutbox },
    legalCorpusVersion: { findFirst: findCorpus },
    legalRetrievalIndex: { findFirst: findIndex },
    legalRuleCatalogVersion: { findFirst: findCatalog },
    conflictRecord: { count: countConflicts },
  };
  const transaction = jest.fn(
    async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
  );
  const prisma = {
    assessment: { findFirst: findAssessment },
    $transaction: transaction,
  } as unknown as PrismaService;

  const write = jest
    .fn<AuditWriterService["write"]>()
    .mockImplementation(() => Promise.resolve());
  const writeInTx = jest
    .fn<AuditWriterService["writeInTx"]>()
    .mockImplementation(() => Promise.resolve());
  const auditWriter = { write, writeInTx } as unknown as AuditWriterService;

  const enqueue = jest
    .fn<OutboxRepository["enqueue"]>()
    .mockImplementation(() => Promise.resolve("outbox-message-1"));
  const outbox = { enqueue } as unknown as OutboxRepository;

  return {
    handler: new ApproveVerifiedProfileHandler(prisma, auditWriter, outbox),
    findAssessment,
    findProfile,
    transaction,
    updateProfile,
    findExistingLegalRuleMatch,
    findInFlightOutbox,
    findCorpus,
    findIndex,
    findCatalog,
    write,
    writeInTx,
    enqueue,
  };
}

describe("ApproveVerifiedProfileHandler", () => {
  it("requires the approving Manager to own the assessment", async () => {
    const { handler, findAssessment, transaction, write } = buildHandler({
      owned: false,
    });

    try {
      await handler.execute(command());
      throw new Error("Expected ownership rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(404);
      expect(exception.getResponse()).toMatchObject({
        ok: false,
        problem: {
          code: ASSESSMENT_ERROR_CODES.notFound,
          correlationId: "corr-1",
        },
      });
    }

    expect(findAssessment).toHaveBeenCalledWith({
      where: {
        id: "assessment-1",
        organizationId: "org-1",
        ownerId: "manager-1",
      },
      select: { id: true },
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("approves an owned pending profile and emits legal-matching work when corpus/index are ready", async () => {
    const { handler, transaction, updateProfile, writeInTx, enqueue } =
      buildHandler();

    const result = await handler.execute(command());

    expect(result.status).toBe(VERIFIED_PROFILE_STATUSES.approved);
    expect(result.approved_by_id).toBe("manager-1");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile.mock.calls[0][0]).toMatchObject({
      where: { id: "vp-1" },
      data: {
        status: VERIFIED_PROFILE_STATUSES.approved,
        approvedById: "manager-1",
      },
    });
    expect(writeInTx).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toMatchObject({
      eventType: LEGAL_MATCHING_REQUEST_COMMAND,
      aggregateId: "vp-1",
    });
  });

  it("approves and emits legal-corpus recovery when no validated corpus index is ready", async () => {
    const { handler, enqueue, findIndex } = buildHandler();
    findIndex.mockImplementation(() => Promise.resolve(null));

    await handler.execute(command());

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toMatchObject({
      eventType: LEGAL_CORPUS_RECOVERY_REQUEST_COMMAND,
      aggregateId: "vp-1",
      payload: {
        verifiedProfileId: "vp-1",
        missingRequirement:
          LEGAL_CORPUS_RECOVERY_MISSING_REQUIREMENTS.validLegalRetrievalIndex,
        corpusVersionId: "corpus-1",
      },
    });
  });

  it("approves without enqueueing legal-matching work when no approved rule catalog is ready", async () => {
    const { handler, enqueue, findCatalog } = buildHandler();
    findCatalog.mockImplementation(() => Promise.resolve(null));

    await handler.execute(command());

    expect(enqueue).not.toHaveBeenCalled();
  });

  it("replays downstream legal work for an already approved profile without changing approval identity", async () => {
    const { handler, findProfile, updateProfile, enqueue, writeInTx } =
      buildHandler();
    findProfile.mockImplementation(() =>
      Promise.resolve({
        id: "vp-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        status: VERIFIED_PROFILE_STATUSES.approved,
        approvedAt: new Date("2026-08-18T05:45:23.000Z"),
        approvedById: "manager-original",
      }),
    );

    const result = await handler.execute(command());

    expect(updateProfile).not.toHaveBeenCalled();
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toMatchObject({
      eventType: LEGAL_MATCHING_REQUEST_COMMAND,
      aggregateId: "vp-1",
    });
    expect(result.approved_at).toBe("2026-08-18T05:45:23.000Z");
    expect(result.approved_by_id).toBe("manager-original");
    expect(writeInTx).toHaveBeenCalledTimes(1);
    expect(writeInTx.mock.calls[0][0]).toMatchObject({
      payload: {
        replayedApproval: true,
      },
    });
  });

  it("does not duplicate legal work while a retryable outbox command is still in flight", async () => {
    const { handler, findProfile, findInFlightOutbox, enqueue } = buildHandler();
    findProfile.mockImplementation(() =>
      Promise.resolve({
        id: "vp-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        status: VERIFIED_PROFILE_STATUSES.approved,
        approvedAt: new Date("2026-08-18T05:45:23.000Z"),
        approvedById: "manager-1",
      }),
    );
    findInFlightOutbox.mockImplementation(() =>
      Promise.resolve({ id: "outbox-existing", status: OUTBOX_STATUSES.pending }),
    );

    await handler.execute(command());

    expect(enqueue).not.toHaveBeenCalled();
  });
});
