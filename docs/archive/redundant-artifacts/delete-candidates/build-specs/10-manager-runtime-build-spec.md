# 10 Manager Runtime Build Spec

## Purpose

Specify the complete controlled MVP prototype runtime from Manager login to generated prototype document, including UI action, API endpoint, DTO, database writes, RabbitMQ events, worker processing, audit event, and user-visible result.

## Runtime ownership

| Concern | Owner |
|---|---|
| Frontend | `apps/web` Next.js assessment workspace |
| API | `apps/api` NestJS modules |
| Workers | `apps/worker` handlers |
| Database | PostgreSQL via Prisma repositories |
| Queue | RabbitMQ `lcsp.commands.v1`, `lcsp.events.v1`, `lcsp.deadletter.v1` |

## Folder structure

```text
apps/web/src/app/(app)/assessments/
apps/api/src/modules/{auth,assessments,github,scans,evidence,ai-usage-flow,reconciliation,classification,gap-analysis,documents,audit}/
apps/worker/src/handlers/{scan,ai-usage-flow,reconciliation,classification,gap-analysis,document}/
packages/contracts/src/
packages/database/prisma/
packages/scanner/src/
packages/ai-usage-flow/src/
packages/reconciliation/src/
packages/legal-rag/src/
packages/audit/src/
```

## DTO contracts

```json
{
  "OAuthCallbackRequestDto": { "code": "oidc-code", "state": "opaque-state", "nonce": "nonce" },
  "CreateAssessmentRequestDto": { "organizationId": "uuidv7", "name": "Prototype Assessment" },
  "WizardProfileRequestDto": { "businessProcess": "loan approval", "declaredAiUse": "decision support" },
  "ConnectGitHubRepositoryRequestDto": { "githubInstallationId": "123456", "githubRepositoryId": "987654" },
  "SelectRepositoryCommitRequestDto": { "repositoryConnectionId": "uuidv7", "branchName": "main", "commitSha": "abc123" },
  "StartRepositoryScanRequestDto": { "repositorySnapshotId": "uuidv7", "rulesetVersion": "scanner-rules-v0.1" },
  "ResolveConflictRequestDto": { "resolutionType": "MANAGER_CONFIRMATION", "rationale": "Manager confirms evidence", "evidenceRefs": ["ev-001"] },
  "RequestClassificationDto": { "verifiedProfileId": "uuidv7" },
  "DocumentGenerationRequestDto": { "classificationId": "uuidv7", "documentType": "prototype_summary", "format": "pdf" }
}
```

## Prisma models

Runtime writes: `User`, `OAuthIdentity`, `Session`, `Organization`, `Assessment`, `WizardProfile`, `GitHubRepositoryConnection`, `RepositorySnapshot`, `RepositoryScanJob`, `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `CodeGraphNode`, `CodeGraphEdge`, `TechnicalProfile`, `AIUsageFlow`, `AIUsageFlowClaim`, `ConflictRecord`, `ConflictResolution`, `VerifiedProfile`, `LegalCitation`, `ClassificationRun`, `RiskClassificationResult`, `GapAnalysisResult`, `ComplianceDocument`, `GeneratedDocumentFile`, `OutboxEvent`, `AuditEvent`.

Indexes: `(assessmentId,status)` on workflow tables, `correlationId` on audit/outbox, unique `eventId` on outbox, unique evidence ref per report, unique active profile/flow/result per assessment version.

## RabbitMQ contracts

| Workflow | Exchange | Routing key | Producer | Consumer |
|---|---|---|---|---|
| Scan | `lcsp.commands.v1` | `command.scan.requested.v1` | API outbox | ScanWorker |
| AIUsageFlow | `lcsp.commands.v1` | `command.ai-usage-flow.requested.v1` | profile builder/API | AIUsageFlowWorker |
| Reconciliation | `lcsp.commands.v1` | `command.reconciliation.requested.v1` | API/AIUsageFlow | ReconciliationWorker |
| Classification | `lcsp.commands.v1` | `command.classification.requested.v1` | API | ClassificationWorker |
| Gap | `lcsp.commands.v1` | `command.gap-analysis.requested.v1` | API | GapAnalysisWorker |
| Document | `lcsp.commands.v1` | `command.document.requested.v1` | API | DocumentWorker |

Envelope includes `eventId`, `eventType`, `schemaVersion`, `occurredAt`, `correlationId`, `causationId`, `aggregateType`, `aggregateId`, `producer`, and reference-only `payload`.

## Algorithms

1. UI sends Manager action with session and correlation ID.
2. API validates DTO, session, organization scope, permission, and state precondition.
3. Service writes domain state, audit event, and outbox command in one transaction when async.
4. Outbox publishes command.
5. Worker consumes idempotently, validates state, performs bounded processing, writes output/audit/outbox event.
6. UI reads persisted workflow status and renders success, blocked, or failure.
7. No step bypasses Schema Gate, Quality Gate, Reconciliation, VerifiedProfile, Citation Guardrail, or Output Guardrail.

## Pseudocode

```text
handleManagerAction(request):
  correlationId = requireCorrelationId(request)
  actor = requireSession(request)
  assertOrganizationScope(actor, assessmentId)
  assertPermission(actor, action.permission)
  assertStatePrecondition(action, assessmentId)
  transaction:
    writeDomainState(action)
    appendAuditEvent(action.accepted)
    if action.async: insertOutboxEnvelope(action.command)
  return workflowStateDto
```

## Failure handling

| Condition | Result | User-visible result | Audit |
|---|---|---|---|
| Invalid OAuth callback | 400 `OAUTH_CALLBACK_INVALID` | Login failed | `audit.auth.login_failed.v1` |
| Developer attempts Manager action | 403 `PERMISSION_DENIED` | Action unavailable | `audit.permission.denied.v1` |
| Missing VerifiedProfile | 422 `VERIFIED_PROFILE_REQUIRED` | Classification blocked | `audit.classification.blocked.v1` |
| Unresolved conflict | 409 `UNRESOLVED_CONFLICT` | Conflict workspace required | `audit.state.transition.blocked.v1` |
| Missing citation | 422 `CITATION_REQUIRED` | Output blocked/degraded | `audit.citation_guardrail.blocked.v1` |
| Retry exhausted | DLQ + failed/blocked state | Failed status with reason | component failure audit |

## Verification steps

Command: start local services following `docs/implementation-playbooks/15-local-development-playbook.md`, then execute the Manager golden path through UI/API.

Expected output: the assessment reaches generated prototype document or a documented blocked state with audit history. Queue payloads contain references only.

Success criteria: no raw source, secrets, full prompts, full AST bodies, uncited legal conclusions, or production compliance claims appear in logs, audit, queues, LLM calls, or persisted records.

## Acceptance criteria

- Given Manager login, when OAuth callback is valid, then Session and audit event are created.
- Given Manager selects repository and commit, when scan is requested, then scan job and command are created transactionally.
- Given valid scan output, when AIUsageFlow and reconciliation complete without conflict, then VerifiedProfile is created.
- Given unresolved conflict, classification is blocked.
- Given missing citation, document output is blocked or degraded.
- Given generated document, audit history traces every state transition by correlation ID.
