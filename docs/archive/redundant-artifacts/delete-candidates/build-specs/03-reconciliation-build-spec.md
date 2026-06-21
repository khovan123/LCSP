# 03 Reconciliation Build Spec

## 1. Purpose

Create conflicts or VerifiedProfile by reconciling Manager declarations with technical AIUsageFlow evidence.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | Reconciliation Service |
| Module name | `reconciliation` |
| NestJS module | `apps/api/src/modules/reconciliation/reconciliation.module.ts` |
| Worker name | `apps/worker/src/handlers/reconciliation/reconciliation-requested.handler.ts` |
| Database ownership | ConflictRecord, ConflictResolution, VerifiedProfile |
| Queue ownership | consumes `command.reconciliation.requested.v1`; publishes `event.reconciliation.verified-profile-created.v1` |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| TypeScript | locked npm | Runtime language | Controlled MVP TypeScript-first runtime | Python worker for MVP unless ADR changes |
| Zod | locked npm | DTO and event validation | Shared runtime validation | ad hoc validation |
| Prisma | locked npm | PostgreSQL access | Typed migrations and transactions | raw SQL-only |
| amqplib / Nest RabbitMQ adapter | locked npm | Queue integration | RabbitMQ topology is canonical | in-process queue |



## 4. Folder Structure

```text
packages/reconciliation/src/
  compare/ field comparators
  conflicts/ conflict builders
  verified-profile/ verified profile factory
  persistence/ Prisma repositories
  events/ queue contracts
  dto/ API DTOs
```

## 5. DTO Contracts

### RunReconciliationDto
```json
{ "assessmentId": "018f0000-0000-7000-8000-000000000101", "wizardProfileId": "018f0000-0000-7000-8000-000000000501", "aiUsageFlowId": "018f0000-0000-7000-8000-000000000504" }
```
### ConflictRecordDto
```json
{ "conflictId": "018f0000-0000-7000-8000-000000000601", "field": "automation_level", "wizardValue": "decision_support", "technicalValue": "AUTOMATED_DECISION_CANDIDATE", "severity": "HIGH", "status": "OPEN", "evidenceRefs": ["ev:scan:001"] }
```
### ResolveConflictDto
```json
{ "resolutionType": "CONFIRM_TECHNICAL_EVIDENCE", "rationale": "Manager confirms automated approve/reject path", "evidenceRefs": ["ev:scan:001"] }
```

## 6. Database Models

| Model | Fields | Indexes | Unique constraints | Relationships |
|---|---|---|---|---|
| `ConflictRecord` | `id uuid`, `assessmentId uuid`, `status`, `metadata Json`, `createdAt`, `updatedAt` | `(assessmentId,status)` | `id` | belongs to `Assessment` |
| `AuditEvent` | `id uuid`, `assessmentId uuid`, `actorId uuid?`, `eventType`, `objectType`, `objectId`, `metadata Json`, `timestamp` | `(assessmentId,eventType,timestamp)`, `correlationId` | `id` | append-only workflow audit |

Example record:

```json
{
  "id": "018f0000-0000-7000-8000-000000000301",
  "assessmentId": "018f0000-0000-7000-8000-000000000101",
  "status": "READY",
  "metadata": { "source": "controlled-prototype" },
  "createdAt": "2026-06-20T00:00:00.000Z"
}
```

## 7. RabbitMQ Contracts

### Consumed command

```json
{
  "eventId": "018f0000-0000-7000-8000-000000000401",
  "eventType": "command.reconciliation.requested.v1",
  "schemaVersion": 1,
  "occurredAt": "2026-06-20T00:00:00.000Z",
  "correlationId": "018f0000-0000-7000-8000-000000000402",
  "causationId": "018f0000-0000-7000-8000-000000000403",
  "aggregateType": "Assessment",
  "aggregateId": "018f0000-0000-7000-8000-000000000101",
  "producer": "apps/api",
  "payload": { "assessmentId": "018f0000-0000-7000-8000-000000000101" }
}
```

Producer: API/outbox. Consumer: worker handler. Retry: 3 transient retries. DLQ: matching worker DLQ. Idempotency: `eventId` plus aggregate-specific output uniqueness.

### Published event

```json
{
  "eventId": "018f0000-0000-7000-8000-000000000404",
  "eventType": "event.reconciliation.verified-profile-created.v1",
  "schemaVersion": 1,
  "occurredAt": "2026-06-20T00:00:00.000Z",
  "correlationId": "018f0000-0000-7000-8000-000000000402",
  "causationId": "018f0000-0000-7000-8000-000000000401",
  "aggregateType": "Assessment",
  "aggregateId": "018f0000-0000-7000-8000-000000000101",
  "producer": "apps/worker",
  "payload": { "status": "COMPLETED" }
}
```

## 8. Algorithms

Input: `WizardProfile`, `TechnicalProfile`, `AIUsageFlow`.

Processing steps:

1. Compare material fields: purpose, input categories, affected subjects, downstream action, human review, automation level.
2. If AIUsageFlow is uncertain, create conflict or uncertainty task.
3. If values materially disagree, create `ConflictRecord`.
4. If no material conflicts remain, build `VerifiedProfile` from versioned refs.
5. Manager resolution creates `ConflictResolution`; it never mutates scanner findings.

Pseudocode:

```text
for field in materialFields:
  result = compare(wizard[field], aiUsageFlow[field])
  if result.conflict: createConflict(field, result)
if hasOpenMaterialConflict(assessmentId): publish conflict-detected
else: createVerifiedProfile(versionedRefs)
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `AI_USAGE_FLOW_REQUIRED` | no AIUsageFlow exists | block reconciliation |
| `UNRESOLVED_CONFLICT` | material conflict remains | block VerifiedProfile/classification |
| `SCANNER_EVIDENCE_IMMUTABLE` | attempted overwrite | reject and audit |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run test --workspace @lcsp/reconciliation` | comparator tests pass | conflicts created deterministically |
| Manager conflict smoke | conflict resolved | VerifiedProfile created only after all blockers resolved |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
