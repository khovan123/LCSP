---
task_id: MW-outbox-001
module: platform/outbox
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 2.1
depends_on:
  - platform/config/01-config-loader.md
---

# Outbox Model — Prisma Schema

## Outcome

Define the transactional outbox Prisma model. Used by all domain command handlers that emit RabbitMQ events — events are written to the outbox in the same DB transaction as the domain state change, then relayed to RabbitMQ by the outbox publisher poller.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add `OutboxMessage` model |
| `apps/api/src/platform/outbox/outbox-message.entity.ts` | Create | Domain entity for outbox message |
| `packages/contracts/src/outbox/outbox-message.types.ts` | Create | Shared TypeScript types |

## Prisma Model

```prisma
model OutboxMessage {
  id            String    @id @default(uuid())
  aggregateType String                          // e.g. 'Assessment', 'AuthUser'
  aggregateId   String
  eventType     String                          // e.g. 'assessment.created'
  payload       Json
  status        String    @default("pending")  // 'pending' | 'published' | 'failed' | 'dlq'
  attempts      Int       @default(0)
  lastAttemptAt DateTime?
  publishedAt   DateTime?
  errorMessage  String?
  createdAt     DateTime  @default(now())

  @@index([status, createdAt])
  @@index([aggregateType, aggregateId])
}
```

## TypeScript Types

```typescript
// packages/contracts/src/outbox/outbox-message.types.ts

export type OutboxStatus = 'pending' | 'published' | 'failed' | 'dlq';

export interface OutboxMessageInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface OutboxMessage extends OutboxMessageInput {
  id: string;
  status: OutboxStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  publishedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}
```

## Business Rules

1. `status = 'pending'` on creation.
2. Index on `(status, createdAt)` to support poller query: `WHERE status = 'pending' ORDER BY createdAt ASC LIMIT N`.
3. `payload` is `Json` — store sanitized domain event payload (no secrets).
4. `attempts` incremented by outbox publisher on each relay attempt.
5. After `MAX_ATTEMPTS` (configurable, default 5) with `status = 'failed'` → publisher moves to `status = 'dlq'`.
6. `errorMessage` stores last failure reason (truncated to 500 chars).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Create outbox message | Row with `status = pending`, `attempts = 0` |
| T02 | Query pending messages ordered by `createdAt` | Uses `(status, createdAt)` index |
| T03 | `OutboxMessageInput` type accepted | No TypeScript errors |
| T04 | `aggregateType + aggregateId` index | Supports aggregate event lookup |

## Definition of Done

- `OutboxMessage` Prisma model migrated with all indexes.
- `OutboxMessageInput` and `OutboxMessage` types exported from `packages/contracts`.
- Domain entity class available for outbox publisher.
