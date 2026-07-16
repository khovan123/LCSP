import { jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { OutboxDlqService } from "./outbox-dlq.service.js";
import { OutboxRepository } from "./outbox.repository.js";
import { AuditWriterService } from "../audit/audit-writer.service.js";
import { NotFoundException } from "@nestjs/common";
import { OutboxMessageEntity } from "./outbox-message.entity.js";

describe("OutboxDlqService", () => {
  let service: OutboxDlqService;
  let findDlqMessages: jest.MockedFunction<OutboxRepository["findDlqMessages"]>;
  let findMessageById: jest.MockedFunction<OutboxRepository["findMessageById"]>;
  let resetMessageForReplay: jest.MockedFunction<
    OutboxRepository["resetMessageForReplay"]
  >;
  let deleteMessage: jest.MockedFunction<OutboxRepository["deleteMessage"]>;
  let writeAudit: jest.MockedFunction<AuditWriterService["write"]>;

  beforeEach(async () => {
    findDlqMessages = jest.fn<OutboxRepository["findDlqMessages"]>();
    findMessageById = jest.fn<OutboxRepository["findMessageById"]>();
    resetMessageForReplay =
      jest.fn<OutboxRepository["resetMessageForReplay"]>();
    deleteMessage = jest.fn<OutboxRepository["deleteMessage"]>();
    writeAudit = jest.fn<AuditWriterService["write"]>();

    const outboxRepositoryMock = {
      findDlqMessages,
      findMessageById,
      resetMessageForReplay,
      deleteMessage,
    };

    const auditWriterMock = {
      write: writeAudit,
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
  });

  describe("getDlqMessages", () => {
    it("should return messages and count", async () => {
      const mockMessages = [{ id: "1" } as OutboxMessageEntity];
      findDlqMessages.mockResolvedValue(mockMessages);

      const result = await service.getDlqMessages();

      expect(result).toEqual({ messages: mockMessages, count: 1 });
      expect(findDlqMessages).toHaveBeenCalled();
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
      findMessageById.mockResolvedValue(mockMessage);

      await service.replayMessage("1", "actor-1");

      expect(resetMessageForReplay).toHaveBeenCalledWith("1");
      expect(writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "OUTBOX_DLQ_REPLAYED",
          actorId: "actor-1",
        }),
      );
    });

    it("should throw NotFoundException if message is not in DLQ", async () => {
      const mockMessage = { id: "1", status: "failed" } as OutboxMessageEntity;
      findMessageById.mockResolvedValue(mockMessage);

      await expect(service.replayMessage("1", "actor-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(resetMessageForReplay).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if message does not exist", async () => {
      findMessageById.mockResolvedValue(null);

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
      findMessageById.mockResolvedValue(mockMessage);

      await service.deleteMessage("1", "actor-1");

      expect(deleteMessage).toHaveBeenCalledWith("1");
      expect(writeAudit).toHaveBeenCalledWith(
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
      findMessageById.mockResolvedValue(mockMessage);

      await expect(service.deleteMessage("1", "actor-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(deleteMessage).not.toHaveBeenCalled();
    });
  });
});
