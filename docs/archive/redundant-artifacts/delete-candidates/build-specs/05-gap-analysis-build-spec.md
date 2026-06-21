# 05 Gap Analysis Build Spec

## 1. Purpose

Create citation-linked compliance gaps only after valid classification.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | Gap Analysis Service |
| Module name | `gap-analysis` |
| NestJS module | `apps/api/src/modules/gap-analysis/gap-analysis.module.ts` |
| Worker name | `apps/worker/src/handlers/gap-analysis/gap-analysis-requested.handler.ts` |
| Database ownership | GapAnalysisResult, RiskClassificationResult, LegalCitation |
| Queue ownership | consumes `command.gap-analysis.requested.v1`; publishes `event.gap-analysis.completed.v1` |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| TypeScript | locked npm | Runtime language | Controlled MVP TypeScript-first runtime | Python worker for MVP unless ADR changes |
| Zod | locked npm | DTO and event validation | Shared runtime validation | ad hoc validation |
| Prisma | locked npm | PostgreSQL access | Typed migrations and transactions | raw SQL-only |
| amqplib / Nest RabbitMQ adapter | locked npm | Queue integration | RabbitMQ topology is canonical | in-process queue |



## 4. Folder Structure

```text
packages/gap-analysis/src/
  obligations/ obligation mappers
  scoring/ compliance and priority formulas
  persistence/ repositories
  events/ queue contracts
  dto/ API DTOs
```

## 5. DTO Contracts

### RequestGapAnalysisDto
```json
{ "assessmentId": "018f0000-0000-7000-8000-000000000101", "classificationId": "018f0000-0000-7000-8000-000000000702" }
```
### GapAnalysisResultDto
```json
{ "gapAnalysisId": "018f0000-0000-7000-8000-000000000801", "status": "COMPLETED", "complianceScore": 0.62, "gaps": [{ "gapId": "gap-001", "obligationRef": "rule-001", "priority": "HIGH", "citationRefs": ["cit-001"], "evidenceRefs": ["ev:scan:001"] }] }
```

## 6. Database Models

| Model | Fields | Indexes | Unique constraints | Relationships |
|---|---|---|---|---|
| `GapAnalysisResult` | `id uuid`, `assessmentId uuid`, `status`, `metadata Json`, `createdAt`, `updatedAt` | `(assessmentId,status)` | `id` | belongs to `Assessment` |
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
  "eventType": "command.gap-analysis.requested.v1",
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
  "eventType": "event.gap-analysis.completed.v1",
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

Input: completed `RiskClassificationResult` with rule and citation refs.

Processing steps:

1. Load classification and legal obligations.
2. Reject blocked/provisional classification where gap analysis is not allowed.
3. For each applicable obligation, map evidence coverage and missing control.
4. Score coverage = satisfied / applicable.
5. Rank priority by legal severity, evidence absence and remediation effort.
6. Persist `GapAnalysisResult`.

Pseudocode:

```text
if classification.status != COMPLETED: block(CLASSIFICATION_REQUIRED)
for obligation in applicableObligations:
  gap = evaluateCoverage(obligation, evidenceRefs)
score = 0.5*coverage + 0.3*evidence + 0.2*criticality
persist(gaps, score)
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `CLASSIFICATION_REQUIRED` | missing/completed classification | block request |
| `GAP_RULE_MAPPING_FAILED` | obligation mapping missing | mark blocked gap and audit |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run test --workspace @lcsp/gap-analysis` | scoring tests pass | deterministic score and ranking |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
