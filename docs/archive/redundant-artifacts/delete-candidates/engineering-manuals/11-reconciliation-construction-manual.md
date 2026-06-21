# 11 Reconciliation Construction Manual

## Purpose

Define conflict detection, Manager-only resolution, immutable scanner evidence handling, and VerifiedProfile generation.

Documentation only. No source files are created now.

## Exact files to create

```text
packages/reconciliation/src/comparator/wizard-technical-comparator.ts
packages/reconciliation/src/conflict/conflict-builder.ts
packages/reconciliation/src/verified-profile/verified-profile-builder.ts
apps/api/src/modules/reconciliation/conflict-resolution.controller.ts
apps/worker/src/handlers/reconciliation/reconciliation.worker.ts
```

## Interfaces

```ts
interface ReconciliationInput { wizardProfileId: string; aiUsageFlowId: string; technicalProfileId: string }
interface ConflictCandidate { conflictType: string; wizardClaim?: string; technicalClaim?: string; evidenceRefs: string[] }
interface VerifiedProfileDraft { assessmentId: string; aiUsageFlowId: string; profileJson: Record<string, unknown> }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `WizardTechnicalComparator` | Compare declared and evidence-backed claims. | none | `compare()` |
| `ConflictBuilder` | Persist conflict candidates. | repository | `buildConflicts()` |
| `ConflictResolutionService` | Manager resolution API logic. | repository, audit | `resolveConflict()` |
| `VerifiedProfileBuilder` | Create verified profile when clear. | repository | `build()` |
| `ReconciliationWorker` | Consume reconciliation command. | services | `handleRequested()` |

## DTO Catalog

```ts
interface RunReconciliationRequestDto { aiUsageFlowId: string }
interface ResolveConflictRequestDto { resolutionType: 'MANAGER_CONFIRMATION' | 'UPDATED_DECLARATION'; rationale: string; evidenceRefs: string[] }
interface ConflictRecordDto { conflictId: string; conflictType: string; status: 'UNRESOLVED' | 'RESOLVED'; evidenceRefs: string[] }
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

Input: WizardProfile + AIUsageFlow. Output: conflicts or VerifiedProfile. Complexity: O(claim count).

```text
for each material claim pair:
  if wizard contradicts technical claim: create conflict
  if critical purpose/human review/downstream action unknown: create conflict or block reason
if conflicts exist:
  persist ConflictRecord and set state RECONCILIATION_REQUIRED
else:
  persist VerifiedProfile and set state VERIFIED_PROFILE_READY
```

Manager resolution stores rationale separately; scanner evidence is never overwritten.
