# 04 RabbitMQ Message Catalog

## Purpose

Define complete RabbitMQ topology and TypeScript message contracts from Manager request through document generation.

This is a construction manual only; no source code is created in this phase.

## Exact files to create

```text
packages/contracts/src/events/envelope.ts
packages/contracts/src/events/scan.events.ts
packages/contracts/src/events/ai-usage-flow.events.ts
packages/contracts/src/events/reconciliation.events.ts
packages/contracts/src/events/classification.events.ts
packages/contracts/src/events/document.events.ts
packages/messaging/src/rabbitmq.publisher.ts
packages/messaging/src/rabbitmq.consumer.ts
packages/messaging/src/outbox-dispatcher.ts
```

## Interfaces

```ts
interface ScanRequestedPayload { assessmentId: string; scanJobId: string; repositorySnapshotId: string; commitSha: string; rulesetVersion: string }
interface ScanCompletedPayload { assessmentId: string; scanJobId: string; technicalEvidenceReportId: string; technicalProfileId: string; reportHash: string }
interface AIUsageFlowRequestedPayload { assessmentId: string; technicalProfileId: string; technicalEvidenceReportId: string }
interface ReconciliationRequestedPayload { assessmentId: string; aiUsageFlowId: string; wizardProfileId: string }
interface ClassificationRequestedPayload { assessmentId: string; verifiedProfileId: string }
interface DocumentRequestedPayload { assessmentId: string; classificationId: string; documentType: string; format: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `RabbitMqPublisher` | Publish envelopes. | AMQP channel, logger | `publishCommand()`, `publishEvent()` |
| `RabbitMqConsumer` | Consume and ack/nack messages. | AMQP channel, schema registry | `bindQueue()`, `consume()` |
| `OutboxDispatcher` | Publish pending outbox rows. | `OutboxRepository`, publisher | `dispatchPending()`, `markPublished()` |

## DTO Catalog

```json
{ "eventId":"uuidv7", "eventType":"command.scan.requested.v1", "schemaVersion":1, "occurredAt":"2026-06-21T00:00:00Z", "correlationId":"uuidv7", "aggregateType":"Assessment", "aggregateId":"uuidv7", "producer":"apps/api", "payload":{"assessmentId":"uuidv7","scanJobId":"uuidv7","repositorySnapshotId":"uuidv7","commitSha":"abc123","rulesetVersion":"scanner-rules-v0.1"} }
```

## Database Schema

```prisma
model RepositoryScanJob { id String @id @db.Uuid assessmentId String @db.Uuid repositorySnapshotId String @db.Uuid status ScanJobStatus @default(REQUESTED) rulesetVersion String idempotencyKey String @unique failureReason String? createdAt DateTime @default(now()) }
model TechnicalFinding { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid findingType String confidence Float filePath String evidenceRef String metadata Json @@index([technicalEvidenceReportId, findingType]) }
model AIUsageFlowClaim { id String @id @db.Uuid aiUsageFlowId String @db.Uuid claimType String value String evidenceRefs Json confidence Float uncertaintyReasons Json @@index([aiUsageFlowId, claimType]) }
model AuditEvent { id String @id @db.Uuid assessmentId String? @db.Uuid actorType Role eventType String correlationId String @db.Uuid metadata Json occurredAt DateTime @default(now()) @@index([correlationId]) }
```

## State Machines

Allowed transitions follow `01-system-state-machines.md`: Manager-originated requests advance assessment state only through valid predecessors; worker-originated events may only advance the state assigned to their command type. Denied transitions return `STATE_TRANSITION_BLOCKED` or `GATE_PRECONDITION_FAILED`.

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer | Payload Schema | Idempotency |
|---|---|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | API | ScanWorker | `ScanRequestedPayload` | `eventId` + `scanJobId` |
| `lcsp.commands.v1` | `lcsp.ai-usage-flow-worker.v1` | `command.ai-usage-flow.requested.v1` | API/profile | AIUsageFlowWorker | `AIUsageFlowRequestedPayload` | `eventId` + `technicalProfileId` |
| `lcsp.commands.v1` | `lcsp.reconciliation-worker.v1` | `command.reconciliation.requested.v1` | API/flow | ReconciliationWorker | `ReconciliationRequestedPayload` | `eventId` + `aiUsageFlowId` |
| `lcsp.commands.v1` | `lcsp.classification-worker.v1` | `command.classification.requested.v1` | API | ClassificationWorker | `ClassificationRequestedPayload` | `eventId` + `verifiedProfileId` |
| `lcsp.commands.v1` | `lcsp.document-worker.v1` | `command.document.requested.v1` | API | DocumentWorker | `DocumentRequestedPayload` | `eventId` + `documentRequestId` |

## Algorithms

Input: outbox envelope. Output: RabbitMQ delivery or failed outbox state. Complexity: O(1) per message.

```text
for each pending outbox row:
  validate envelope schema
  publish to exchange with routingKey = eventType
  if publish confirms: markPublished
  else increment retryCount
consumer:
  validate envelope and payload
  if eventId processed: ack
  try handle message
  on transient failure: nack/requeue until retry limit
  on non-retryable gate failure: persist blocked state and ack
  on retry exhausted: route to DLQ
```

Every payload is reference-only: no raw source, secret, full prompt, or full AST body.
