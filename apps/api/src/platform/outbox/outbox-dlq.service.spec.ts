import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { OutboxDlqService } from "./outbox-dlq.service.js";
import { OutboxRepository } from "./outbox.repository.js";
import { AuditWriterService } from "../audit/audit-writer.service.js";
import { NotFoundException } from "@nestjs/common";
import { OutboxMessageEntity } from "./outbox-message.entity.js";

describe("OutboxDlqService", () => {
  let service: OutboxDlqService;
  let outboxRepository: jest.Mocked<OutboxRepository>;
  let auditWriter: jest.Mocked<AuditWriterService>;

  beforeEach(async () => {
    const outboxRepositoryMock = {
      findDlqMessages: jest.fn(),
      findMessageById: jest.fn(),
      resetMessageForReplay: jest.fn(),
      deleteMessage: jest.fn(),
    };

    const auditWriterMock = {
      write: jest.fn(),
      writeInTx: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxDlqService,
        { provide: OutboxRepository, useValue: outboxRepositoryMock },
        { provide: AuditWriterService, useValue: auditWriterMock },
      ],
    }).compile();

    service = module.get<OutboxDlqService>(OutboxDlqService);
    outboxRepository = module.get(OutboxRepository);
    auditWriter = module.get(AuditWriterService);
  });

  describe("getDlqMessages", () => {
    it("should return messages and count", async () => {
      const mockMessages = [{ id: "1" } as OutboxMessageEntity];
      outboxRepository.findDlqMessages.mockResolvedValue(mockMessages);

      const result = await service.getDlqMessages();

      expect(result).toEqual({ messages: mockMessages, count: 1 });
      expect(outboxRepository.findDlqMessages).toHaveBeenCalled();
    });
  });

  describe("replayMessage", () => {
    it("should replay a valid DLQ message and write audit", async () => {
      const mockMessage = {
        id: "1",
        status: "dlq",
        eventType: "TEST",
        aggregateId: "123",
      } as OutboxMessageEntity;
      outboxRepository.findMessageById.mockResolvedValue(mockMessage);

      await service.replayMessage("1", "actor-1");

      expect(outboxRepository.resetMessageForReplay).toHaveBeenCalledWith("1");
      expect(auditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "OUTBOX_DLQ_REPLAYED",
          actorId: "actor-1",
        }),
      );
    });

    it("should throw NotFoundException if message is not in DLQ", async () => {
      const mockMessage = { id: "1", status: "failed" } as OutboxMessageEntity;
      outboxRepository.findMessageById.mockResolvedValue(mockMessage);

      await expect(service.replayMessage("1", "actor-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(outboxRepository.resetMessageForReplay).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if message does not exist", async () => {
      outboxRepository.findMessageById.mockResolvedValue(null);

      await expect(service.replayMessage("1", "actor-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteMessage", () => {
    it("should delete a valid DLQ message and write audit", async () => {
      const mockMessage = {
        id: "1",
        status: "dlq",
        eventType: "TEST",
        aggregateId: "123",
      } as OutboxMessageEntity;
      outboxRepository.findMessageById.mockResolvedValue(mockMessage);

      await service.deleteMessage("1", "actor-1");

      expect(outboxRepository.deleteMessage).toHaveBeenCalledWith("1");
      expect(auditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "OUTBOX_DLQ_DISCARDED",
          actorId: "actor-1",
        }),
      );
    });

    it("should throw NotFoundException if message is not in DLQ", async () => {
      const mockMessage = {
        id: "1",
        status: "published",
      } as OutboxMessageEntity;
      outboxRepository.findMessageById.mockResolvedValue(mockMessage);

      await expect(service.deleteMessage("1", "actor-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(outboxRepository.deleteMessage).not.toHaveBeenCalled();
    });
  });
});
