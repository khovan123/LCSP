import { jest } from "@jest/globals";
import { PBAC_ACTIONS, PBAC_METADATA_TYPES } from "@lcsp/contracts/pbac";
import { OutboxDlqController } from "./outbox-dlq.controller.js";
import { OutboxDlqService } from "./outbox-dlq.service.js";
import { PBAC_METADATA_KEY } from "../pbac/decorators/pbac-metadata.js";

describe("OutboxDlqController", () => {
  let controller: OutboxDlqController;
  let getDlqMessages: jest.MockedFunction<OutboxDlqService["getDlqMessages"]>;
  let replayMessage: jest.MockedFunction<OutboxDlqService["replayMessage"]>;
  let deleteMessage: jest.MockedFunction<OutboxDlqService["deleteMessage"]>;

  type ControllerRequest = Parameters<OutboxDlqController["replayMessage"]>[1];

  beforeEach(async () => {
    getDlqMessages = jest.fn<OutboxDlqService["getDlqMessages"]>();
    replayMessage = jest.fn<OutboxDlqService["replayMessage"]>();
    deleteMessage = jest.fn<OutboxDlqService["deleteMessage"]>();

    controller = new OutboxDlqController({
      getDlqMessages,
      replayMessage,
      deleteMessage,
    } as unknown as OutboxDlqService);
  });

  describe("getDlqMessages", () => {
    it("should return DLQ messages", async () => {
      const mockResult = { messages: [], count: 0 };
      getDlqMessages.mockResolvedValue(mockResult);

      const result = await controller.getDlqMessages();
      expect(result).toEqual({ ok: true, data: mockResult });
      expect(getDlqMessages).toHaveBeenCalled();
    });
  });

  describe("replayMessage", () => {
    it("requires the outbox:replay PBAC action", () => {
      const metadata = Reflect.getMetadata(
        PBAC_METADATA_KEY,
        OutboxDlqController,
      ) as unknown;

      expect(metadata).toEqual({
        type: PBAC_METADATA_TYPES.action,
        action: PBAC_ACTIONS.outboxReplay,
      });
    });

    it("should replay message using PBAC context", async () => {
      const req = {
        pbacContext: { userId: "user-123", organizationId: "org-1" },
        correlationId: "corr-1",
      } as ControllerRequest;
      const result = await controller.replayMessage("1", req);

      expect(replayMessage).toHaveBeenCalledWith(
        "1",
        "user-123",
        "org-1",
        "corr-1",
      );
      expect(result).toEqual({
        ok: true,
        data: {
          success: true,
          message: "Message 1 queued for replay",
        },
      });
    });

  });

  describe("deleteMessage", () => {
    it("should delete message using PBAC context", async () => {
      const req = {
        pbacContext: { userId: "user-123", organizationId: "org-1" },
        correlationId: "corr-2",
      } as ControllerRequest;
      const result = await controller.deleteMessage("1", req);

      expect(deleteMessage).toHaveBeenCalledWith(
        "1",
        "user-123",
        "org-1",
        "corr-2",
      );
      expect(result).toEqual({
        ok: true,
        data: {
          success: true,
          message: "Message 1 permanently deleted",
        },
      });
    });

  });
});
