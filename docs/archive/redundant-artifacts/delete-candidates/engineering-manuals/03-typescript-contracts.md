# 03 TypeScript Contracts

## Purpose

Define canonical TypeScript interfaces, DTO names, envelope generics, and error DTOs shared by API, workers, scanner, and UI.

This is a construction manual only; no source code is created in this phase.

## Exact files to create

```text
packages/contracts/src/index.ts
packages/contracts/src/common/ids.ts
packages/contracts/src/common/errors.ts
packages/contracts/src/events/envelope.ts
packages/contracts/src/api/*.dto.ts
packages/contracts/src/scanner/*.dto.ts
packages/contracts/src/ai-usage-flow/*.dto.ts
packages/contracts/src/reconciliation/*.dto.ts
packages/contracts/src/classification/*.dto.ts
packages/contracts/src/documents/*.dto.ts
```

## Interfaces

```ts
export type UUID = string
export type Role = 'MANAGER' | 'DEVELOPER' | 'SYSTEM_WORKER'
export type FindingType = 'AI_PROVIDER_DEPENDENCY' | 'AI_MODEL_INVOCATION' | 'AI_FRAMEWORK_USAGE' | 'OUTPUT_FEEDS_DECISION' | 'HUMAN_REVIEW_SIGNAL' | 'COVERAGE_LIMITATION'
export type WorkflowStatus = 'REQUESTED' | 'RUNNING' | 'COMPLETED' | 'BLOCKED' | 'FAILED'

export interface MessageEnvelope<TPayload> { eventId: UUID; eventType: string; schemaVersion: 1; occurredAt: string; correlationId: UUID; causationId?: UUID; aggregateType: string; aggregateId: UUID; producer: string; payload: TPayload }
export interface TechnicalFinding { id: UUID; findingType: FindingType; confidence: number; filePath: string; evidenceRef: string; metadata: Record<string, unknown> }
export interface AIUsageFlowClaim { id: UUID; claimType: string; value: string; evidenceRefs: string[]; confidence: number; uncertaintyReasons: string[] }
export interface ErrorResponseDto { error: { code: string; message: string; correlationId: UUID; details?: Record<string, unknown> } }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `ContractSchemaRegistry` | Export Zod schemas and TS types. | none | `getSchema()`, `validate()` |
| `EnvelopeFactory` | Build typed RabbitMQ envelopes. | `UuidFactory`, clock | `command()`, `event()` |
| `ErrorDtoFactory` | Normalize errors. | none | `fromDomainError()`, `validationFailed()` |

## DTO Catalog

```ts
export interface StartRepositoryScanRequestDto { repositorySnapshotId: UUID; rulesetVersion: string }
export interface RepositoryScanJobDto { scanJobId: UUID; assessmentId: UUID; status: WorkflowStatus; failureReason?: string }
export interface TechnicalEvidenceReportDto { technicalEvidenceReportId: UUID; scanJobId: UUID; reportHash: string; findings: TechnicalFinding[] }
export interface BuildAIUsageFlowRequestDto { technicalProfileId: UUID; technicalEvidenceReportId: UUID }
export interface ResolveConflictRequestDto { resolutionType: 'MANAGER_CONFIRMATION' | 'UPDATED_DECLARATION'; rationale: string; evidenceRefs: string[] }
export interface RequestClassificationDto { verifiedProfileId: UUID }
export interface DocumentGenerationRequestDto { classificationId: UUID; documentType: 'prototype_summary'; format: 'html' | 'pdf' }
```

## Database Schema

```prisma
model RepositoryScanJob { id String @id @db.Uuid assessmentId String @db.Uuid repositorySnapshotId String @db.Uuid status ScanJobStatus @default(REQUESTED) rulesetVersion String idempotencyKey String @unique failureReason String? createdAt DateTime @default(now()) }
model TechnicalFinding { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid findingType String confidence Float filePath String evidenceRef String metadata Json @@index([technicalEvidenceReportId, findingType]) }
model AIUsageFlowClaim { id String @id @db.Uuid aiUsageFlowId String @db.Uuid claimType String value String evidenceRefs Json confidence Float uncertaintyReasons Json @@index([aiUsageFlowId, claimType]) }
model AuditEvent { id String @id @db.Uuid assessmentId String? @db.Uuid actorType Role eventType String correlationId String @db.Uuid metadata Json occurredAt DateTime @default(now()) @@index([correlationId]) }
```

## State Machines

Allowed transitions follow `01-system-state-machines.md`: Manager-originated requests advance assessment state only through valid predecessors; worker-originated events may only advance the state assigned to their command type. Denied transitions return `STATE_TRANSITION_BLOCKED` or `GATE_PRECONDITION_FAILED`.

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer | Payload Schema | Idempotency |
|---|---|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | API | ScanWorker | `ScanRequestedPayload` | `eventId` + `scanJobId` |
| `lcsp.commands.v1` | `lcsp.ai-usage-flow-worker.v1` | `command.ai-usage-flow.requested.v1` | API/profile | AIUsageFlowWorker | `AIUsageFlowRequestedPayload` | `eventId` + `technicalProfileId` |
| `lcsp.commands.v1` | `lcsp.reconciliation-worker.v1` | `command.reconciliation.requested.v1` | API/flow | ReconciliationWorker | `ReconciliationRequestedPayload` | `eventId` + `aiUsageFlowId` |
| `lcsp.commands.v1` | `lcsp.classification-worker.v1` | `command.classification.requested.v1` | API | ClassificationWorker | `ClassificationRequestedPayload` | `eventId` + `verifiedProfileId` |
| `lcsp.commands.v1` | `lcsp.document-worker.v1` | `command.document.requested.v1` | API | DocumentWorker | `DocumentRequestedPayload` | `eventId` + `documentRequestId` |

## Algorithms

Input: validated DTO or event. Output: persisted state, emitted event, and audit record. Complexity: O(1) for state checks plus O(n) over component-owned records.

```text
validate input
assert permission and state
load required records
process deterministic rules
transaction: persist output, audit, outbox
return DTO or publish event
```

Edge cases: duplicate event, stale state, missing citation/evidence, unauthorized actor, transient dependency failure.
