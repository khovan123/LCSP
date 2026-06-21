# RabbitMQ Topology and Event Contracts

## Exchanges

| Exchange | Type | Purpose |
|---|---|---|
| `lcsp.commands.v1` | topic | Command messages from API/outbox to workers |
| `lcsp.events.v1` | topic | Domain/workflow events from workers/API |
| `lcsp.deadletter.v1` | topic | Dead-lettered messages after retry exhaustion |

## Queues

| Queue | Bound Routing Key | DLQ |
|---|---|---|
| `lcsp.scan-worker.v1` | `command.scan.requested.v1` | `lcsp.scan-worker.dlq.v1` |
| `lcsp.ai-usage-flow-worker.v1` | `command.ai-usage-flow.requested.v1` | `lcsp.ai-usage-flow-worker.dlq.v1` |
| `lcsp.reconciliation-worker.v1` | `command.reconciliation.requested.v1` | `lcsp.reconciliation-worker.dlq.v1` |
| `lcsp.classification-worker.v1` | `command.classification.requested.v1` | `lcsp.classification-worker.dlq.v1` |
| `lcsp.gap-analysis-worker.v1` | `command.gap-analysis.requested.v1` | `lcsp.gap-analysis-worker.dlq.v1` |
| `lcsp.document-worker.v1` | `command.document.requested.v1` | `lcsp.document-worker.dlq.v1` |
| `lcsp.audit-projector.v1` | `event.audit.created.v1` | none |

## Command Routing Keys

```text
command.scan.requested.v1
command.ai-usage-flow.requested.v1
command.reconciliation.requested.v1
command.classification.requested.v1
command.gap-analysis.requested.v1
command.document.requested.v1
```

## Event Routing Keys

```text
event.scan.completed.v1
event.scan.failed.v1
event.ai-usage-flow.completed.v1
event.reconciliation.conflict-detected.v1
event.reconciliation.verified-profile-created.v1
event.classification.completed.v1
event.classification.blocked.v1
event.gap-analysis.completed.v1
event.document.generated.v1
event.audit.created.v1
```

## Envelope

```json
{
  "eventId": "uuidv7",
  "eventType": "event.scan.completed.v1",
  "schemaVersion": 1,
  "occurredAt": "ISO-8601 timestamp",
  "correlationId": "uuidv7",
  "causationId": "uuidv7",
  "aggregateType": "Assessment",
  "aggregateId": "uuidv7",
  "producer": "apps/api",
  "payload": {}
}
```

## Retry and Dead-Letter Rules

- Queue payload never contains GitHub token, raw repository source, secret or prompt.
- Consumer is idempotent by `eventId`.
- Failed messages retry at most three times.
- Final failure goes to matching DLQ.
- Every consumer appends audit event for state-changing outcome.
- API uses transactional outbox before publishing command event.
- Non-retryable validation, authorization and invariant failures are acknowledged and converted to blocked/failed state with audit event.
