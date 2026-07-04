---
task_id: MW-audit-002
module: platform/audit-writer
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 1.8
depends_on:
  - platform/audit-writer/01-audit-event-schema.md
  - platform/outbox/02-outbox-publisher.md
---

# Audit Writer Service

## Outcome

Provide a platform-level `AuditWriterService` that persists `AuthAuditEvent` rows. The service is non-throwing: audit failures are logged internally but never bubble to calling command handlers. All write operations sanitize payload before persistence.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/platform/audit/audit-writer.service.ts` | Create | Core write service |
| `apps/api/src/platform/audit/audit-sanitizer.ts` | Create | Strips sensitive keys from payload |
| `apps/api/src/platform/audit/audit.module.ts` | Create | `@Global()` NestJS module — exports `AuditWriterService` |
| `apps/api/src/app.module.ts` | Modify | Import `AuditModule` |

## API Contract

No HTTP endpoint. Internal service.

**`AuditWriterService.write(event: AuditEventInput): Promise<void>`**

Writes a sanitized `AuthAuditEvent` row. Never throws.

**`AuditWriterService.writeInTx(event: AuditEventInput, tx: PrismaTransactionClient): Promise<void>`**

Writes within an existing Prisma transaction. Same sanitization rules. Never throws.

## Business Rules

1. Call `AuditSanitizer.sanitize(payload)` before any write. Sanitizer strips fields matching pattern `/password|token|secret|key|nonce|code|hash/i`.
2. If the sanitizer removes a field, emit a `Logger.warn(...)` with the removed field name (not the value).
3. Set `occurredAt = new Date()` inside the service. Caller-provided `occurredAt` is ignored.
4. On any DB write failure: catch exception, `Logger.error(...)`, return void. Do NOT rethrow.
5. `writeInTx` uses the passed `PrismaTransactionClient` — ensures audit event is rolled back if the outer transaction rolls back (desired behavior for transactional commands).
6. `write` (non-tx) writes directly — used by post-transaction audit events.
7. `AuditModule` must be `@Global()` so all feature modules can inject `AuditWriterService` without re-importing.

## Sanitizer Rules

```typescript
// audit-sanitizer.ts
const SENSITIVE_KEY_PATTERN = /password|token|secret|key|nonce|code|hash/i;

function sanitize(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!payload) return undefined;
  return Object.fromEntries(
    Object.entries(payload).filter(([k]) => !SENSITIVE_KEY_PATTERN.test(k))
  );
}
```

## Prisma Models Used

| Model | Action | Key fields |
|---|---|---|
| `AuthAuditEvent` | Create | All fields via `AuditEventInput` + `occurredAt = now()` |

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | `write()` with clean payload | Row created, all fields correct |
| T02 | `write()` with `payload.passwordHash` | Field stripped; row created; warning logged |
| T03 | `write()` with `payload.sessionToken` | Field stripped; row created |
| T04 | `write()` DB fails | No exception thrown; error logged |
| T05 | `writeInTx()` inside rolled-back transaction | Audit row also rolled back |
| T06 | `writeInTx()` inside committed transaction | Audit row committed |
| T07 | `occurredAt` is service-generated, not caller | Verified in DB |
| T08 | `AuditModule` is global | `AuditWriterService` injectable everywhere without re-import |

## Definition of Done

- `write()` and `writeInTx()` never throw.
- Sanitizer strips all sensitive-keyed fields from payload before persistence.
- Warning logged (not error) when sanitizer removes fields.
- `AuditModule` exported globally.
- `occurredAt` always set by service.
