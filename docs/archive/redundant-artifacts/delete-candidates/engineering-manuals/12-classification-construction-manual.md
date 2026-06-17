# 12 Classification Construction Manual

## Purpose

Define classification gates, rule evaluation, citation guardrail, confidence scoring, and blocked states.

Documentation only. No source files are created now.

## Exact files to create

```text
packages/classification/src/gates/classification-gate.service.ts
packages/classification/src/rules/classification-rule-engine.ts
packages/classification/src/scoring/classification-confidence.ts
apps/worker/src/handlers/classification/classification.worker.ts
apps/api/src/modules/classification/classification.controller.ts
```

## Interfaces

```ts
interface ClassificationContext { assessmentId: string; verifiedProfileId: string; aiUsageFlowClaims: AIUsageFlowClaimDto[]; legalCitations: LegalCitationDto[] }
interface ClassificationDecision { status: 'COMPLETED' | 'BLOCKED'; riskLevel?: string; blockedReason?: string; confidence: number; citationIds: string[] }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `ClassificationGateService` | Verify preconditions. | repositories | `assertCanClassify()` |
| `LegalRuleMatcher` | Retrieve citation-backed rules. | Legal RAG | `matchRules()` |
| `ClassificationRuleEngine` | Apply deterministic risk rules. | rule catalog | `evaluate()` |
| `ClassificationConfidence` | Score decision confidence. | none | `score()` |
| `ClassificationWorker` | Consume command. | services | `handleRequested()` |

## DTO Catalog

```ts
interface RequestClassificationDto { verifiedProfileId: string }
interface RiskClassificationResultDto { classificationId: string; riskLevel: string; confidence: number; legalCitationIds: string[]; limitations: string[] }
interface ClassificationBlockedDto { reason: 'VERIFIED_PROFILE_REQUIRED' | 'UNRESOLVED_CONFLICT' | 'INSUFFICIENT_EVIDENCE' | 'UNKNOWN_CRITICAL_PURPOSE' | 'CITATION_REQUIRED' }
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

Input: VerifiedProfile. Output: risk classification result or blocked state. Complexity: O(claims + retrieved legal rules).

```text
assert VerifiedProfile exists
assert no unresolved conflicts
assert material claims eligible and evidence-backed
legalMatches = legalRag.matchRules(verifiedProfile)
assert citation coverage sufficient
risk = ruleEngine.evaluate(verifiedProfile, legalMatches)
confidence = score(claim confidence, citation coverage, limitations)
transaction: persist ClassificationRun/Result or blocked state, audit, outbox
```

Provider/model/framework detection alone has zero classification weight.
