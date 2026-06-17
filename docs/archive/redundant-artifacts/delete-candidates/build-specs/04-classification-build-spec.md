# 04 Classification Build Spec

## 1. Purpose

Run citation-gated risk classification after VerifiedProfile; block when evidence, conflict or citation prerequisites fail.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | Classification Service |
| Module name | `classification` |
| NestJS module | `apps/api/src/modules/classification/classification.module.ts` |
| Worker name | `apps/worker/src/handlers/classification/classification-requested.handler.ts` |
| Database ownership | ClassificationRun, RiskClassificationResult, LegalRule, LegalCitation |
| Queue ownership | consumes `command.classification.requested.v1`; publishes `event.classification.completed.v1` |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| TypeScript | locked npm | Runtime language | Controlled MVP TypeScript-first runtime | Python worker for MVP unless ADR changes |
| Zod | locked npm | DTO and event validation | Shared runtime validation | ad hoc validation |
| Prisma | locked npm | PostgreSQL access | Typed migrations and transactions | raw SQL-only |
| amqplib / Nest RabbitMQ adapter | locked npm | Queue integration | RabbitMQ topology is canonical | in-process queue |



## 4. Folder Structure

```text
packages/legal-rag/src/ retrieval and citation guardrail
packages/classification/src/ rules, confidence, blockers
apps/api/src/modules/classification/ controllers/services/dtos
apps/worker/src/handlers/classification/ queue handler
```

## 5. DTO Contracts

### RequestClassificationDto
```json
{ "assessmentId": "018f0000-0000-7000-8000-000000000101", "verifiedProfileId": "018f0000-0000-7000-8000-000000000701", "legalCorpusVersion": "LCSP-LEGAL-CORPUS-v0.1.0" }
```
### RiskClassificationResultDto
```json
{ "classificationId": "018f0000-0000-7000-8000-000000000702", "riskLevel": "BLOCKED_OR_PROVISIONAL", "status": "BLOCKED", "blockedReasons": ["CITATION_REQUIRED"], "ruleRefs": [], "citationRefs": [], "confidence": 0.0 }
```

## 6. Database Models

| Model | Fields | Indexes | Unique constraints | Relationships |
|---|---|---|---|---|
| `ClassificationRun` | `id uuid`, `assessmentId uuid`, `status`, `metadata Json`, `createdAt`, `updatedAt` | `(assessmentId,status)` | `id` | belongs to `Assessment` |
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
  "eventType": "command.classification.requested.v1",
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
  "eventType": "event.classification.completed.v1",
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

Input: `VerifiedProfile`, `AIUsageFlowClaim[]`, `LegalRule[]`, `LegalCitation[]`.

Processing steps:

1. Require approved VerifiedProfile.
2. Reject unresolved conflicts.
3. Reject material claims without evidence refs.
4. Retrieve candidate legal rules from ChromaDB and structured metadata.
5. Evaluate deterministic predicates against VerifiedProfile.
6. Require citation coverage for every conclusion.
7. Compute confidence as min(claim confidence, rule match confidence, citation coverage).
8. Persist result or blocked run.

Pseudocode:

```text
if !verifiedProfile.approved: block(VERIFIED_PROFILE_REQUIRED)
if hasUnresolvedConflict: block(UNRESOLVED_CONFLICT)
claims = eligibleClaims(aiUsageFlow.claims)
rules = retrieveRules(claims, corpusVersion)
for rule in rules: if predicateMatches(rule, profile): matches.add(rule)
if missingCitation(matches): block(CITATION_REQUIRED)
return classification(matches, confidence=min(...))
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `VERIFIED_PROFILE_REQUIRED` | missing/invalid profile | block request |
| `UNRESOLVED_CONFLICT` | conflict open | block until Manager resolution |
| `CITATION_REQUIRED` | missing legal citation | block/degrade output |
| `LEGAL_RETRIEVAL_BLOCKED` | corpus unavailable | retry transient; block final result |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run test --workspace @lcsp/legal-rag` | rule tests pass | citations required |
| Classification smoke | blocked or completed event | no provider/model-only risk result |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
