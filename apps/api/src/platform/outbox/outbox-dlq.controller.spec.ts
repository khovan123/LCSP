import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { OutboxDlqController } from "./outbox-dlq.controller.js";
import { OutboxDlqService } from "./outbox-dlq.service.js";

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

    const serviceMock = {
      getDlqMessages,
      replayMessage,
      deleteMessage,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboxDlqController],
      providers: [{ provide: OutboxDlqService, useValue: serviceMock }],
    }).compile();

    controller = module.get<OutboxDlqController>(OutboxDlqController);
  });

  describe("getDlqMessages", () => {
    it("should return DLQ messages", async () => {
      const mockResult = { messages: [], count: 0 };
      getDlqMessages.mockResolvedValue(mockResult);

      const result = await controller.getDlqMessages();
      expect(result).toEqual(mockResult);
      expect(getDlqMessages).toHaveBeenCalled();
    });
  });

  describe("replayMessage", () => {
    it("should replay message using fallback actorId", async () => {
      const req = { user: undefined } as ControllerRequest;
      const result = await controller.replayMessage("1", req);

      expect(replayMessage).toHaveBeenCalledWith("1", "system-admin");
      expect(result).toEqual({
        success: true,
        message: "Message 1 queued for replay",
      });
    });

    it("should replay message using user's actorId if available", async () => {
      const req = { user: { id: "user-123" } } as ControllerRequest;
      await controller.replayMessage("1", req);

      expect(replayMessage).toHaveBeenCalledWith("1", "user-123");
    });
  });

  describe("deleteMessage", () => {
    it("should delete message using fallback actorId", async () => {
      const req = { user: undefined } as ControllerRequest;
      const result = await controller.deleteMessage("1", req);

      expect(deleteMessage).toHaveBeenCalledWith("1", "system-admin");
      expect(result).toEqual({
        success: true,
        message: "Message 1 permanently deleted",
      });
    });

    it("should delete message using user's actorId if available", async () => {
      const req = { user: { id: "user-123" } } as ControllerRequest;
      await controller.deleteMessage("1", req);

      expect(deleteMessage).toHaveBeenCalledWith("1", "user-123");
    });
  });
});
