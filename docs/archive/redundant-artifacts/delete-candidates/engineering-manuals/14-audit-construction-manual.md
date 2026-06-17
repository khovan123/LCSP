# 14 Audit Construction Manual

## Purpose

Define immutable audit append, redaction, query, and projection construction.

Documentation only. No source/test/CI/Docker artifacts are created.

## Exact files to create

```text
packages/audit/src/audit-event.dto.ts
packages/audit/src/audit-redactor.ts
packages/audit/src/audit.service.ts
packages/audit/src/audit.repository.ts
apps/api/src/modules/audit/audit.controller.ts
apps/api/src/modules/audit/audit.module.ts
```

## Interfaces

```ts
interface AuditAppendInput { eventType: string; actorType: 'MANAGER' | 'DEVELOPER' | 'SYSTEM_WORKER'; actorUserId?: string; assessmentId?: string; correlationId: string; causationId?: string; metadata: Record<string, unknown> }
interface AuditRedactionRule { fieldPattern: RegExp; replacement: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `AuditRedactor` | Remove secrets/raw source/full prompts. | rules | `redact()` |
| `AuditService` | Append immutable events. | redactor, repository | `append()`, `appendDenied()` |
| `AuditRepository` | Prisma adapter. | Prisma | `insert()`, `listByAssessment()` |
| `AuditController` | Read scoped audit events. | service, guards | `listAssessmentEvents()` |

## DTO Catalog

```ts
interface AuditEventDto { auditEventId: string; eventType: string; actorType: string; assessmentId?: string; correlationId: string; metadata: Record<string, unknown>; occurredAt: string }
interface AuditEventListDto { items: AuditEventDto[]; nextCursor?: string }
```

## Database Schema

```prisma
model AuditEvent { id String @id @db.Uuid organizationId String? @db.Uuid assessmentId String? @db.Uuid actorUserId String? @db.Uuid actorType Role eventType String correlationId String @db.Uuid causationId String? @db.Uuid metadata Json occurredAt DateTime @default(now()) @@index([assessmentId, occurredAt]) @@index([correlationId]) @@index([eventType]) }
model OutboxEvent { id String @id @db.Uuid eventId String @unique @db.Uuid eventType String schemaVersion Int aggregateType String aggregateId String @db.Uuid correlationId String @db.Uuid payload Json status String retryCount Int @default(0) occurredAt DateTime @default(now()) publishedAt DateTime? @@index([status, occurredAt]) @@index([correlationId]) }
model Session { id String @id @db.Uuid userId String @db.Uuid tokenHash String @unique expiresAt DateTime revokedAt DateTime? createdAt DateTime @default(now()) }
```

## State Machines

API and audit enforce all state transitions from `01-system-state-machines.md`. Local bootstrap and implementation order do not alter runtime state.

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer |
|---|---|---|---|---|
| `lcsp.events.v1` | `lcsp.audit-projector.v1` | `event.audit.created.v1` | services/workers | AuditProjector |
| `lcsp.commands.v1` | domain worker queues | `command.*.v1` | API outbox | workers |

## Algorithms

Input: audit append request. Output: immutable audit row. Complexity: O(metadata field count).

```text
validate event type and actor
redacted = redactor.redact(metadata)
assert redacted contains no forbidden fields
insert AuditEvent
return auditEventId
```

Edge cases: audit write failure during critical state change fails closed; read API is assessment scoped; update/delete methods are not exposed.
