# Runtime Object Handoff Map

## Purpose

Define the concrete object that crosses each service boundary. This is the map developers use when implementing API handlers, repositories, queue producers, queue consumers, and workers.

## End-To-End Object Handoff

| Boundary | Input Object | Handler | Output Object | Persistence | Event |
|---|---|---|---|---|---|
| UI -> API assessment | `CreateAssessmentRequestDto` | `AssessmentController.create()` | `AssessmentDto` | `Assessment`, `AuditEvent` | None |
| UI -> API wizard | `SaveWizardProfileRequestDto` | `WizardController.save()` | `WizardProfileDto` | `WizardProfile`, `AuditEvent` | None |
| UI -> API repository connect | `ConnectRepositoryRequestDto` | `GitHubController.connectRepository()` | `RepositorySnapshotDto` | `RepositoryConnection`, `RepositorySnapshot`, `AuditEvent` | Optional `repository.snapshot.created` |
| UI -> API scan | `StartRepositoryScanRequestDto` | `AssessmentScanController.startScan()` | `ScanJobDto` | `ScanJob`, `OutboxEvent`, `AuditEvent` | `scan.requested` |
| API -> Scanner Worker | `MessageEnvelope<ScanRequestedPayload>` | `ScanWorker.handleScanRequested()` | `TechnicalEvidenceReport` | scanner tables | `scan.completed` |
| Scanner -> Technical Profile | `MessageEnvelope<ScanCompletedPayload>` | `TechnicalProfileWorker.handleScanCompleted()` | `TechnicalProfile` | `TechnicalProfile`, `AuditEvent` | `technical-profile.ready` |
| Technical Profile -> AIUsageFlow | `MessageEnvelope<TechnicalProfileReadyPayload>` | `AIUsageFlowWorker.handleTechnicalProfileReady()` | `AIUsageFlow` | `AIUsageFlow`, `AIUsageFlowClaim`, `AuditEvent` | `ai-usage-flow.ready` or `reconciliation.required` |
| AIUsageFlow -> Reconciliation | `MessageEnvelope<ReconciliationRequestedPayload>` | `ReconciliationWorker.handleRequested()` | `ManagerConflictResolutionTask` or `VerifiedProfile` | conflict/verified profile tables | `verified-profile.ready` after resolution |
| VerifiedProfile -> Classification | `MessageEnvelope<VerifiedProfileReadyPayload>` | `ClassificationWorker.handleVerifiedProfileReady()` | `ClassificationResult` or `ClassificationBlocked` | classification tables | `classification.completed` or `classification.blocked` |
| Classification -> Gap Analysis | `MessageEnvelope<ClassificationCompletedPayload>` | `GapAnalysisWorker.handleClassificationCompleted()` | `GapAnalysis` | `GapAnalysis`, `AuditEvent` | `gap-analysis.completed` |
| Gap Analysis -> Document | `MessageEnvelope<GapAnalysisCompletedPayload>` | `DocumentWorker.handleGapAnalysisCompleted()` | `GeneratedDocument` | document metadata, object ref, audit | `document.generated` |

## Object Ownership

| Object | Owner Service | May Mutate | Must Not Mutate |
|---|---|---|---|
| `WizardProfile` | API Wizard module | Manager through Wizard API | Workers must not overwrite Manager declarations. |
| `RepositorySnapshot` | GitHub module | Snapshot service only | Scanner must not change selected commit. |
| `TechnicalEvidenceReport` | Scanner Worker | Scanner during scan only | Manager cannot edit scanner evidence. |
| `TechnicalFinding` | Scanner Worker | Scanner during scan only | AIUsageFlow cannot rewrite findings. |
| `TechnicalProfile` | Technical Profile Worker | Worker only | Reconciliation cannot rewrite technical profile. |
| `AIUsageFlow` | AIUsageFlow Worker | AIUsageFlow service only | Classification cannot invent claims. |
| `ManagerConflictResolutionTask` | Reconciliation module | Manager resolution API | Resolution cannot delete scanner evidence. |
| `VerifiedProfile` | Reconciliation module | Worker after clean reconciliation | Classification requires this object. |
| `ClassificationResult` | Classification Worker | Worker only | Document generation cannot alter legal decision basis. |
| `GeneratedDocument` | Document Worker | Worker only | No legal output without citation traceability. |

## Required Developer Checks At Each Handoff

| Check | Where |
|---|---|
| Actor authorization | Controller before service call. |
| State precondition | Service before DB transaction. |
| DTO validation | Controller and queue consumer boundary. |
| Idempotency | Before worker side effects. |
| Audit event | Same transaction as state-changing DB write. |
| Outbox event | Same transaction as domain object that caused it. |
| Redaction | Before persistence, logs, audit, or LLM Gateway. |
| Guardrail | Before classification and document generation. |

## One-Line Implementation Rule

Every boundary must have a named input type, named handler, named persisted object, named event payload, and named output type. If any name is missing, the implementation is not ready.
