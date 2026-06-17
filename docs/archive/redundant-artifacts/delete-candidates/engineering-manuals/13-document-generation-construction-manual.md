# 13 Document Generation Construction Manual

## Purpose

Define gap/document generation shell, template rendering, object storage metadata, and output guardrail.

Documentation only. No source files are created now.

## Exact files to create

```text
packages/document-generation/src/templates/template-registry.ts
packages/document-generation/src/render/html-renderer.ts
packages/document-generation/src/render/pdf-renderer.ts
packages/document-generation/src/guardrails/output-guardrail.ts
packages/document-generation/src/storage/generated-file-storage.ts
apps/worker/src/handlers/document/document.worker.ts
apps/api/src/modules/documents/document.controller.ts
```

## Interfaces

```ts
interface DocumentGenerationContext { assessmentId: string; classificationId: string; verifiedProfileId: string; legalCitationIds: string[]; gapAnalysisId?: string }
interface RenderedDocument { html: string; citations: string[]; warnings: string[] }
interface StoredDocumentFile { fileId: string; storageKey: string; fileHash: string; contentType: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `TemplateRegistry` | Select document templates. | config | `getTemplate()` |
| `DocumentContextBuilder` | Build render context. | repositories | `buildContext()` |
| `OutputGuardrail` | Block uncited/unsafe output. | citation repository | `assertCanRender()`, `scanOutput()` |
| `HtmlRenderer` | Render HTML/Markdown. | handlebars | `render()` |
| `PdfRenderer` | Render PDF artifact. | puppeteer adapter | `renderPdf()` |
| `GeneratedFileStorage` | Store artifact metadata. | MinIO/S3 client | `putObject()`, `hashFile()` |
| `DocumentWorker` | Consume document command. | services | `handleRequested()` |

## DTO Catalog

```ts
interface DocumentGenerationRequestDto { classificationId: string; documentType: 'prototype_summary'; format: 'html' | 'pdf' }
interface GeneratedDocumentFileDto { fileId: string; documentId: string; storageKey: string; fileHash: string }
```

## Database Schema

```prisma
model AIUsageFlow { id String @id @db.Uuid assessmentId String @db.Uuid technicalProfileId String @db.Uuid status String ruleSetVersion String uncertaintyReasons Json createdAt DateTime @default(now()) }
model AIUsageFlowClaim { id String @id @db.Uuid aiUsageFlowId String @db.Uuid claimType String value String sourceType ClaimSourceType evidenceRefs Json confidence Float uncertaintyReasons Json @@index([aiUsageFlowId, claimType]) }
model ConflictRecord { id String @id @db.Uuid assessmentId String @db.Uuid aiUsageFlowId String @db.Uuid conflictType String wizardClaim String? technicalClaim String? evidenceRefs Json status ConflictStatus @default(UNRESOLVED) }
model VerifiedProfile { id String @id @db.Uuid assessmentId String @db.Uuid aiUsageFlowId String @db.Uuid profileJson Json createdAt DateTime @default(now()) }
model ClassificationRun { id String @id @db.Uuid assessmentId String @db.Uuid verifiedProfileId String @db.Uuid status WorkflowStatus @default(REQUESTED) blockedReason String? createdAt DateTime @default(now()) }
model RiskClassificationResult { id String @id @db.Uuid classificationRunId String @unique @db.Uuid assessmentId String @db.Uuid riskLevel String confidence Float legalCitationIds Json limitations Json createdAt DateTime @default(now()) }
model ComplianceDocument { id String @id @db.Uuid assessmentId String @db.Uuid classificationResultId String @db.Uuid documentType String status WorkflowStatus guardrailResult Json createdAt DateTime @default(now()) }
model AuditEvent { id String @id @db.Uuid assessmentId String? @db.Uuid actorType Role eventType String correlationId String @db.Uuid metadata Json occurredAt DateTime @default(now()) }
```

## State Machines

AIUsageFlow requires `TECHNICAL_PROFILE_READY`; reconciliation produces `RECONCILIATION_REQUIRED` or `VERIFIED_PROFILE_READY`; classification requires `VERIFIED_PROFILE_READY`; document generation requires completed classification plus citation/output guardrails.

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer |
|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.ai-usage-flow-worker.v1` | `command.ai-usage-flow.requested.v1` | API/profile | AIUsageFlowWorker |
| `lcsp.commands.v1` | `lcsp.reconciliation-worker.v1` | `command.reconciliation.requested.v1` | API/flow | ReconciliationWorker |
| `lcsp.commands.v1` | `lcsp.classification-worker.v1` | `command.classification.requested.v1` | API | ClassificationWorker |
| `lcsp.commands.v1` | `lcsp.document-worker.v1` | `command.document.requested.v1` | API | DocumentWorker |

## Algorithms

Input: classification + citations + gap analysis. Output: generated document metadata or blocked state. Complexity: O(template size + citations + gaps).

```text
assert classification completed
assert no unresolved conflict
assert required citations exist
context = buildDocumentContext()
rendered = template.render(context)
outputGuardrail.assertNoUncitedConclusion(rendered)
outputGuardrail.assertNoRawSourceOrSecrets(rendered)
file = storage.put(rendered)
transaction: persist ComplianceDocument, GeneratedDocumentFile, audit
```

Edge cases: missing citation blocks/degrades; storage failure marks document failed; prototype limitation must render in every document.
