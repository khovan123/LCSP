import { describe, expect, it, jest } from "@jest/globals";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { DOCUMENT_ERROR_CODES } from "@lcsp/contracts/document";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
import { GetDocumentQuery } from "../../application/queries/get-document/get-document.query.js";
import { RequestGapAnalysisCommand } from "../../application/commands/request-gap-analysis/request-gap-analysis.command.js";
import { DocumentController } from "./document.controller.js";

describe("DocumentController PBAC", () => {
  it("requires the document:generate PBAC action for final report", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      DocumentController.prototype.requestFinalReport,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action",
      action: PBAC_ACTIONS.documentGenerate,
    });
  });

  it("requires the document:generate PBAC action for gap analysis", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      DocumentController.prototype.requestGapAnalysis,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action",
      action: PBAC_ACTIONS.documentGenerate,
    });
  });

  it("requires document read or redacted-read for document status", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      DocumentController.prototype.getDocument,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action_any",
      actions: [PBAC_ACTIONS.documentRead, PBAC_ACTIONS.documentReadRedacted],
    });
  });
});

describe("DocumentController dispatch", () => {
  it("dispatches RequestGapAnalysisCommand", async () => {
    const execute = jest.fn<CommandBus["execute"]>().mockResolvedValue({});
    const controller = new DocumentController(
      {
        execute,
      } as unknown as CommandBus,
      { execute: jest.fn() } as unknown as QueryBus,
      { verifySignedDownloadToken: jest.fn() } as never,
    );
    const req = {
      pbacContext: { organizationId: "org-1", userId: "user-1" },
      correlationId: "corr-1",
    } as unknown as Parameters<DocumentController["requestGapAnalysis"]>[1];

    await controller.requestGapAnalysis("asmt-1", req);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(
      RequestGapAnalysisCommand,
    );
  });

  it("dispatches GetDocumentQuery with organization and selected action", async () => {
    const execute = jest.fn<QueryBus["execute"]>().mockResolvedValue({});
    const controller = new DocumentController(
      { execute: jest.fn() } as unknown as CommandBus,
      { execute } as unknown as QueryBus,
      { verifySignedDownloadToken: jest.fn() } as never,
    );

    await controller.getDocument("assessment-1", "doc-1", {
      correlationId: "corr-1",
      pbacContext: {
        userId: "developer-1",
        sessionId: "session-1",
        organizationId: "org-1",
        subjectRole: SUBJECT_ROLES.developer,
        scope: "assessment-1",
        grantedActions: [PBAC_ACTIONS.documentReadRedacted],
        selectedAction: PBAC_ACTIONS.documentReadRedacted,
        policyId: "policy-1",
        policyVersion: "v1",
      },
    } as never);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(GetDocumentQuery);
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      assessmentId: "assessment-1",
      documentRequestId: "doc-1",
      organizationId: "org-1",
      scope: "assessment-1",
      selectedAction: PBAC_ACTIONS.documentReadRedacted,
      correlationId: "corr-1",
    });
  });

  it("redirects to the verified artifact url", () => {
    const controller = new DocumentController(
      { execute: jest.fn() } as unknown as CommandBus,
      { execute: jest.fn() } as unknown as QueryBus,
      {
        verifySignedDownloadToken: jest.fn(() => ({
          documentUrl: "https://example.test/doc.pdf",
        })),
      } as never,
    );

    expect(
      controller.downloadDocument("assessment-1", "doc-1", "signed-token"),
    ).toEqual({
      url: "https://example.test/doc.pdf",
    });
  });

  it("rejects an invalid download token", () => {
    const controller = new DocumentController(
      { execute: jest.fn() } as unknown as CommandBus,
      { execute: jest.fn() } as unknown as QueryBus,
      {
        verifySignedDownloadToken: jest.fn(() => null),
      } as never,
    );

    expect(() =>
      controller.downloadDocument("assessment-1", "doc-1", "bad-token"),
    ).toThrow("Bad Request Exception");
  });
});
