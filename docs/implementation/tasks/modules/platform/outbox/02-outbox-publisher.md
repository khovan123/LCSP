---
task_id: MW-outbox-002
module: platform/outbox
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 2.1
depends_on:
  - platform/outbox/01-outbox-model.md
  - platform/config/01-config-loader.md
---

# Outbox Publisher — Poller + RabbitMQ Relay

## Outcome

Poll the `OutboxMessage` table for `pending` rows and relay them to RabbitMQ. Mark as `published` on success or increment `attempts`/`status = failed` on error. After `MAX_ATTEMPTS`, move to `dlq`.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/platform/outbox/outbox-publisher.service.ts` | Create | Poller + relay logic |
| `apps/api/src/platform/outbox/outbox.module.ts` | Create | `@Global()` NestJS module |
| `apps/api/src/platform/outbox/rabbitmq.client.ts` | Create | Thin RabbitMQ publish wrapper |
| `apps/api/src/platform/outbox/outbox.repository.ts` | Create | DB queries for outbox (pending fetch, status update) |
| `apps/api/src/app.module.ts` | Modify | Import `OutboxModule` |

## Poller Config

| Variable | Default | Notes |
|---|---|---|
| `OUTBOX_POLL_INTERVAL_MS` | `1000` | Milliseconds between polls |
| `OUTBOX_BATCH_SIZE` | `50` | Messages per poll batch |
| `OUTBOX_MAX_ATTEMPTS` | `5` | Failures before DLQ |

## Business Rules

1. Poller runs on a `setInterval` started in `onModuleInit`. Stopped in `onModuleDestroy`.
2. Query: `SELECT * FROM OutboxMessage WHERE status = 'pending' ORDER BY createdAt ASC LIMIT BATCH_SIZE`. Skip-locked to support multi-instance deployment.
3. For each pending message: publish to RabbitMQ exchange with `routingKey = message.eventType`.
4. On successful publish: update `status = 'published'`, `publishedAt = now()`.
5. On publish failure: increment `attempts`. If `attempts >= MAX_ATTEMPTS` → `status = 'dlq'`, else `status = 'failed'`.
6. Re-polling picks up `status = 'failed'` messages after next poller interval (no separate retry queue — simplicity).
7. DLQ messages are not retried by poller. Require manual intervention or DLQ handler.
8. `payload` published to RabbitMQ must not be further modified — relay as-is from DB.
9. RabbitMQ connection failures: log error, skip batch, retry on next poll. Do not crash the app.

## Commands / Events

This service IS the relay. It reads `OutboxMessage` and publishes to RabbitMQ. No domain events produced.

## Prisma Models Used

| Model | Action | Key fields |
|---|---|---|
| `OutboxMessage` | Read | `WHERE status = pending ORDER BY createdAt LIMIT N` |
| `OutboxMessage` | Update | `status`, `attempts`, `publishedAt`, `lastAttemptAt`, `errorMessage` |

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Pending message exists, RabbitMQ available | Message published, `status = published` |
| T02 | RabbitMQ publish fails, `attempts < MAX_ATTEMPTS` | `status = failed`, `attempts++` |
| T03 | RabbitMQ publish fails, `attempts = MAX_ATTEMPTS` | `status = dlq` |
| T04 | RabbitMQ connection down | Log error, skip batch, no app crash |
| T05 | Multiple concurrent instances | Skip-locked query prevents double-publish |
| T06 | Payload relayed unmodified | RabbitMQ message body = `OutboxMessage.payload` |
| T07 | `status = dlq` not picked up by poller | DLQ messages excluded from pending query |
| T08 | `onModuleDestroy` stops poller | No interval leak after shutdown |

## Definition of Done

- Pending messages relayed to RabbitMQ with correct exchange and routing key.
- `status = published` on success; `status = dlq` after `MAX_ATTEMPTS` failures.
- Skip-locked query prevents duplicate relay in multi-instance.
- RabbitMQ failures are non-crashing (log-only).
- Poller cleaned up on module destroy.
