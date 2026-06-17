# API and Async Event Contracts

## Purpose

Define design-level API groups and async event contracts for LCSP MVP. This document is not runnable API code.

## Scope

The API exposes Manager-owned MVP workflow actions and optional Post-MVP delegation concepts. Async events describe workflow and audit-relevant transitions.

## Dependencies / Source References

- [NestJS API Implementation](nestjs-api-implementation.md)
- [State Machine](../specs/state-machine.md)
- [Implementation Contract](../specs/implementation-contract.md)

## Implementation Boundaries

- API groups are design contracts, not route implementation.
- API enqueues long-running work and returns job/status references.
- Queue/event payloads contain references and metadata, not raw source, full prompts or secrets.

## API Group Contract

| Purpose | Method | Request Fields | Response Fields | Permission | State Preconditions | Async Effect | Audit Event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth / password login | POST | credentials, CSRF/session context | session candidate or MFA required | public | no active session | none | login success/failure |
| OAuth/OIDC start/callback | GET/POST | provider, state/callback params | session candidate or failure | public | configured provider | none | OAuth callback result |
| MFA | POST | TOTP code/setup/reset request | MFA status/session continuation | authenticated/pending | MFA policy | none | MFA events |
| Profile | GET/PATCH | profile fields | profile view/update | self | authenticated | none | profile updated |
| Assessment | GET/POST | organization, assessment fields | assessment state | Manager | Manager session | none | `ASSESSMENT_CREATED` |
| Wizard | GET/PUT/POST | WizardProfile answers/version | saved/submitted WizardProfile | Manager | assessment exists | may unblock next state | `WIZARD_SUBMITTED` |
| GitHub Repository | GET/POST/DELETE | installation/repo/branch/commit refs | repository connection | Manager | assessment exists | none | `GITHUB_REPOSITORY_CONNECTED` |
| Repository Scan | POST/GET | assessment, repo, commit, idempotency key | scan job/status | Manager | repo connected | scan job queued | `REPOSITORY_SCAN_REQUESTED` |
| Evidence and Findings | GET | report/finding ids | report/finding summaries | Manager | scan completed | none | findings viewed |
| AIUsageFlow | GET | flow id/assessment | claim set/uncertainty | Manager | TechnicalProfile ready | none | AIUsageFlow viewed |
| Conflict Resolution | GET/POST | conflict id, resolution/update refs | resolution state | Manager | conflict open | reconciliation resume | `CONFLICT_RESOLVED` |
| VerifiedProfile | GET/POST | profile id/version approval | VerifiedProfile state | Manager | no unresolved conflict | may unlock classification | `VERIFIED_PROFILE_READY` |
| Classification | POST/GET | assessment, profile version | job/result/block reason | Manager | VerifiedProfile ready | classification job queued | `CLASSIFICATION_REQUESTED` |
| Gap Analysis | GET | classification/gap ids | gap result | Manager | classification valid | none | gap viewed |
| Documents | POST/GET | template/doc request | job/file/block reason | Manager | final report gate pass | document job queued | `DOCUMENT_GENERATION_REQUESTED` |
| Audit | GET/EXPORT | filters | redacted audit events/export | Manager | assessment/org access | optional export job | audit viewed/exported |
| Workflow Status | GET | assessment/workflow/job id | state, progress, blocking reason | Manager | assessment access | none | status viewed |
| Future Permission Delegation | POST/DELETE/GET | scope, grantee, permission code | grant status | Manager | Post-MVP enabled | none | grant/revoke audited |

## Event Catalogue

| Event | Producer | Meaning |
| --- | --- | --- |
| `ASSESSMENT_CREATED` | API | Manager created assessment |
| `WIZARD_SUBMITTED` | API | WizardProfile submitted |
| `GITHUB_REPOSITORY_CONNECTED` | API | GitHub App repo connection recorded |
| `REPOSITORY_SCAN_REQUESTED` | API | Scan job requested |
| `REPOSITORY_SCAN_STARTED` | Worker | Scanner started |
| `REPOSITORY_SCAN_COMPLETED` | Worker | Scanner completed |
| `REPOSITORY_SCAN_FAILED` | Worker | Scanner failed |
| `TECHNICAL_EVIDENCE_READY` | Worker | TechnicalEvidenceReport ready |
| `EVIDENCE_SCHEMA_FAILED` | Worker | Schema Gate failed |
| `EVIDENCE_QUALITY_INSUFFICIENT` | Worker | Quality Gate insufficient |
| `TECHNICAL_PROFILE_READY` | Worker | TechnicalProfile built |
| `AI_USAGE_FLOW_READY` | Worker | AIUsageFlow created |
| `CONFLICT_FOUND` | Worker | Reconciliation detected conflict |
| `MANAGER_CONFLICT_RESOLUTION_REQUIRED` | Worker/API | Manager task created |
| `CONFLICT_RESOLVED` | API | Manager resolution recorded |
| `VERIFIED_PROFILE_READY` | Worker/API | VerifiedProfile ready |
| `CLASSIFICATION_REQUESTED` | API | Classification job requested |
| `CLASSIFICATION_BLOCKED` | Worker/API | Gate blocked classification |
| `CLASSIFICATION_COMPLETED` | Worker | Classification completed |
| `GAP_ANALYSIS_COMPLETED` | Worker | Gap analysis completed |
| `DOCUMENT_GENERATION_REQUESTED` | API | Document job requested |
| `DOCUMENT_GENERATION_BLOCKED` | Worker/API | Final report gate blocked |
| `DOCUMENT_GENERATION_COMPLETED` | Worker | Document generated |

## Common Event Metadata

Every event should include event id, event type, assessment id, workflow run id, actor id/role where applicable, correlation id, source component, timestamp, input refs and redacted context.

## State / Error / Failure Handling

Events must be idempotently handled. Duplicate events with same event id or idempotency key must not create duplicate state transitions.

## Security and Privacy Considerations

Do not include raw source, full prompt, secrets, raw provider tokens or full AST bodies in API responses or events.

## Audit Requirements

Events and API transitions must map to audit events for critical workflow transitions.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Exact route naming | API groups defined; concrete route paths deferred | Implementation |
| Event transport envelope | Required fields defined; serialization details deferred | Implementation |

