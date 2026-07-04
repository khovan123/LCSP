---
task_id: MW-audit-001
module: platform/audit-writer
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 1.8
depends_on:
  - platform/config/01-config-loader.md
---

# Audit Event Schema — Prisma + Domain Types

## Outcome

Define the shared audit event schema (Prisma model + TypeScript types) used by all modules. No audit event write logic here — this task is the schema and type definitions only.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add/verify `AuthAuditEvent` model (already partially exists — extend if needed) |
| `packages/contracts/src/audit/audit-event.types.ts` | Create | Shared `AuditEventType` union + payload interfaces |
| `apps/api/src/platform/audit/audit-event.entity.ts` | Create | Domain `AuditEvent` entity class |

## Prisma Model

```prisma
model AuthAuditEvent {
  id             String   @id @default(uuid())
  eventType      String
  actorId        String?
  organizationId String?
  correlationId  String
  decision       String   // 'allow' | 'deny'
  payload        Json?
  occurredAt     DateTime @default(now())

  @@index([organizationId, occurredAt])
  @@index([actorId, occurredAt])
  @@index([eventType, occurredAt])
}
```

## TypeScript Types

```typescript
// packages/contracts/src/audit/audit-event.types.ts

export type AuditDecision = 'allow' | 'deny';

export interface AuditEventInput {
  eventType: string;
  actorId: string | null;
  organizationId: string | null;
  correlationId: string;
  decision: AuditDecision;
  payload?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  occurredAt: Date;
}
```

## Business Rules

1. `payload` is `Json?` (nullable) — not all events have payloads.
2. `actorId` is nullable for unauthenticated system events.
3. `organizationId` is nullable for cross-org or system events.
4. `decision` is a plain string column (not enum) to avoid Prisma migration churn when new decisions are added.
5. Indexes on `(organizationId, occurredAt)`, `(actorId, occurredAt)`, `(eventType, occurredAt)` to support audit log queries.
6. `id` uses UUID v4 (`@default(uuid())`).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Create event with all fields | Row created, all fields persisted |
| T02 | Create event with `actorId = null` | Row created with NULL actorId |
| T03 | Create event with `payload = null` | Row created with NULL payload |
| T04 | Query by `organizationId + occurredAt` range | Uses index, returns correct events |
| T05 | `AuditEventInput` type accepted by TypeScript | No type errors in consuming modules |

## Definition of Done

- Prisma model `AuthAuditEvent` migrated and indexes in place.
- `AuditEventInput` and `AuditEvent` types exported from `packages/contracts`.
- All fields nullable where appropriate.
- Domain entity class available for use by audit writer service.
