import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { OutboxDlqController } from "./outbox-dlq.controller.js";
import { OutboxDlqService } from "./outbox-dlq.service.js";

describe("OutboxDlqController", () => {
  let controller: OutboxDlqController;
  let service: jest.Mocked<OutboxDlqService>;

  beforeEach(async () => {
    const serviceMock = {
      getDlqMessages: jest.fn(),
      replayMessage: jest.fn(),
      deleteMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboxDlqController],
      providers: [{ provide: OutboxDlqService, useValue: serviceMock }],
    }).compile();

    controller = module.get<OutboxDlqController>(OutboxDlqController);
    service = module.get(OutboxDlqService);
  });

  describe("getDlqMessages", () => {
    it("should return DLQ messages", async () => {
      const mockResult = { messages: [], count: 0 };
      service.getDlqMessages.mockResolvedValue(mockResult);

      const result = await controller.getDlqMessages();
      expect(result).toEqual(mockResult);
      expect(service.getDlqMessages).toHaveBeenCalled();
    });
  });

  describe("replayMessage", () => {
    it("should replay message using fallback actorId", async () => {
      const req = { user: null } as unknown as any;
      const result = await controller.replayMessage("1", req);

      expect(service.replayMessage).toHaveBeenCalledWith("1", "system-admin");
      expect(result).toEqual({
        success: true,
        message: "Message 1 queued for replay",
      });
    });

    it("should replay message using user's actorId if available", async () => {
      const req = { user: { id: "user-123" } } as unknown as any;
      await controller.replayMessage("1", req);

      expect(service.replayMessage).toHaveBeenCalledWith("1", "user-123");
    });
  });

  describe("deleteMessage", () => {
    it("should delete message using fallback actorId", async () => {
      const req = { user: null } as unknown as any;
      const result = await controller.deleteMessage("1", req);

      expect(service.deleteMessage).toHaveBeenCalledWith("1", "system-admin");
      expect(result).toEqual({
        success: true,
        message: "Message 1 permanently deleted",
      });
    });

    it("should delete message using user's actorId if available", async () => {
      const req = { user: { id: "user-123" } } as unknown as any;
      await controller.deleteMessage("1", req);

      expect(service.deleteMessage).toHaveBeenCalledWith("1", "user-123");
    });
  });
});
