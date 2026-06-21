# 06 Document Generation Build Spec

## 1. Purpose

Generate prototype-only compliance documents with citation appendix and explicit warning after all guardrails pass.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | Document Service |
| Module name | `document` |
| NestJS module | `apps/api/src/modules/document/document.module.ts` |
| Worker name | `apps/worker/src/handlers/document/document-requested.handler.ts` |
| Database ownership | ComplianceDocument, GeneratedDocumentFile, GapAnalysisResult |
| Queue ownership | consumes `command.document.requested.v1`; publishes `event.document.generated.v1` |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| TypeScript | locked npm | Runtime language | Controlled MVP TypeScript-first runtime | Python worker for MVP unless ADR changes |
| Zod | locked npm | DTO and event validation | Shared runtime validation | ad hoc validation |
| Prisma | locked npm | PostgreSQL access | Typed migrations and transactions | raw SQL-only |
| amqplib / Nest RabbitMQ adapter | locked npm | Queue integration | RabbitMQ topology is canonical | in-process queue |



## 4. Folder Structure

```text
packages/document-generation/src/
  templates/ template metadata and mappers
  renderers/ renderer adapter
  guardrails/ output prerequisites
  storage/ MinIO/S3 object adapter
  persistence/ repositories
  dto/ API DTOs
```

## 5. DTO Contracts

### RequestDocumentGenerationDto
```json
{ "assessmentId": "018f0000-0000-7000-8000-000000000101", "classificationId": "018f0000-0000-7000-8000-000000000702", "gapAnalysisId": "018f0000-0000-7000-8000-000000000801", "documentType": "prototype_summary", "templateVersion": "template-v0.1.0" }
```
### ComplianceDocumentDto
```json
{ "documentId": "018f0000-0000-7000-8000-000000000901", "status": "GENERATED", "documentType": "prototype_summary", "fileRef": "documents/asmt/doc-v1.pdf", "contentHash": "sha256:abc", "prototypeWarning": true }
```

## 6. Database Models

| Model | Fields | Indexes | Unique constraints | Relationships |
|---|---|---|---|---|
| `ComplianceDocument` | `id uuid`, `assessmentId uuid`, `status`, `metadata Json`, `createdAt`, `updatedAt` | `(assessmentId,status)` | `id` | belongs to `Assessment` |
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
  "eventType": "command.document.requested.v1",
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
  "eventType": "event.document.generated.v1",
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

Input: `VerifiedProfile`, `RiskClassificationResult`, `GapAnalysisResult`, citation refs.

Processing steps:

1. Validate all guardrails: no unresolved conflict, classification valid, citations present, gap analysis available.
2. Load template metadata and hash.
3. Build view model from approved references only.
4. Render HTML with prototype warning and citation appendix.
5. Convert/store through renderer adapter.
6. Hash output and persist `ComplianceDocument` + `GeneratedDocumentFile`.

Pseudocode:

```text
if missingGuardrail: block(DOCUMENT_GENERATION_BLOCKED)
view = mapToTemplate(profile, classification, gaps, citations)
view.warning = PROTOTYPE_ONLY
file = render(view)
hash = sha256(file)
storeObject(file, key)
persistDocument(key, hash)
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `DOCUMENT_GENERATION_BLOCKED` | missing profile/classification/gap/citation | block and show reason |
| `OBJECT_STORAGE_FAILED` | MinIO/S3 failure | retry then DLQ |
| `TEMPLATE_VERSION_NOT_FOUND` | unknown template | non-retryable block |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run test --workspace @lcsp/document-generation` | render tests pass | warning and citation appendix present |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
