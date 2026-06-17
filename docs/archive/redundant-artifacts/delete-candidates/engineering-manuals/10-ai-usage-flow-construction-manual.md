# 10 AIUsageFlow Construction Manual

## Purpose

Define AIUsageFlow claim construction, 30 deterministic rules, confidence, abstention, coverage limitations, and output generation.

Documentation only. No source files are created now.

## Exact files to create

```text
packages/ai-usage-flow/src/claim-builder.ts
packages/ai-usage-flow/src/rules/rule-catalog.ts
packages/ai-usage-flow/src/rules/rule-engine.ts
packages/ai-usage-flow/src/confidence/confidence-calculator.ts
packages/ai-usage-flow/src/abstention/abstention-engine.ts
packages/ai-usage-flow/src/coverage/coverage-limitation-engine.ts
packages/ai-usage-flow/src/output/ai-usage-flow-generator.ts
packages/ai-usage-flow/src/workers/ai-usage-flow.worker.ts
```

## Interfaces

```ts
interface AIUsageFlowRule { id: string; condition: string; evidenceRequired: string[]; outputClaim: Partial<AIUsageFlowClaimDraft>; confidenceImpact: number | 'BLOCK' }
interface AIUsageFlowClaimDraft { claimType: string; value: string; evidenceRefs: string[]; confidence: number; uncertaintyReasons: string[] }
interface AIUsageFlowBuildContext { wizardProfileId: string; technicalProfileId: string; technicalEvidenceReportId: string; findings: TechnicalFinding[] }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `ClaimIngestionService` | Convert findings/profile into candidate claims. | repositories | `ingest()` |
| `EvidenceRefValidator` | Ensure material claims have refs. | evidence repository | `validateClaimRefs()` |
| `AIUsageRuleEngine` | Execute deterministic rules. | rule catalog | `evaluate()` |
| `ConfidenceCalculator` | Score claims. | none | `score()`, `clamp()` |
| `AbstentionEngine` | Turn unknown/unsupported into blocked/unclear states. | rule results | `apply()` |
| `CoverageLimitationEngine` | Attach limitations. | scanner limitations | `merge()` |
| `AIUsageFlowGenerator` | Persist final flow. | repository, audit | `generate()` |

## DTO Catalog

```ts
interface BuildAIUsageFlowRequestDto { technicalProfileId: string; technicalEvidenceReportId: string }
interface AIUsageFlowDto { aiUsageFlowId: string; assessmentId: string; status: 'READY' | 'READY_WITH_UNCERTAINTY' | 'BLOCKED'; claims: AIUsageFlowClaimDto[] }
interface AIUsageFlowClaimDto { claimType: string; value: string; evidenceRefs: string[]; confidence: number; uncertaintyReasons: string[] }
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

Input: WizardProfile, TechnicalProfile, TechnicalFindings. Output: AIUsageFlow and claims. Complexity: O(findings + rules × candidate claims).

```text
context = load inputs
candidateClaims = ingest(context)
validate material claim evidenceRefs
ruleResults = ruleEngine.evaluate(candidateClaims, context)
scoredClaims = confidenceCalculator.score(ruleResults)
limitedClaims = coverageLimitationEngine.merge(scoredClaims)
finalClaims = abstentionEngine.apply(limitedClaims)
transaction: persist AIUsageFlow, claims, audit, outbox reconciliation command
```

Edge cases: missing evidence ref blocks claim from legal matching; dynamic prompt creates limitation; SDK-only abstains; unknown critical purpose blocks classification.

## Rule Catalog

| Rule | Condition | Evidence required | Output | Confidence impact |
|---|---|---|---|---|
| R01 | SDK dependency only | provider dependency evidence | ai_usage=UNKNOWN | 0; abstain |
| R02 | Resolved model invocation | model invocation evidence | ai_usage=PRESENT | +0.20 |
| R03 | Invocation without output use | invocation evidence | downstream_action=UNKNOWN | -0.10 |
| R04 | Output feeds branch | output used in conditional | downstream_action=DECISION_BRANCH | +0.15 |
| R05 | Output updates status | status update edge | downstream_action=STATE_CHANGE | +0.20 |
| R06 | Branch plus status update | conditional + state update | automation_level=AUTOMATED_DECISION | +0.20 |
| R07 | Manager review route | review queue/user task evidence | human_review=PRESENT | +0.15 |
| R08 | No bounded review path | complete bounded path and no review node | human_review=ABSENT_ON_BOUNDED_PATH | +0.05 |
| R09 | Unresolved review path | partial path | human_review=UNCLEAR | -0.20 |
| R10 | Loan domain terms | business route/model/schema refs | business_process=LOAN_OR_CREDIT | +0.10 |
| R11 | HR ranking terms | candidate/ranking refs | business_process=HR_SCREENING | +0.10 |
| R12 | Customer chatbot route | chat route no decision edge | ai_purpose=CUSTOMER_RESPONSE | +0.05 |
| R13 | Internal summary route | summarization naming no decision | ai_purpose=INTERNAL_SUMMARIZATION | +0.05 |
| R14 | Prompt from runtime config | dynamic config evidence | coverage_limitation=DYNAMIC_PROMPT | -0.30 |
| R15 | Remote prompt source | remote fetch edge | coverage_limitation=REMOTE_RUNTIME_DEPENDENCY | -0.30 |
| R16 | Generated/minified file | file limitation | coverage_limitation=OPAQUE_SOURCE | -0.40 |
| R17 | Python syntax only | language limitation | coverage_limitation=PYTHON_SEMANTIC_DEFERRED | -0.25 |
| R18 | Provider wrapper resolved | wrapper to provider call | ai_usage=PRESENT | +0.15 |
| R19 | Wrapper unresolved | unresolved wrapper | ai_usage=UNKNOWN | -0.25 |
| R20 | PII input types | input schema names | ai_input_types includes PERSONAL_DATA | +0.10 |
| R21 | Financial output | score/approval fields | ai_output_types includes SCORE_OR_DECISION | +0.10 |
| R22 | Affected applicant | loan applicant entity | affected_subjects=APPLICANTS | +0.10 |
| R23 | Affected candidate | candidate entity | affected_subjects=CANDIDATES | +0.10 |
| R24 | Human-readable recommendation | recommendation text output | automation_level=ASSISTIVE | +0.05 |
| R25 | Automatic notification only | send email/message no state change | downstream_action=COMMUNICATION | +0.05 |
| R26 | Material claim missing refs | claim no evidence refs | claim=BLOCKED_MISSING_EVIDENCE | block |
| R27 | Wizard/evidence mismatch | conflicting claim values | requires_reconciliation=true | block classification |
| R28 | Unknown critical purpose | purpose unknown in critical domain | legal_eligibility=BLOCKED | block |
| R29 | Citation prerequisite | VerifiedProfile ready | classification_request_allowed=true | 0 |
| R30 | Provider name alone | provider/model/framework only | no risk classification claim | hard guard |
