# 01 System State Machines

## Purpose

Define exact workflow states, transitions, guards, denied actions, and transition persistence for the controlled MVP prototype.

These are documentation-time TypeScript and Prisma specifications. They define code to create later; no application code is created by this phase.

## Exact files to create

```text
packages/contracts/src/state/
  assessment-state.ts
  workflow-state.ts
  state-transition.ts
  state-errors.ts
apps/api/src/common/guards/state-transition.guard.ts
apps/api/src/modules/workflow/workflow-state.service.ts
apps/api/src/modules/workflow/workflow-state.repository.ts
```

## Interfaces

```ts
type AssessmentState = 'CREATED' | 'WIZARD_SUBMITTED' | 'REPOSITORY_CONNECTED' | 'SNAPSHOT_CREATED' | 'SCAN_REQUESTED' | 'SCAN_RUNNING' | 'SCAN_COMPLETED' | 'TECHNICAL_PROFILE_READY' | 'AI_USAGE_FLOW_READY' | 'RECONCILIATION_REQUIRED' | 'VERIFIED_PROFILE_READY' | 'CLASSIFICATION_RUNNING' | 'CLASSIFICATION_COMPLETED' | 'CLASSIFICATION_BLOCKED' | 'GAP_ANALYSIS_COMPLETED' | 'DOCUMENT_GENERATED' | 'DOCUMENT_BLOCKED'

interface StateTransition {
  from: AssessmentState
  to: AssessmentState
  action: string
  actor: 'MANAGER' | 'SYSTEM_WORKER'
  preconditions: string[]
  auditEventType: string
}

interface TransitionDecision {
  allowed: boolean
  targetState?: AssessmentState
  deniedReason?: 'PERMISSION_DENIED' | 'STATE_TRANSITION_BLOCKED' | 'GATE_PRECONDITION_FAILED'
}
```

## Classes

| Class | Purpose | Constructor Dependencies | Methods |
|---|---|---|---|
| `AssessmentStateMachine` | Own allowed transitions. | `TransitionRuleRegistry` | `canTransition()`, `assertTransition()`, `nextState()` |
| `StateTransitionGuard` | NestJS guard before controller action. | `AssessmentStateMachine`, `PermissionService` | `canActivate()` |
| `WorkflowStateService` | Persist state changes transactionally. | `WorkflowStateRepository`, `AuditService` | `transitionAssessment()`, `markBlocked()`, `markFailed()` |
| `TransitionRuleRegistry` | Static transition table provider. | none | `getRules()`, `findRule()` |

## DTO Catalog

```ts
interface TransitionAssessmentRequestDto { assessmentId: string; action: string; expectedFrom?: AssessmentState; correlationId: string }
interface TransitionAssessmentResponseDto { assessmentId: string; previousState: AssessmentState; currentState: AssessmentState; auditEventId: string }
interface WorkflowBlockedDto { assessmentId: string; state: AssessmentState; blockedReason: string; requiredAction: string }
```

## Database Schema

```prisma
enum Role { MANAGER DEVELOPER SYSTEM_WORKER }
enum AssessmentState { CREATED WIZARD_SUBMITTED REPOSITORY_CONNECTED SNAPSHOT_CREATED SCAN_REQUESTED SCAN_RUNNING SCAN_COMPLETED TECHNICAL_PROFILE_READY AI_USAGE_FLOW_READY RECONCILIATION_REQUIRED VERIFIED_PROFILE_READY CLASSIFICATION_RUNNING CLASSIFICATION_COMPLETED CLASSIFICATION_BLOCKED GAP_ANALYSIS_COMPLETED DOCUMENT_GENERATED DOCUMENT_BLOCKED }
enum ScanJobStatus { REQUESTED RUNNING COMPLETED FAILED CANCELLED }
enum GateResult { PASSED PASSED_WITH_LIMITATIONS FAILED INSUFFICIENT }
enum ConflictStatus { UNRESOLVED RESOLVED }
enum WorkflowStatus { REQUESTED RUNNING COMPLETED BLOCKED FAILED }

model Assessment {
  id String @id @db.Uuid
  organizationId String @db.Uuid
  name String
  state AssessmentState @default(CREATED)
  createdByUserId String @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  wizardProfile WizardProfile?
  repositoryConnections GitHubRepositoryConnection[]
  snapshots RepositorySnapshot[]
  scanJobs RepositoryScanJob[]
  auditEvents AuditEvent[]
  @@index([organizationId, state])
}

model AuditEvent {
  id String @id @db.Uuid
  organizationId String? @db.Uuid
  assessmentId String? @db.Uuid
  actorUserId String? @db.Uuid
  actorType Role
  eventType String
  correlationId String @db.Uuid
  causationId String? @db.Uuid
  metadata Json
  occurredAt DateTime @default(now())
  assessment Assessment? @relation(fields: [assessmentId], references: [id])
  @@index([assessmentId, occurredAt])
  @@index([correlationId])
  @@index([eventType])
}
```

