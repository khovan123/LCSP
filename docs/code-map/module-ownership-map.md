# Module Ownership Map

## Purpose

Define the top-level engineering ownership map for LCSP modules.

## API Modules

| Module | Purpose | Dependencies | Owned DTOs | Owned Tables | Owned Queues | Owned APIs | Authoritative Docs |
|---|---|---|---|---|---|---|---|
| `auth` | OAuth/OIDC session and Manager authorization. | OIDC provider, session boundary, audit. | `LoginCallbackDto`, `SessionDto` | `User`, `OrganizationMembership`, `AuditEvent` | None | `/api/v1/auth/*` | `implementation/backend-implementation.md` |
| `assessments` | Assessment lifecycle and state preconditions. | auth, audit, repository, workflow state. | `CreateAssessmentDto`, `AssessmentDto`, `AssessmentStateDto` | `Assessment`, `AuditEvent` | None | `/api/v1/assessments/*` | `specs/assessment-lifecycle-spec.md` |
| `wizard` | Manager business declarations. | assessments, audit. | `SaveWizardProfileDto`, `WizardProfileDto` | `WizardProfile`, `AuditEvent` | None | `/api/v1/assessments/:assessmentId/wizard-profile` | `specs/assessment-lifecycle-spec.md` |
| `github` | GitHub App installation, repository selection, commit snapshot. | GitHub API, assessments, audit. | `ConnectRepositoryDto`, `RepositoryConnectionDto`, `RepositorySnapshotDto` | `RepositoryConnection`, `RepositorySnapshot` | None | `/api/v1/assessments/:assessmentId/github/repository-connections`, `/api/v1/assessments/:assessmentId/repository-snapshots` | `implementation/backend-implementation.md` |
| `scans` | Create scan jobs and expose scan status. | assessments, repository snapshot, queue, audit. | `StartRepositoryScanDto`, `ScanJobDto` | `RepositoryScanJob`, `OutboxEvent`, `AuditEvent` | `command.scan.requested.v1` | `/api/v1/assessments/:assessmentId/scans` | `specs/scanner-spec.md`, `implementation/scanner-implementation.md` |
| `reconciliation` | Conflict records and Manager resolution. | assessments, AIUsageFlow, audit. | `ConflictResolutionDto`, `VerifiedProfileDto` | `ReconciliationConflict`, `VerifiedProfile`, `AuditEvent` | `event.reconciliation.verified-profile-ready.v1` or `event.reconciliation.conflict-detected.v1` | `/api/v1/assessments/:assessmentId/reconciliation-conflicts/*` | `specs/assessment-lifecycle-spec.md` |
| `classification` | Classification status/results endpoints. | verified profile, legal matching, audit. | `ClassificationResultDto`, `ClassificationBlockedDto` | `RiskClassification`, `LegalRuleMatch`, `AuditEvent` | None from API; worker emits `event.classification.completed.v1` or `event.classification.blocked.v1` | `/api/v1/assessments/:assessmentId/classifications/*` | `specs/legal-classification-spec.md` |
| `documents` | Document request/status/download endpoints. | classification, citation traceability, object storage, audit. | `DocumentRequestDto`, `GeneratedDocumentDto` | `GeneratedDocument`, `AuditEvent` | `command.document.requested.v1` | `/api/v1/assessments/:assessmentId/documents/*` | `specs/document-generation-spec.md` |
| `audit` | Immutable audit query surface. | all modules. | `AuditEventDto` | `AuditEvent` | None | `/api/v1/assessments/:assessmentId/audit` | `implementation/backend-implementation.md` |

## Package Modules

| Package | Purpose | Dependencies | Owned DTOs | Owned Tables | Owned Queues | Owned APIs | Authoritative Docs |
|---|---|---|---|---|---|---|---|
| `packages/contracts` | Shared DTO/event/enums across API and workers. | None. | All cross-service DTOs/events. | None | Event envelope definitions. | None | `code-map/shared-contracts-code-map.md` |
| `packages/scanner` | Static-analysis scanner internals. | Tree-sitter, ts-morph, graphology. | Scanner internal DTOs. | `SourceFile`, `CodeGraphNode`, `CodeGraphEdge`, `TechnicalFinding`, `TechnicalEvidenceReport` | consumes `command.scan.requested.v1`, emits `event.scan.completed.v1` or `event.scan.failed.v1` | None | `code-map/scanner-code-map.md` |
| `packages/ai-usage-flow` | Rule engine for AIUsageFlow claims. | contracts, technical profile, findings. | `AIUsageFlowInput`, `AIUsageFlowClaim` | `AIUsageFlow`, `AIUsageFlowClaim` | consumes `command.ai-usage-flow.requested.v1`, emits `event.ai-usage-flow.completed.v1` or `event.ai-usage-flow.failed.v1` | None | `specs/assessment-lifecycle-spec.md` |
| `packages/legal-rag` | Legal corpus retrieval and citation matching. | vector store, legal corpus. | `LegalMatchRequest`, `LegalRuleMatchDto` | `LegalCorpusVersion`, `LegalRuleMatch` | consumes `command.legal-matching.requested.v1`, emits `event.legal-matching.completed.v1` or `event.legal-matching.failed.v1` | None | `specs/legal-classification-spec.md` |

## Worker Modules

| Worker Module | Purpose | Dependencies | Owned DTOs | Owned Tables | Owned Queues | Owned APIs | Authoritative Docs |
|---|---|---|---|---|---|---|---|
| `scanner-worker` | Run Repository Scan. | `packages/scanner`, persistence, queue. | `ScanRequestedPayload`, `ScanCompletedPayload` | scanner evidence tables | `lcsp.scan-worker.v1` | None | `code-map/scanner-code-map.md` |
| `technical-profile-worker` | Build TechnicalProfile from evidence. | scanner evidence tables. | `TechnicalProfileRequestedPayload`, `TechnicalProfileCompletedPayload` | `TechnicalProfile` | `lcsp.technical-profile-worker.v1` | None | `code-map/worker-code-map.md` |
| `ai-usage-flow-worker` | Build AIUsageFlow. | packages/ai-usage-flow. | `AIUsageFlowRequestedPayload`, `AIUsageFlowCompletedPayload` | `AIUsageFlow`, `AIUsageFlowClaim` | `lcsp.ai-usage-flow-worker.v1` | None | `specs/assessment-lifecycle-spec.md` |
| `reconciliation-worker` | Create VerifiedProfile or conflict record. | lifecycle domain. | `ReconciliationRequestedPayload` | `ReconciliationConflict`, `VerifiedProfile` | `lcsp.reconciliation-worker.v1` | None | `developer-execution-blueprints/reconciliation-blueprint.md` |
| `classification-worker` | Risk classification from VerifiedProfile and legal matches. | legal-rag, classification. | `ClassificationRequestedPayload`, `ClassificationCompletedPayload` | `RiskClassification` | `lcsp.classification-worker.v1` | None | `specs/legal-classification-spec.md` |
| `document-worker` | Generate documents and object metadata. | document generation, object storage. | `DocumentRequestedPayload`, `DocumentGeneratedPayload` | `GeneratedDocument` | `lcsp.document-worker.v1` | None | `specs/document-generation-spec.md` |
