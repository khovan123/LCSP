# 10 Manager End-to-End Runtime Spec

## 1. Purpose

Define the complete controlled MVP runtime path from Manager login to generated prototype document. No step may bypass Manager authorization, repository scan evidence, VerifiedProfile, citation guardrail or output guardrail.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | LCSP Controlled MVP Runtime |
| Module name | `manager-golden-path` |
| NestJS module | API modules under `apps/api/src/modules/*` |
| Worker name | scan, AIUsageFlow, reconciliation, classification, gap-analysis, document handlers |
| Database ownership | all aggregate workflow tables |
| Queue ownership | all command/event queues in `lcsp.*.v1` |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| Next.js | locked npm | Manager UI | canonical frontend | separate SPA shell |
| NestJS | locked npm | API runtime | canonical backend | raw Express |
| Prisma/PostgreSQL | locked | persistence | canonical DB | document-only store |
| RabbitMQ | pinned runtime | async jobs | canonical queue | inline long-running work |
| MinIO/S3 adapter | pinned local | generated artifacts | local prototype storage | DB blob storage |

## 4. Folder Structure

```text
apps/web/src/app/(app)/assessments/       Manager pages
apps/api/src/modules/                     API modules per step
apps/worker/src/handlers/                 async workers
packages/contracts/src/                   shared DTO/event contracts
packages/scanner/src/                     scanner runtime
packages/reconciliation/src/              reconciliation logic
packages/legal-rag/src/                   legal retrieval/citation guardrail
packages/document-generation/src/         document shell
```

## 5. DTO Contracts

Representative command DTO:

```json
{
  "assessmentId": "018f0000-0000-7000-8000-000000000101",
  "correlationId": "018f0000-0000-7000-8000-000000000102",
  "requestedBy": "018f0000-0000-7000-8000-000000000103"
}
```

## 6. Database Models