## State Machines

| State | Allowed Actions | Denied Actions | Transition Rules |
|---|---|---|---|
| `CREATED` | submit WizardProfile | scan/classify/document | `PUT wizard-profile` -> `WIZARD_SUBMITTED` |
| `WIZARD_SUBMITTED` | connect GitHub repository | classify/document | GitHub connection -> `REPOSITORY_CONNECTED` |
| `REPOSITORY_CONNECTED` | select branch/commit | scan without snapshot | snapshot selection -> `SNAPSHOT_CREATED` |
| `SNAPSHOT_CREATED` | request Repository Scan | classification/document | scan request -> `SCAN_REQUESTED` |
| `SCAN_REQUESTED` | worker start | duplicate non-idempotent scan | worker lock -> `SCAN_RUNNING` |
| `SCAN_RUNNING` | read progress, fail/complete | classify/document | scan complete -> `SCAN_COMPLETED`; fail -> blocked/failed |
| `SCAN_COMPLETED` | build TechnicalProfile | classify/document | schema/quality gates -> `TECHNICAL_PROFILE_READY` or blocked |
| `TECHNICAL_PROFILE_READY` | build AIUsageFlow | classify/document | flow completed -> `AI_USAGE_FLOW_READY` |
| `AI_USAGE_FLOW_READY` | run reconciliation | classify if no VerifiedProfile | conflicts -> `RECONCILIATION_REQUIRED`; none -> `VERIFIED_PROFILE_READY` |
| `RECONCILIATION_REQUIRED` | Manager resolve conflict | classify/document | all resolved -> `VERIFIED_PROFILE_READY` |
| `VERIFIED_PROFILE_READY` | request classification | document before classification | classification command -> `CLASSIFICATION_RUNNING` |
| `CLASSIFICATION_RUNNING` | read status | document | completed -> `CLASSIFICATION_COMPLETED`; blocked -> `CLASSIFICATION_BLOCKED` |
| `CLASSIFICATION_COMPLETED` | request gap/document | bypass citation/output guardrail | gap -> `GAP_ANALYSIS_COMPLETED`; document -> `DOCUMENT_GENERATED` |
| `CLASSIFICATION_BLOCKED` | inspect reason, resolve precondition | generate final document | after fix rerun classification |
| `DOCUMENT_GENERATED` | download/audit review | mutate generated content silently | new request creates new version |
| `DOCUMENT_BLOCKED` | inspect missing citation/conflict | claim final legal output | fix precondition and rerun |

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer | Retry | DLQ |
|---|---|---|---|---|---:|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | API outbox | `ScanWorker` | 3 | `lcsp.scan-worker.dlq.v1` |
| `lcsp.commands.v1` | `lcsp.ai-usage-flow-worker.v1` | `command.ai-usage-flow.requested.v1` | profile/API | `AIUsageFlowWorker` | 3 | `lcsp.ai-usage-flow-worker.dlq.v1` |
| `lcsp.commands.v1` | `lcsp.reconciliation-worker.v1` | `command.reconciliation.requested.v1` | API/flow | `ReconciliationWorker` | 3 | `lcsp.reconciliation-worker.dlq.v1` |
| `lcsp.commands.v1` | `lcsp.classification-worker.v1` | `command.classification.requested.v1` | API | `ClassificationWorker` | 3 | `lcsp.classification-worker.dlq.v1` |
| `lcsp.commands.v1` | `lcsp.gap-analysis-worker.v1` | `command.gap-analysis.requested.v1` | API | `GapAnalysisWorker` | 3 | `lcsp.gap-analysis-worker.dlq.v1` |
| `lcsp.commands.v1` | `lcsp.document-worker.v1` | `command.document.requested.v1` | API | `DocumentWorker` | 3 | `lcsp.document-worker.dlq.v1` |

## Algorithms

Input: current assessment state, actor, action, gate facts. Output: allowed transition or blocked error. Complexity: O(1) table lookup.

```text
function transition(assessmentId, action, actor):
  assessment = loadAssessment(assessmentId)
  rule = registry.find(assessment.state, action)
  if !rule: throw STATE_TRANSITION_BLOCKED
  assert actor matches rule.actor
  assert every rule.precondition is true
  transaction:
    update Assessment.state = rule.to
    append AuditEvent(rule.auditEventType)
  return new state
```

Edge cases: duplicate async event returns current terminal state; stale command with older causation ID is ignored; blocked states keep original evidence and require explicit Manager action.
