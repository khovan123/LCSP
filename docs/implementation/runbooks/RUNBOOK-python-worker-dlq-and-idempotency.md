---
runbook_id: RUNBOOK-python-worker-dlq-and-idempotency
status: DRAFT
source_template: docs/implementation/templates/operational-runbook-template.md
related_tasks:
  - MW-pyp-001
  - MW-intel-001
  - MW-intel-002
  - MW-intel-004
---

# Python Worker DLQ and Idempotency Runbook

## Alert / Symptom

| Signal | Meaning | Severity |
|---|---|---|
| command retry count exceeded | Worker cannot complete command after configured retries. | high |
| message moved to DLQ | Command requires operator review or corrective task. | high |
| stale handoff rejected | Command references superseded input version. | medium |
| idempotency conflict | Duplicate command has inconsistent payload. | high |

## Impact

- Affected workflow stage remains blocked or failed.
- Downstream commands must not be published.
- Audit trail must preserve command ID, correlation ID, causation ID, worker name and failure reason.

## Initial Checks

1. Locate correlation ID in worker logs.
2. Locate command ID and idempotency key.
3. Check input artifact versions.
4. Check whether a newer artifact version already completed the same stage.
5. Check DLQ payload metadata, not raw source or secrets.

## Common Causes

| Cause | Confirmation | Mitigation |
|---|---|---|
| stale input version | command version older than current accepted artifact | reject as stale and surface actionable status |
| dependency unavailable | DB, RabbitMQ, ChromaDB, object storage or provider unavailable | retry if transient; DLQ after limit |
| schema drift | payload fails validation | create corrective task; do not patch payload manually |
| duplicate command | idempotency key already completed | return existing outcome without mutation |

## Recovery

| Condition | Recovery action | Evidence |
|---|---|---|
| duplicate successful command | no-op and link prior result | prior output artifact ID |
| transient dependency outage | replay from queue if policy permits | retry log and audit event |
| stale version | request new command from current state | stale rejection audit |
| schema bug | fix producer/consumer contract, then replay corrected command | PR and contract diff |

## Escalation

| Escalate to | When |
|---|---|
| Architecture owner | command/event contract is ambiguous |
| Security owner | payload contains secret/raw source risk |
| Domain owner | input artifact version semantics are unclear |
| Product owner | user-facing recovery state needs wording or policy decision |
