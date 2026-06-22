# API Code Map

## Purpose

Define planned NestJS API modules before creating files.

## Folder Layout

```text
apps/api/src/
  app.module.ts
  common/
    auth/
    guards/
    dto/
    errors/
    audit/
    messaging/
    prisma/
  modules/
    auth/
    assessments/
    wizard/
    github/
    scans/
    reconciliation/
    classification/
    gap-analysis/
    documents/
    audit/
```

## Module Ownership

| Module Folder | Controllers | Services | Repositories | DTOs | Tables | Queues |
|---|---|---|---|---|---|---|
| `modules/auth` | `AuthController` | `AuthService`, `MfaService`, `SessionService` | `AuthRepository` | `OAuthCallbackDto`, `SessionDto` | `User`, `OrganizationMembership` | None |
| `modules/assessments` | `AssessmentController` | `AssessmentService`, `AssessmentStateService` | `AssessmentRepository` | `CreateAssessmentDto`, `AssessmentDto` | `Assessment` | None |
| `modules/wizard` | `WizardController` | `WizardProfileService` | `WizardRepository` | `SaveWizardProfileDto`, `WizardProfileDto` | `WizardProfile` | None |
| `modules/github` | `GitHubController`, `GitHubWebhookController` | `GitHubAppJwtFactory`, `GitHubInstallationTokenService`, `RepositorySnapshotService` | `GitHubRepository` | `ConnectRepositoryDto`, `RepositorySnapshotDto` | `RepositoryConnection`, `RepositorySnapshot` | optional snapshot event |
| `modules/scans` | `ScanController` | `ScanJobService` | `ScanJobRepository` | `StartRepositoryScanDto`, `ScanJobDto` | `RepositoryScanJob`, `OutboxEvent` | writes `OutboxEvent` for `command.scan.requested.v1` |
| `modules/reconciliation` | `ReconciliationController` | `ReconciliationService`, `VerifiedProfileService` | `ReconciliationRepository` | `ConflictResolutionDto`, `VerifiedProfileDto` | `ReconciliationConflict`, `VerifiedProfile` | writes `OutboxEvent` for `command.reconciliation.requested.v1` after Manager resolution |
| `modules/classification` | `ClassificationController` | `ClassificationQueryService` | `ClassificationRepository` | `RiskClassificationDto` | `RiskClassification`, `LegalRuleMatch` | None |
| `modules/gap-analysis` | `GapAnalysisController` | `GapAnalysisQueryService` | `GapAnalysisRepository` | `GapAnalysisDto`, `GapAnalysisBlockedDto` | `GapAnalysis` | None |
| `modules/documents` | `DocumentController` | `DocumentRequestService`, `DocumentQueryService` | `DocumentRepository` | `DocumentRequestDto`, `GeneratedDocumentDto` | `GeneratedDocument`, `OutboxEvent` | writes `OutboxEvent` for `command.document.requested.v1` |
| `modules/audit` | `AuditController` | `AuditQueryService`, `AuditWriter` | `AuditRepository` | `AuditEventDto` | `AuditEvent` | None |

## API Ownership Rule

Controllers validate HTTP shape and actor role. Services enforce state and domain preconditions. Repositories own Prisma access. Outbox writes must happen in the same transaction as the domain write.


## Phase 5.5 Controlled MVP Routes

| Method | Route | Controller |
| --- | --- | --- |
| `POST` | `/api/v1/assessments` | `AssessmentController.create` |
| `GET` | `/api/v1/assessments/:assessmentId` | `AssessmentController.get` |
| `POST` | `/api/v1/assessments/:assessmentId/wizard-profile` | `WizardController.saveProfile` |
| `POST` | `/api/v1/assessments/:assessmentId/github/repository-connections` | `GitHubController.connectRepository` |
| `POST` | `/api/v1/assessments/:assessmentId/repository-snapshots` | `GitHubController.createSnapshot` |
| `POST` | `/api/v1/assessments/:assessmentId/scans` | `ScanController.requestScan` |
| `GET` | `/api/v1/assessments/:assessmentId/scans/:scanJobId` | `ScanController.getScan` |
| `GET` | `/api/v1/assessments/:assessmentId/technical-profile` | `TechnicalProfileController.getLatest` |
| `GET` | `/api/v1/assessments/:assessmentId/ai-usage-flow` | `AIUsageFlowController.getLatest` |
| `GET` | `/api/v1/assessments/:assessmentId/reconciliation-conflicts` | `ReconciliationController.listConflicts` |
| `POST` | `/api/v1/assessments/:assessmentId/reconciliation-conflicts/:conflictId/resolve` | `ReconciliationController.resolveConflict` |
| `POST` | `/api/v1/assessments/:assessmentId/classifications` | `ClassificationController.requestClassification` |
| `GET` | `/api/v1/assessments/:assessmentId/classifications/latest` | `ClassificationController.getLatest` |
| `GET` | `/api/v1/assessments/:assessmentId/gap-analysis/latest` | `GapAnalysisController.getLatest` |
| `POST` | `/api/v1/assessments/:assessmentId/documents` | `DocumentController.requestDocument` |
| `GET` | `/api/v1/assessments/:assessmentId/documents/:documentId` | `DocumentController.getDocument` |
