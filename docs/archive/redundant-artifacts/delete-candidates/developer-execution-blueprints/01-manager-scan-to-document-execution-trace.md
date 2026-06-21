# Manager Scan-To-Document Execution Trace

## Purpose

This is the first document a developer should read before implementing the controlled MVP golden path. It follows the Manager action from repository scan request to generated document shell.

## Seven-Question Trace Summary

| Question | Answer |
|---|---|
| User bấm nút gì? | Manager clicks `Run Repository Scan` on `/assessments/:assessmentId/repository`. |
| Request đi đâu? | `POST /api/assessments/:assessmentId/scans` with `StartRepositoryScanRequestDto`. |
| Service nào xử lý? | `AssessmentScanController.startScan()` -> `ScanJobService.startRepositoryScan()`. |
| DB đọc/ghi gì? | Reads `Assessment`, `RepositoryConnection`, `RepositorySnapshot`; writes `ScanJob`, `OutboxEvent`, `AuditEvent`. |
| Queue nào được publish? | `lcsp.commands` / `scan.requested` with `ScanRequestedPayload`. |
| Worker nào consume? | `ScanWorker.handleScanRequested()` consumes `scanner.commands`. |
| Output cuối cùng là object gì? | Final path produces `GeneratedDocument`, after `TechnicalEvidenceReport`, `TechnicalProfile`, `AIUsageFlow`, `VerifiedProfile`, `ClassificationResult`, and `GapAnalysis`. |

## Runtime Sequence

```text
Manager UI
  -> POST /api/assessments/:assessmentId/scans
  -> AssessmentScanController.startScan
  -> ScanJobService.startRepositoryScan
  -> ScanJob + OutboxEvent(scan.requested) + AuditEvent
  -> RabbitMQ scanner.commands
  -> ScanWorker.handleScanRequested
  -> TechnicalEvidenceReport
  -> event scan.completed
  -> TechnicalProfileWorker
  -> TechnicalProfile
  -> event technical-profile.ready
  -> AIUsageFlowWorker
  -> AIUsageFlow
  -> event ai-usage-flow.ready or reconciliation.required
  -> ReconciliationWorker / Manager Conflict Resolution
  -> VerifiedProfile
  -> ClassificationWorker
  -> ClassificationResult or ClassificationBlocked
  -> GapAnalysisWorker
  -> GapAnalysis
  -> DocumentWorker
  -> GeneratedDocument
```

## Execution Trace Table

| Step | Actor | Action | Input Object | Handler | DB Read | DB Write | Queue/Event | Output Object | Failure Mode |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Manager | Clicks `Run Repository Scan` | `assessmentId` | Next.js `RunScanButton` calls API client | None | None | None | HTTP request | Disabled if no repository snapshot. |
| 2 | API | Receives request | `StartRepositoryScanRequestDto` | `AssessmentScanController.startScan()` | Session, `Assessment` | None | None | Calls service | `403 MANAGER_REQUIRED`. |
| 3 | API Service | Creates scan job | `assessmentId`, `repositorySnapshotId` | `ScanJobService.startRepositoryScan()` | `RepositorySnapshot`, active scan lock | `ScanJob(status=REQUESTED)`, `AuditEvent(SCAN_REQUESTED)` | None | `ScanJob` | `409 SCAN_ALREADY_RUNNING`. |
| 4 | API Service | Schedules worker | `ScanJob` | `OutboxService.enqueue()` | None | `OutboxEvent(scan.requested)` | `scan.requested` after commit | `MessageEnvelope<ScanRequestedPayload>` | Outbox remains unpublished if RabbitMQ down. |
| 5 | RabbitMQ | Delivers scan command | `ScanRequestedPayload` | Queue `scanner.commands` | None | None | Consume `scan.requested` | Worker input | DLQ after retry budget. |
| 6 | Scanner Worker | Runs static scan | `ScanRequestedPayload` | `ScanWorker.handleScanRequested()` | `ScanJob`, `RepositorySnapshot` | `SourceFile`, graph rows, `TechnicalFinding`, `TechnicalEvidenceReport` | `scan.completed` | `TechnicalEvidenceReport` | `FAILED_FINAL` on cleanup/security failure. |
| 7 | Technical Profile Worker | Builds profile | `ScanCompletedPayload` | `TechnicalProfileWorker.handleScanCompleted()` | `TechnicalEvidenceReport`, `TechnicalFinding[]` | `TechnicalProfile`, `AuditEvent` | `technical-profile.ready` | `TechnicalProfile` | Blocks if schema/quality gate failed. |
| 8 | AIUsageFlow Worker | Builds usage flow | `TechnicalProfileReadyPayload` | `AIUsageFlowWorker.handleTechnicalProfileReady()` | `WizardProfile`, `TechnicalProfile`, `TechnicalFinding[]`, graph paths | `AIUsageFlow`, `AIUsageFlowClaim[]` | `ai-usage-flow.ready` or `reconciliation.required` | `AIUsageFlow` | Missing material evidence creates unresolved item. |
| 9 | Reconciliation | Resolves conflict if needed | `ReconciliationRequestedPayload` | `ReconciliationService.evaluate()` | `WizardProfile`, `TechnicalProfile`, `AIUsageFlow` | `ManagerConflictResolutionTask` or `VerifiedProfile` | `verified-profile.ready` after resolution | `VerifiedProfile` | Classification blocked while conflict unresolved. |
| 10 | Classification | Classifies only verified profile | `ClassificationRequestedPayload` | `ClassificationWorker.handleVerifiedProfileReady()` | `VerifiedProfile`, `AIUsageFlow`, legal citations | `ClassificationResult` or blocked reason | `classification.completed` or `classification.blocked` | `ClassificationResult` | Missing citation blocks/degrades output. |
| 11 | Gap Analysis | Produces gaps | `ClassificationCompletedPayload` | `GapAnalysisWorker.handleClassificationCompleted()` | `ClassificationResult`, requirements | `GapAnalysis` | `gap-analysis.completed` | `GapAnalysis` | No run if classification blocked. |
| 12 | Document | Generates output shell | `DocumentRequestedPayload` | `DocumentWorker.handleGapAnalysisCompleted()` | `ClassificationResult`, `GapAnalysis`, citations, evidence appendix | `GeneratedDocument`, object metadata | `document.generated` | `GeneratedDocument` | Output guardrail blocks missing citation. |

## Object Chain

```text
StartRepositoryScanRequestDto
  -> ScanJob
  -> MessageEnvelope<ScanRequestedPayload>
  -> TechnicalEvidenceReport
  -> MessageEnvelope<ScanCompletedPayload>
  -> TechnicalProfile
  -> MessageEnvelope<TechnicalProfileReadyPayload>
  -> AIUsageFlow
  -> MessageEnvelope<AIUsageFlowReadyPayload | ReconciliationRequestedPayload>
  -> VerifiedProfile
  -> ClassificationResult
  -> GapAnalysis
  -> GeneratedDocument
```

## Developer Implementation Rule

Do not implement a downstream handler until the previous row's output object and event payload exist as contracts. This prevents hidden object shape drift.
