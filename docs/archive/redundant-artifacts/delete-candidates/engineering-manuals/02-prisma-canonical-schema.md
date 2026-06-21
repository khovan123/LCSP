# 02 Prisma Canonical Schema

## Purpose

Define the canonical PostgreSQL/Prisma schema that implementation must create in `packages/database/prisma/schema.prisma`.

These are documentation-time TypeScript and Prisma specifications. They define code to create later; no application code is created by this phase.

## Exact files to create

```text
packages/database/prisma/schema.prisma
packages/database/prisma/migrations/
packages/database/src/prisma.module.ts
packages/database/src/prisma.service.ts
packages/database/src/repositories/*.repository.ts
```

## Interfaces

```ts
interface PrismaTransactionContext { tx: unknown; correlationId: string }
interface RepositoryWriteResult<T> { record: T; auditEventId?: string; outboxEventId?: string }
interface TenantScope { organizationId: string; assessmentId?: string }
```

## Classes

| Class | Purpose | Constructor Dependencies | Methods |
|---|---|---|---|
| `PrismaService` | Own Prisma client lifecycle. | config | `onModuleInit()`, `onModuleDestroy()` |
| `TransactionService` | Wrap state/audit/outbox writes. | `PrismaService` | `runInTransaction()` |
| `BaseRepository` | Tenant-scoped DB helpers. | `PrismaService` | `assertScope()`, `create()`, `findById()` |
| `OutboxRepository` | Persist publishable envelopes. | `PrismaService` | `insert()`, `markPublished()`, `markFailed()` |

## DTO Catalog

```ts
interface PrismaModelId { id: string }
interface PaginatedQueryDto { limit: number; cursor?: string }
interface PaginatedResponseDto<T> { items: T[]; nextCursor?: string }
```

## Database Schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

enum Role { MANAGER DEVELOPER SYSTEM_WORKER }
enum AssessmentState { CREATED WIZARD_SUBMITTED REPOSITORY_CONNECTED SNAPSHOT_CREATED SCAN_REQUESTED SCAN_RUNNING SCAN_COMPLETED TECHNICAL_PROFILE_READY AI_USAGE_FLOW_READY RECONCILIATION_REQUIRED VERIFIED_PROFILE_READY CLASSIFICATION_RUNNING CLASSIFICATION_COMPLETED CLASSIFICATION_BLOCKED GAP_ANALYSIS_COMPLETED DOCUMENT_GENERATED DOCUMENT_BLOCKED }
enum ScanJobStatus { REQUESTED RUNNING COMPLETED FAILED CANCELLED }
enum GateType { SCHEMA QUALITY CITATION OUTPUT }
enum GateResult { PASSED PASSED_WITH_LIMITATIONS FAILED INSUFFICIENT }
enum ConflictStatus { UNRESOLVED RESOLVED }
enum WorkflowStatus { REQUESTED RUNNING COMPLETED BLOCKED FAILED }
enum ClaimSourceType { WIZARD TECHNICAL_EVIDENCE RECONCILIATION MANAGER_RESOLUTION }

