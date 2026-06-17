# Manager Super-Role Policy

## Actors

LCSP controlled MVP defines exactly three actors:

```text
MANAGER
DEVELOPER
SYSTEM_WORKER
```

Authorization is deny-by-default.

## Manager Permissions

Manager is the active MVP super-role and can complete the full workflow alone.

```text
organization.read
organization.update
membership.read
assessment.create
assessment.read
assessment.update
assessment.archive
wizard.read
wizard.write
github.install
github.connect
github.disconnect
github.repository.select
github.commit.select
scan.start
scan.cancel
scan.retry
scan.read
technicalEvidence.read
technicalProfile.read
aiUsageFlow.read
reconciliation.read
reconciliation.resolve
classification.request
classification.read
gapAnalysis.request
gapAnalysis.read
document.request
document.read
document.download
audit.read
```

## Developer Permissions

Developer is optional and cannot block Manager workflow transitions.

```text
assessment.read
wizard.read
scan.read
technicalEvidence.read
technicalProfile.read
aiUsageFlow.read
reconciliation.read
classification.read
gapAnalysis.read
document.read
audit.read
```

Developer cannot connect GitHub App, select repository/commit, start/cancel/retry scan, resolve conflict, force VerifiedProfile, request classification, request gap analysis, request document generation, mutate technical evidence or mutate audit events.

## System Worker Permissions

System worker can consume approved command events, write system-generated findings, write TechnicalProfile, write AIUsageFlow, write reconciliation candidates, write classification/gap/document outputs and append audit events.

System worker cannot act as Manager, resolve human conflicts, override source evidence or bypass citation guardrail.

## Absolute Prohibitions

No actor, including Manager, may mutate original `TechnicalFinding`, delete original `TechnicalEvidenceReport`, overwrite immutable audit event, force VerifiedProfile while conflict is unresolved, force classification when evidence/citation gate fails, bypass legal citation requirement, send raw repository source directly to LLM, or write secrets into logs, audit, queues or evidence output.

## Enforcement Chain

```text
HTTP request
-> JwtAuthGuard
-> OrganizationMembershipGuard
-> PermissionGuard
-> StateTransitionGuard
-> service transaction
-> append immutable audit event
-> publish outbox event when needed
-> API response
```

## Enum, Guard and Decorator Names

| Concern | Name |
|---|---|
| Actor enum | `LcspActorType` |
| Permission enum | `LcspPermission` |
| Role enum | `LcspRole` |
| Auth guard | `JwtAuthGuard` |
| Organization scope guard | `OrganizationMembershipGuard` |
| Permission guard | `PermissionGuard` |
| State guard | `StateTransitionGuard` |
| Decorator | `@RequirePermission(LcspPermission.X)` |
| Scope decorator | `@AssessmentScope()` |

## Error Codes

| Error | HTTP | Code |
|---|---:|---|
| Missing session | 401 | `AUTH_REQUIRED` |
| Missing organization membership | 403 | `ORG_MEMBERSHIP_REQUIRED` |
| Missing permission | 403 | `PERMISSION_DENIED` |
| Invalid state transition | 409 | `STATE_TRANSITION_BLOCKED` |
| Gate prerequisite missing | 422 | `GATE_PRECONDITION_FAILED` |

## Audit Event Names

`audit.permission.denied.v1`, `audit.manager.action.accepted.v1`, `audit.state.transition.blocked.v1`, `audit.conflict.resolved.v1`, `audit.classification.requested.v1`, `audit.document.requested.v1`.

## Endpoint-to-Permission Matrix

| Endpoint | Permission |
|---|---|
| `POST /api/v1/assessments` | `assessment.create` |
| `PUT /api/v1/assessments/{assessmentId}/wizard-profile` | `wizard.write` |
| `POST /api/v1/assessments/{assessmentId}/github/repository-connections` | `github.connect` |
| `POST /api/v1/assessments/{assessmentId}/github/repository-snapshots` | `github.commit.select` |
| `POST /api/v1/assessments/{assessmentId}/scans` | `scan.start` |
| `POST /api/v1/assessments/{assessmentId}/reconciliation/conflicts/{conflictId}/resolution` | `reconciliation.resolve` |
| `POST /api/v1/assessments/{assessmentId}/classification` | `classification.request` |
| `POST /api/v1/assessments/{assessmentId}/gap-analysis` | `gapAnalysis.request` |
| `POST /api/v1/assessments/{assessmentId}/documents` | `document.request` |
| `GET /api/v1/assessments/{assessmentId}/audit-events` | `audit.read` |
