# NestJS API Implementation

## Purpose

Define API backend boundaries, module responsibilities, validation, state transitions and async job handoff for LCSP MVP.

## Scope

The NestJS API owns synchronous request handling, authentication, authorization, domain state validation, persistence coordination, audit emission and queue job creation. It must not execute long-running scans, RAG/classification or document generation inline.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [System Runtime and Component Contracts](system-runtime-and-component-contracts.md)
- [API Contract Draft](../specs/api-contract-draft.md)
- [State Machine](../specs/state-machine.md)

## Implementation Boundaries

- Web calls API only.
- API enqueues jobs for scan, classification, RAG and document generation.
- Worker results are accepted through controlled result/status channels.
- All permission checks are server-side.
- OAuth/OIDC identity is not GitHub repository authorization.
- Manager has all active MVP permissions.

## Module Boundaries

| Module | Responsibility | Controller Boundary | Service Boundary | Repository Boundary |
| --- | --- | --- | --- | --- |
| Auth | Password/session login and logout | Login/logout endpoints | Credential/session policy | User, Session |
| OAuth/OIDC | Start login, validate callback, link identity | Auth redirect/callback endpoints | Provider validation, linking policy | OAuthIdentity |
| MFA | TOTP setup/challenge/reset/disable | MFA endpoints | MFA policy and verification | UserMfaMethod |
| User/Profile | Profile and security settings | Profile endpoints | User update policy | User |
| Organization | Organization membership context | Organization endpoints | Membership/RBAC policy | Organization |
| Assessment | Assessment lifecycle | Assessment endpoints | Workflow state guard | Assessment |
| Wizard | WizardProfile save/submit | Wizard endpoints | Wizard validation | WizardProfile |
| GitHub Integration | GitHub App connection | Repository connection endpoints | Installation/access policy | GitHubRepositoryConnection |
| Repository Scan | Scan request/status | Scan endpoints | Job enqueue/idempotency | RepositoryScanJob |
| Evidence | Evidence/report/finding read models | Evidence endpoints | Access + state policy | TechnicalEvidenceReport, TechnicalFinding |
| AIUsageFlow | Usage flow review | AIUsageFlow endpoints | Read/uncertainty policy | AIUsageFlow, AIUsageFlowClaim |
| Reconciliation | Conflict resolution | Conflict endpoints | Manager resolution policy | ConflictRecord, ConflictResolution |
| VerifiedProfile | Profile review/approval | VerifiedProfile endpoints | Prerequisite validation | VerifiedProfile |
| Classification | Classification request/result | Classification endpoints | Gate check + job enqueue | ClassificationRun, RiskClassificationResult |
| Gap Analysis | Gap results | Gap endpoints | Result access policy | GapAnalysisResult |
| Document | Document request/download | Document endpoints | Final report gate + storage refs | ComplianceDocument, GeneratedDocumentFile |
| Audit | Audit view/export | Audit endpoints | Redacted query/export policy | AuditEvent |
| Workflow / Job Status | Progress and blocking reasons | Status endpoints | State projection | WorkflowRun, job tables |
| Future Permission Delegation | Post-MVP delegated technical permissions | Permission endpoints if enabled | Grant/revoke policy | PermissionGrant |

## Request Validation

- Validate shape, enum values, identifiers, state version and idempotency key.
- Reject requests that would bypass gates or perform a transition from an invalid state.
- Treat all client-provided role/action flags as untrusted.

## Authentication and Permission Guards

- Active MVP Manager can perform all active workflow actions.
- Developer may only act in optional delegated scope where policy explicitly allows.
- OAuth/OIDC-linked identity still uses LCSP session, MFA and RBAC policy.
- GitHub App permissions are checked for repository access and never replace LCSP authorization.

## State Transition Validation

| Transition | Required Preconditions | Failure Behavior |
| --- | --- | --- |
| Submit WizardProfile | Assessment exists, Manager authorized, Wizard valid | Return validation errors |
| Connect repository | Manager authorized, GitHub App installation valid | Block scan until connected |
| Request scan | Repository connection exists, branch/commit selected, idempotency valid | Return existing job or block with reason |
| Resolve conflict | Conflict open, Manager authorized, traceable resolution supplied | Keep workflow paused |
| Request classification | VerifiedProfile ready, no unresolved conflict, usage purpose resolved | Return blocked state |
| Request document | Valid classification, citations, gap analysis and output guardrail preconditions | Return blocked state |

## Transaction Boundaries

- Persist domain state and audit event in the same transaction where critical transition must be atomic.
- Enqueue job after durable state creation using an outbox or equivalent delivery pattern.
- Worker result application must be idempotent against workflow run and job ids.

## Job Enqueue Pattern

API creates a durable job record, emits an audit event, publishes a queue message containing only references and correlation metadata, then returns job/status information. Queue payloads must not contain raw source, secrets or full prompts.

## Progress Strategy

Expose workflow progress through polling or SSE over API-owned status endpoints. The API must project Worker state from persisted job/workflow records, not by direct Web-to-Worker communication.

## Error Response Contract

| Field | Meaning |
| --- | --- |
| `error_code` | Stable machine-readable code |
| `message` | User-safe summary |
| `blocking_reason` | Gate or state reason when applicable |
| `correlation_id` | Trace id for audit/support |
| `recoverable` | Whether user can retry/correct |
| `required_action` | Next allowed user/system action |

## Idempotency Behavior

Use idempotency keys for repository scan request, classification request and document generation request. Repeated requests should return existing job/result when inputs and state version match.

## Audit Emission Pattern

Every critical transition emits audit metadata with actor, actor role, assessment id, workflow run id, action, before/after state when safe, result status, correlation id and redacted context.

## API Versioning Strategy

Use versioned public API groups and versioned async event contracts. Breaking changes require a migration note and compatibility policy before implementation.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Outbox implementation detail | Required pattern; exact table/transaction implementation deferred | Implementation |
| SSE versus polling per workflow status | API supports either contract style | Implementation |