model User { id String @id @db.Uuid email String @unique displayName String? createdAt DateTime @default(now()) oauthIdentities OAuthIdentity[] sessions Session[] }
model OAuthIdentity { id String @id @db.Uuid userId String @db.Uuid provider String subject String issuer String audience String createdAt DateTime @default(now()) user User @relation(fields:[userId], references:[id]) @@unique([provider, subject]) @@index([userId]) }
model UserMfaMethod { id String @id @db.Uuid userId String @db.Uuid methodType String secretCiphertext String enabled Boolean @default(false) createdAt DateTime @default(now()) @@index([userId]) }
model Session { id String @id @db.Uuid userId String @db.Uuid tokenHash String @unique expiresAt DateTime revokedAt DateTime? createdAt DateTime @default(now()) user User @relation(fields:[userId], references:[id]) @@index([userId, expiresAt]) }
model Organization { id String @id @db.Uuid name String createdAt DateTime @default(now()) assessments Assessment[] }
model Assessment { id String @id @db.Uuid organizationId String @db.Uuid name String state AssessmentState @default(CREATED) createdByUserId String @db.Uuid createdAt DateTime @default(now()) updatedAt DateTime @updatedAt organization Organization @relation(fields:[organizationId], references:[id]) wizardProfile WizardProfile? repositoryConnections GitHubRepositoryConnection[] snapshots RepositorySnapshot[] scanJobs RepositoryScanJob[] auditEvents AuditEvent[] @@index([organizationId, state]) }
model WizardProfile { id String @id @db.Uuid assessmentId String @unique @db.Uuid businessProcess String declaredAiUse String humanReviewDeclared String? submittedByUserId String @db.Uuid version Int @default(1) createdAt DateTime @default(now()) assessment Assessment @relation(fields:[assessmentId], references:[id]) }
model GitHubRepositoryConnection { id String @id @db.Uuid organizationId String @db.Uuid assessmentId String @db.Uuid githubInstallationId String githubRepositoryId String repositoryFullName String defaultBranch String? connectedByUserId String @db.Uuid createdAt DateTime @default(now()) assessment Assessment @relation(fields:[assessmentId], references:[id]) snapshots RepositorySnapshot[] @@unique([organizationId, githubInstallationId, githubRepositoryId]) @@index([assessmentId]) }
model RepositorySnapshot { id String @id @db.Uuid assessmentId String @db.Uuid repositoryConnectionId String @db.Uuid branchName String commitSha String manifest Json createdByUserId String @db.Uuid createdAt DateTime @default(now()) assessment Assessment @relation(fields:[assessmentId], references:[id]) connection GitHubRepositoryConnection @relation(fields:[repositoryConnectionId], references:[id]) scanJobs RepositoryScanJob[] @@unique([repositoryConnectionId, commitSha]) @@index([assessmentId, commitSha]) }
model RepositoryScanJob { id String @id @db.Uuid assessmentId String @db.Uuid repositorySnapshotId String @db.Uuid status ScanJobStatus @default(REQUESTED) rulesetVersion String idempotencyKey String @unique failureReason String? startedAt DateTime? completedAt DateTime? createdAt DateTime @default(now()) assessment Assessment @relation(fields:[assessmentId], references:[id]) snapshot RepositorySnapshot @relation(fields:[repositorySnapshotId], references:[id]) evidenceReport TechnicalEvidenceReport? @@index([assessmentId, status]) }
model TechnicalEvidenceReport { id String @id @db.Uuid assessmentId String @db.Uuid scanJobId String @unique @db.Uuid schemaVersion String scannerVersion String rulesetVersion String reportHash String qualityResult GateResult createdAt DateTime @default(now()) scanJob RepositoryScanJob @relation(fields:[scanJobId], references:[id]) findings TechnicalFinding[] evidenceRefs EvidenceReference[] graphNodes CodeGraphNode[] graphEdges CodeGraphEdge[] technicalProfile TechnicalProfile? @@index([assessmentId, reportHash]) }
model TechnicalFinding { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid findingType String confidence Float filePath String evidenceRef String metadata Json createdAt DateTime @default(now()) report TechnicalEvidenceReport @relation(fields:[technicalEvidenceReportId], references:[id]) @@index([technicalEvidenceReportId, findingType]) @@unique([technicalEvidenceReportId, evidenceRef]) }
model EvidenceReference { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid evidenceRef String filePath String fileHash String span Json? signalId String metadata Json report TechnicalEvidenceReport @relation(fields:[technicalEvidenceReportId], references:[id]) @@unique([technicalEvidenceReportId, evidenceRef]) }
model CodeGraphNode { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid nodeType String filePath String? evidenceRef String? metadata Json report TechnicalEvidenceReport @relation(fields:[technicalEvidenceReportId], references:[id]) @@index([technicalEvidenceReportId, nodeType]) }
model CodeGraphEdge { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid edgeType String fromNodeId String @db.Uuid toNodeId String @db.Uuid evidenceRef String? confidence Float report TechnicalEvidenceReport @relation(fields:[technicalEvidenceReportId], references:[id]) @@index([technicalEvidenceReportId, edgeType]) }
model TechnicalProfile { id String @id @db.Uuid assessmentId String @db.Uuid technicalEvidenceReportId String @unique @db.Uuid summary Json coverageLimitations Json createdAt DateTime @default(now()) report TechnicalEvidenceReport @relation(fields:[technicalEvidenceReportId], references:[id]) aiUsageFlows AIUsageFlow[] @@index([assessmentId]) }
model AIUsageFlow { id String @id @db.Uuid assessmentId String @db.Uuid technicalProfileId String @db.Uuid status String ruleSetVersion String uncertaintyReasons Json createdAt DateTime @default(now()) technicalProfile TechnicalProfile @relation(fields:[technicalProfileId], references:[id]) claims AIUsageFlowClaim[] @@index([assessmentId, status]) }
model AIUsageFlowClaim { id String @id @db.Uuid aiUsageFlowId String @db.Uuid claimType String value String sourceType ClaimSourceType evidenceRefs Json confidence Float uncertaintyReasons Json flow AIUsageFlow @relation(fields:[aiUsageFlowId], references:[id]) @@index([aiUsageFlowId, claimType]) }
model ConflictRecord { id String @id @db.Uuid assessmentId String @db.Uuid aiUsageFlowId String @db.Uuid conflictType String wizardClaim String? technicalClaim String? evidenceRefs Json status ConflictStatus @default(UNRESOLVED) createdAt DateTime @default(now()) resolutions ConflictResolution[] @@index([assessmentId, status]) }
model ConflictResolution { id String @id @db.Uuid conflictId String @db.Uuid resolvedByUserId String @db.Uuid resolutionType String rationale String evidenceRefs Json createdAt DateTime @default(now()) conflict ConflictRecord @relation(fields:[conflictId], references:[id]) @@index([conflictId]) }
model VerifiedProfile { id String @id @db.Uuid assessmentId String @db.Uuid aiUsageFlowId String @db.Uuid profileJson Json createdAt DateTime @default(now()) createdBy String @@index([assessmentId]) }
model LegalDocumentVersion { id String @id @db.Uuid documentIdentifier String version String title String issuer String sourceUrl String? contentHash String effectiveDate DateTime? createdAt DateTime @default(now()) rules LegalRule[] @@unique([documentIdentifier, version]) }
model LegalRule { id String @id @db.Uuid documentVersionId String @db.Uuid article String clause String? chunkId String textHash String ruleText String documentVersion LegalDocumentVersion @relation(fields:[documentVersionId], references:[id]) citations LegalCitation[] @@index([documentVersionId, article, clause]) }
model LegalCitation { id String @id @db.Uuid legalRuleId String @db.Uuid assessmentId String @db.Uuid citationText String citationCoverage String createdAt DateTime @default(now()) rule LegalRule @relation(fields:[legalRuleId], references:[id]) @@index([assessmentId]) }
model ClassificationRun { id String @id @db.Uuid assessmentId String @db.Uuid verifiedProfileId String @db.Uuid status WorkflowStatus @default(REQUESTED) blockedReason String? createdAt DateTime @default(now()) result RiskClassificationResult? @@index([assessmentId, status]) }
model RiskClassificationResult { id String @id @db.Uuid classificationRunId String @unique @db.Uuid assessmentId String @db.Uuid riskLevel String confidence Float legalCitationIds Json limitations Json createdAt DateTime @default(now()) run ClassificationRun @relation(fields:[classificationRunId], references:[id]) @@index([assessmentId]) }
model GapAnalysisResult { id String @id @db.Uuid assessmentId String @db.Uuid classificationResultId String @db.Uuid gaps Json score Float createdAt DateTime @default(now()) @@index([assessmentId]) }
model ComplianceDocument { id String @id @db.Uuid assessmentId String @db.Uuid classificationResultId String @db.Uuid documentType String status WorkflowStatus guardrailResult Json createdAt DateTime @default(now()) files GeneratedDocumentFile[] @@index([assessmentId, documentType]) }
model GeneratedDocumentFile { id String @id @db.Uuid complianceDocumentId String @db.Uuid storageKey String fileHash String contentType String createdAt DateTime @default(now()) document ComplianceDocument @relation(fields:[complianceDocumentId], references:[id]) @@index([complianceDocumentId]) }
model WorkflowRun { id String @id @db.Uuid assessmentId String @db.Uuid workflowType String status WorkflowStatus correlationId String @db.Uuid createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@index([assessmentId, status]) @@index([correlationId]) }
model OutboxEvent { id String @id @db.Uuid eventId String @unique @db.Uuid eventType String schemaVersion Int aggregateType String aggregateId String @db.Uuid correlationId String @db.Uuid causationId String? @db.Uuid payload Json status String retryCount Int @default(0) occurredAt DateTime @default(now()) publishedAt DateTime? @@index([status, occurredAt]) @@index([correlationId]) }
model AuditEvent { id String @id @db.Uuid organizationId String? @db.Uuid assessmentId String? @db.Uuid actorUserId String? @db.Uuid actorType Role eventType String correlationId String @db.Uuid causationId String? @db.Uuid metadata Json occurredAt DateTime @default(now()) assessment Assessment? @relation(fields:[assessmentId], references:[id]) @@index([assessmentId, occurredAt]) @@index([correlationId]) @@index([eventType]) }
```

## State Machines

Database-backed states are defined by `AssessmentState`, `ScanJobStatus`, `WorkflowStatus`, `ConflictStatus`, and gate/result enums above. Application state transitions are specified in `01-system-state-machines.md`.

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

Input: schema changes and migration order. Output: migrated database and generated Prisma client. Complexity: O(number of migrations + model count).

```text
create schema models in dependency order
run prisma format
run prisma migrate dev
run prisma generate
seed Manager, legal corpus metadata, fixture references
verify indexes and uniqueness with integration tests
```

Edge cases: raw source has no storage model; audit events are append-only; outbox publish failure never rolls back already committed domain state.
