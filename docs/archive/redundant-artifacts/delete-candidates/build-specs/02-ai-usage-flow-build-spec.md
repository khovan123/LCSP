# 02 AIUsageFlow Build Spec

## 1. Purpose

Transform WizardProfile, TechnicalProfile and TechnicalFindings into evidence-backed AIUsageFlow claims with confidence, uncertainty and abstention behavior.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | AIUsageFlow Service |
| Module name | `ai-usage-flow` |
| NestJS module | `apps/api/src/modules/ai-usage-flow/ai-usage-flow.module.ts` |
| Worker name | `apps/worker/src/handlers/ai-usage-flow/ai-usage-flow-requested.handler.ts` |
| Database ownership | AIUsageFlow, AIUsageFlowClaim, EvidenceReference |
| Queue ownership | consumes `command.ai-usage-flow.requested.v1`; publishes `event.ai-usage-flow.completed.v1` |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| TypeScript | locked npm | Runtime language | Controlled MVP TypeScript-first runtime | Python worker for MVP unless ADR changes |
| Zod | locked npm | DTO and event validation | Shared runtime validation | ad hoc validation |
| Prisma | locked npm | PostgreSQL access | Typed migrations and transactions | raw SQL-only |
| amqplib / Nest RabbitMQ adapter | locked npm | Queue integration | RabbitMQ topology is canonical | in-process queue |



## 4. Folder Structure

```text
packages/ai-usage-flow/src/
  rules/ claim-generation rules
  claims/ claim DTO builders
  confidence/ confidence calculators
  abstention/ uncertainty and coverage limitation rules
  persistence/ Prisma repositories
  events/ queue payload contracts
  dto/ API/internal DTOs
```

## 5. DTO Contracts

### BuildAIUsageFlowRequestDto
```json
{ "assessmentId": "018f0000-0000-7000-8000-000000000101", "wizardProfileId": "018f0000-0000-7000-8000-000000000501", "technicalProfileId": "018f0000-0000-7000-8000-000000000502", "technicalEvidenceReportId": "018f0000-0000-7000-8000-000000000503" }
```
### AIUsageFlowDto
```json
{ "aiUsageFlowId": "018f0000-0000-7000-8000-000000000504", "businessProcess": "loan review", "aiPurpose": "credit scoring support", "aiInputTypes": ["financial_data"], "aiOutputTypes": ["score"], "downstreamAction": "approve_reject_status_update", "affectedSubjects": ["loan_applicant"], "humanReview": "ABSENT_ON_BOUNDED_PATH", "automationLevel": "AUTOMATED_DECISION_CANDIDATE", "potentialHarmCategories": ["financial_access"], "evidenceRefs": ["ev:scan:001"], "confidence": 0.86, "uncertaintyReasons": [] }
```
### Queue DTO
```json
{ "assessmentId": "018f0000-0000-7000-8000-000000000101", "technicalEvidenceReportId": "018f0000-0000-7000-8000-000000000503", "technicalProfileId": "018f0000-0000-7000-8000-000000000502" }
```

## 6. Database Models

| Model | Fields | Indexes | Unique constraints | Relationships |
|---|---|---|---|---|
| `AIUsageFlow` | `id uuid`, `assessmentId uuid`, `status`, `metadata Json`, `createdAt`, `updatedAt` | `(assessmentId,status)` | `id` | belongs to `Assessment` |
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
  "eventType": "command.ai-usage-flow.requested.v1",
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
  "eventType": "event.ai-usage-flow.completed.v1",
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

Input: `WizardProfile`, `TechnicalProfile`, `TechnicalFinding[]`, `ScannerEvidencePath[]`.

Processing steps:

1. Load evidence-backed scanner findings by report.
2. Group findings by invocation path.
3. Generate claim candidates for purpose, input, output, downstream action, affected subjects, human review and automation level.
4. Attach evidence refs to every material claim.
5. Compute confidence as weighted minimum of finding confidence, path completeness and rule specificity.
6. Apply abstention: if purpose/downstream/human review is dynamic or unsupported, emit `UNCLEAR` plus `uncertaintyReasons`.
7. Persist `AIUsageFlow` and `AIUsageFlowClaim` rows.
8. Publish completion event or blocked event.

Pseudocode:

```text
claims = []
for path in evidencePaths:
  if path.has(AI_MODEL_INVOCATION):
    claims += buildInputClaims(path)
    claims += buildOutputClaims(path)
    claims += buildDownstreamClaims(path)
    claims += buildHumanReviewClaim(path)
for claim in claims:
  if claim.material and claim.evidenceRefs.empty: markIneligible
if criticalUnknown: status = UNCERTAIN_REQUIRES_RECONCILIATION
persist(AIUsageFlow, claims)
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `AI_USAGE_FLOW_EVIDENCE_REQUIRED` | material claim lacks evidence refs | mark claim ineligible; block legal matching |
| `AI_USAGE_FLOW_UNCERTAIN` | critical purpose/action/review unclear | persist uncertainty; require reconciliation/Manager clarification |
| `AI_USAGE_FLOW_BUILD_FAILED` | transient worker failure | retry then DLQ |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run test --workspace @lcsp/ai-usage-flow` | claim tests pass | every material claim has evidence refs |
| Synthetic fixtures | expected AIUsageFlow JSON | low-impact fixtures do not become high-impact |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
