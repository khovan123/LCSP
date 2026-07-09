import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuditEventInput } from "@lcsp/contracts/audit";

import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { AuditSanitizer } from "./audit-sanitizer.js";

@Injectable()
export class AuditWriterService {
  private readonly logger = new Logger(AuditWriterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async write(event: AuditEventInput): Promise<void> {
    await this.persist(this.prisma, event);
  }

  async writeInTx(
    event: AuditEventInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.persist(tx, event);
  }

  private async persist(
    client: Prisma.TransactionClient,
    event: AuditEventInput,
  ): Promise<void> {
    const { payload, removedKeys } = AuditSanitizer.sanitize(event.payload);

    for (const key of removedKeys) {
      this.logger.warn(`Audit payload field removed by sanitizer: ${key}`);
    }

    try {
      await client.authAuditEvent.create({
        data: {
          id: crypto.randomUUID(),
          eventType: event.eventType,
          actorId: event.actorId,
          organizationId: event.organizationId,
          correlationId: event.correlationId,
          decision: event.decision,
          payload: (payload ?? {}) as Prisma.InputJsonValue,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit event (eventType=${event.eventType}): ${(error as Error).message}`,
      );
    }
  }
}