This runtime touches: `User`, `OAuthIdentity`, `Session`, `Organization`, `Assessment`, `WizardProfile`, `GitHubRepositoryConnection`, `RepositorySnapshot`, `RepositoryScanJob`, `StaticAnalysisScan`, `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `EvidenceGateResult`, `TechnicalProfile`, `AIUsageFlow`, `AIUsageFlowClaim`, `ConflictRecord`, `ConflictResolution`, `VerifiedProfile`, `LegalDocumentVersion`, `LegalRule`, `LegalCitation`, `ClassificationRun`, `RiskClassificationResult`, `GapAnalysisResult`, `ComplianceDocument`, `GeneratedDocumentFile`, `AuditEvent`, `OutboxEvent`.

## 7. RabbitMQ Contracts

Every async step uses the envelope from `07-rabbitmq-build-spec.md`. Payloads contain IDs/refs only.

## 8. Algorithms

Runtime step table:

| Step | UI action | API endpoint | DTO | DB writes | RabbitMQ events | Worker processing | Output | Audit event |
|---:|---|---|---|---|---|---|---|---|
| 1 | Manager OAuth/OIDC login | `POST /api/v1/auth/oauth/callback` | `OAuthCallbackDto` | User, OAuthIdentity, Session | none | none | SessionDto + dashboard redirect | audit.auth.login_succeeded.v1 |
| 2 | Create assessment | `POST /api/v1/assessments` | `CreateAssessmentDto` | Assessment, AssessmentMember, AuditEvent | none | none | AssessmentDto | audit.assessment.created.v1 |
| 3 | Submit WizardProfile | `PUT /api/v1/assessments/{id}/wizard-profile` | `SubmitWizardProfileDto` | WizardProfile, AuditEvent | none | none | WizardProfileDto SUBMITTED | audit.wizard.submitted.v1 |
| 4 | Connect GitHub App repository | `POST /api/v1/assessments/{id}/github/repository-connections` | `ConnectRepositoryDto` | GitHubRepositoryConnection, AuditEvent | none | none | RepositoryConnectionDto | audit.github.repository.connected.v1 |
| 5 | Select branch and commit | `POST /api/v1/assessments/{id}/github/repository-snapshots` | `CreateRepositorySnapshotDto` | RepositorySnapshot, AuditEvent | none | none | RepositorySnapshotDto | audit.github.repository_snapshot.selected.v1 |
| 6 | Request scan | `POST /api/v1/assessments/{id}/scans` | `StartScanDto` | RepositoryScanJob, OutboxEvent, AuditEvent | command.scan.requested.v1 | none in API | RepositoryScanJobDto REQUESTED | audit.scan.requested.v1 |
| 7 | Scan worker completes evidence | `GET /api/v1/assessments/{id}/scans/{scanJobId}` | `path DTO` | StaticAnalysisScan, TechnicalEvidenceReport, TechnicalFinding, EvidenceReference, ScannerGraphNode/Edge/Path, AuditEvent | event.scan.completed.v1 | Scan worker static parser/detectors | TechnicalEvidenceReportDto | audit.scan.completed.v1 |
| 8 | Run evidence gates and TechnicalProfile | `POST /api/v1/assessments/{id}/evidence-gates` | `RunEvidenceGatesDto` | EvidenceGateResult, TechnicalProfile, AuditEvent | event.technical-profile.ready.v1 | Evidence gate projector | Gate status + TechnicalProfile | audit.evidence.gates.completed.v1 |
| 9 | Request AIUsageFlow | `POST /api/v1/assessments/{id}/ai-usage-flow` | `BuildAIUsageFlowDto` | OutboxEvent, AuditEvent | command.ai-usage-flow.requested.v1 | none in API | WorkflowJobAcceptedDto | audit.ai_usage_flow.requested.v1 |
| 10 | AIUsageFlow worker completes claims | `GET /api/v1/assessments/{id}/ai-usage-flow` | `path DTO` | AIUsageFlow, AIUsageFlowClaim, AuditEvent | event.ai-usage-flow.completed.v1 | Claim engine | AIUsageFlowDto | audit.ai_usage_flow.created.v1 |
| 11 | Run reconciliation | `POST /api/v1/assessments/{id}/reconciliation` | `RunReconciliationDto` | OutboxEvent, AuditEvent | command.reconciliation.requested.v1 | none in API | WorkflowJobAcceptedDto | audit.reconciliation.requested.v1 |
| 12 | Reconciliation produces conflict or VerifiedProfile | `GET /api/v1/assessments/{id}/reconciliation/conflicts` | `query DTO` | ConflictRecord or VerifiedProfile, AuditEvent | event.reconciliation.conflict-detected.v1 or event.reconciliation.verified-profile-created.v1 | Reconciliation worker | ConflictListDto or VerifiedProfileDto | audit.reconciliation.conflict_detected.v1 / audit.verified_profile.created.v1 |
| 13 | Manager resolves conflict if present | `POST /api/v1/assessments/{id}/reconciliation/conflicts/{conflictId}/resolution` | `ResolveConflictDto` | ConflictResolution, AuditEvent, optional OutboxEvent | command.reconciliation.requested.v1 | Reconciliation rerun | ConflictResolutionDto | audit.conflict.resolved.v1 |
| 14 | Request classification | `POST /api/v1/assessments/{id}/classification` | `RequestClassificationDto` | ClassificationRun, OutboxEvent, AuditEvent | command.classification.requested.v1 | none in API | WorkflowJobAcceptedDto | audit.classification.requested.v1 |
| 15 | Classification worker completes or blocks | `GET /api/v1/assessments/{id}/classification/{classificationId}` | `path DTO` | RiskClassificationResult, LegalCitation refs, AuditEvent | event.classification.completed.v1 or event.classification.blocked.v1 | Legal retrieval + citation guardrail | RiskClassificationResultDto or blocked state | audit.classification.completed.v1 / audit.classification.blocked.v1 |
| 16 | Request gap analysis | `POST /api/v1/assessments/{id}/gap-analysis` | `RequestGapAnalysisDto` | OutboxEvent, AuditEvent | command.gap-analysis.requested.v1 | none in API | WorkflowJobAcceptedDto | audit.gap_analysis.requested.v1 |
| 17 | Gap worker completes | `GET /api/v1/assessments/{id}/gap-analysis/{gapAnalysisId}` | `path DTO` | GapAnalysisResult, AuditEvent | event.gap-analysis.completed.v1 | Gap scoring worker | GapAnalysisResultDto | audit.gap_analysis.completed.v1 |
| 18 | Request document generation | `POST /api/v1/assessments/{id}/documents` | `RequestDocumentGenerationDto` | ComplianceDocument REQUESTED, OutboxEvent, AuditEvent | command.document.requested.v1 | none in API | WorkflowJobAcceptedDto | audit.document.requested.v1 |
| 19 | Document worker stores file | `GET /api/v1/assessments/{id}/documents/{documentId}` | `path DTO` | ComplianceDocument, GeneratedDocumentFile, AuditEvent | event.document.generated.v1 | Document renderer + MinIO adapter | ComplianceDocumentDto GENERATED | audit.document.generated.v1 |

Pseudocode:

```text
loginManager()
createAssessment()
submitWizardProfile()
connectGitHubRepository()
selectCommitSnapshot()
requestScan()
waitForScanCompleted()
runEvidenceGates()
buildAIUsageFlow()
runReconciliation()
if conflicts: managerResolveConflicts(); rerunReconciliation()
requestClassification()
if classificationBlocked: showBlockedReason(); stop
requestGapAnalysis()
requestDocumentGeneration()
showGeneratedDocumentWithPrototypeWarning()
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `AUTH_REQUIRED` | no session | Manager logs in |
| `PERMISSION_DENIED` | non-Manager action | block and audit |
| `GITHUB_COMMIT_RESOLUTION_FAILED` | selected commit invalid | Manager selects another commit |
| `EVIDENCE_QUALITY_INSUFFICIENT` | scan evidence not enough | rescan or show limitation |
| `UNRESOLVED_CONFLICT` | reconciliation conflict open | Manager resolves conflict |
| `CITATION_REQUIRED` | legal citation missing | block classification/document |
| `DOCUMENT_GENERATION_BLOCKED` | output guardrail failed | show blocked reason |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run dev --workspace @lcsp/api` | API ready | health OK |
| `npm run worker --workspace @lcsp/worker` | worker ready | queues bound |
| `npm run dev --workspace @lcsp/web` | web ready | login page renders |
| Manager golden path smoke | document generated or explicit blocked state | no skipped audit/event transitions |
