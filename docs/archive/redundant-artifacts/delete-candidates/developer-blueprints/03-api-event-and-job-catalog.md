# API, Event, and Job Catalog

## HTTP API Conventions

- Prefix: `/api/v1`.
- Auth: `Authorization: Bearer <session-token>`.
- Correlation: `x-correlation-id: <uuidv7>`.
- Internal path IDs: UUIDv7 only.
- Error body: `{ "code": "ERROR_CODE", "message": "safe message", "correlationId": "uuidv7" }`.

## Primary Endpoints

| Purpose | Method | Route | Permission | Request DTO | Response DTO | Async Effect |
|---|---|---|---|---|---|---|
| OAuth callback | POST | `/api/v1/auth/oauth/callback` | Public callback | `OAuthCallbackRequestDto` | `SessionDto` | Audit login event |
| Create assessment | POST | `/api/v1/assessments` | `assessment.create` | `CreateAssessmentDto` | `AssessmentDto` | Audit assessment created |
| Submit WizardProfile | PUT | `/api/v1/assessments/{assessmentId}/wizard-profile` | `wizard.write` | `SubmitWizardProfileDto` | `WizardProfileDto` | Audit wizard submitted |
| Connect GitHub repo | POST | `/api/v1/assessments/{assessmentId}/github/repository-connections` | `github.connect` | `RepositoryConnectionDto` | `RepositoryConnectionDto` | Audit repository connected |
| Select commit | POST | `/api/v1/assessments/{assessmentId}/github/repository-snapshots` | `github.commit.select` | `RepositorySnapshotRequestDto` | `RepositorySnapshotDto` | Audit snapshot selected |
| Start scan | POST | `/api/v1/assessments/{assessmentId}/scans` | `scan.start` | `StartScanDto` | `RepositoryScanJobDto` | Publish `command.scan.requested.v1` |
| Read evidence | GET | `/api/v1/assessments/{assessmentId}/technical-evidence-report` | `technicalEvidence.read` | none | `TechnicalEvidenceReportDto` | none |
| Build AIUsageFlow | POST | `/api/v1/assessments/{assessmentId}/ai-usage-flow` | system/Manager request | `BuildAIUsageFlowDto` | `WorkflowAcceptedDto` | Publish `command.ai-usage-flow.requested.v1` |
| Resolve conflict | POST | `/api/v1/assessments/{assessmentId}/reconciliation/conflicts/{conflictId}/resolution` | `reconciliation.resolve` | `ConflictResolutionDto` | `ConflictResolutionDto` | Publish `command.reconciliation.requested.v1` |
| Request classification | POST | `/api/v1/assessments/{assessmentId}/classification` | `classification.request` | `ClassificationRequestDto` | `WorkflowAcceptedDto` | Publish `command.classification.requested.v1` |
| Request gap analysis | POST | `/api/v1/assessments/{assessmentId}/gap-analysis` | `gapAnalysis.request` | `GapAnalysisRequestDto` | `WorkflowAcceptedDto` | Publish `command.gap-analysis.requested.v1` |
| Request document | POST | `/api/v1/assessments/{assessmentId}/documents` | `document.request` | `DocumentGenerationRequestDto` | `WorkflowAcceptedDto` | Publish `command.document.requested.v1` |

## RabbitMQ Topology Reference

Use `docs/developer-blueprints/11-rabbitmq-topology-and-event-contracts.md` as the source of truth for exchange, queue and routing-key names.

## Outbox Pattern

1. API validates command DTO.
2. API enforces `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard`, `StateTransitionGuard`.
3. Service starts transaction.
4. Service writes domain change and immutable audit event.
5. Service writes `OutboxEvent` row with UUIDv7 `eventId`.
6. Outbox publisher sends command to RabbitMQ after commit.
7. Consumer is idempotent by `eventId`.

## Prohibited Payload Content

No HTTP response, queue event or job payload may contain GitHub installation token, raw repository source, secret, full prompt or full AST body.
