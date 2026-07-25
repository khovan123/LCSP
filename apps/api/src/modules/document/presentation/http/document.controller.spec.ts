import { describe, expect, it, jest } from "@jest/globals";
import type { CommandBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
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
});

describe("DocumentController dispatch", () => {
  it("dispatches RequestGapAnalysisCommand", async () => {
    const execute = jest.fn<CommandBus["execute"]>().mockResolvedValue({});
    const controller = new DocumentController({
      execute,
    } as unknown as CommandBus);
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
});
