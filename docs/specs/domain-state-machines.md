# LCSP Domain State Machines

## Purpose

This document is the single source of truth for LCSP domain state transitions.

It is domain behavior documentation only. It does not define physical schema, implementation files, queues, validation plans, stories, backlog or architecture changes. Physical enum definitions remain owned by `docs/implementation/persistence-implementation.md`.

## Common Rules

- A transition requires the guard condition to be true.
- Every state-changing transition writes an `AuditEvent`.
- Async transitions use the canonical command/event names in `docs/specs/event-catalog.md`.
- No transition may store raw source, full prompt, secret or full AST body.
- Classification cannot occur before `VerifiedProfile`.
- Legal matching must occur before classification.
- Any unresolved conflict blocks classification and final document generation.

## Assessment

### States

`CREATED`, `WIZARD_PROFILE_READY`, `REPOSITORY_CONNECTED`, `SNAPSHOT_CREATED`, `SCAN_REQUESTED`, `SCAN_RUNNING`, `SCAN_COMPLETED`, `TECHNICAL_PROFILE_READY`, `AI_USAGE_FLOW_READY`, `RECONCILIATION_REQUIRED`, `VERIFIED_PROFILE_READY`, `LEGAL_MATCHING_READY`, `CLASSIFICATION_READY`, `CLASSIFICATION_BLOCKED`, `GAP_ANALYSIS_READY`, `GAP_ANALYSIS_BLOCKED`, `DOCUMENT_GENERATED`, `DOCUMENT_BLOCKED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `ASSESSMENT_CREATED` | Manager authorized. | Create Assessment and audit. | `CREATED` |
| `CREATED` | `WIZARD_PROFILE_SAVED` | Required WizardProfile fields saved. | Persist WizardProfile version. | `WIZARD_PROFILE_READY` |
| `WIZARD_PROFILE_READY` | `REPOSITORY_CONNECTED` | Manager authorized; GitHub App connection selected. | Persist RepositoryConnection. | `REPOSITORY_CONNECTED` |
| `REPOSITORY_CONNECTED` | `SNAPSHOT_CREATED` | Commit/branch snapshot metadata exists. | Persist RepositorySnapshot. | `SNAPSHOT_CREATED` |
| `SNAPSHOT_CREATED` | `SCAN_REQUESTED` / `command.scan.requested.v1` | Idempotent ScanJob created. | Create ScanJob and outbox command. | `SCAN_REQUESTED` |
| `SCAN_REQUESTED` | `SCAN_STARTED` | Scanner worker owns job. | Mark scan running. | `SCAN_RUNNING` |
| `SCAN_RUNNING` | `event.scan.completed.v1` | TechnicalEvidenceReport persisted. | Mark scan completed. | `SCAN_COMPLETED` |
| `SCAN_COMPLETED` | `event.technical-profile.completed.v1` | TechnicalProfile persisted. | Mark profile ready. | `TECHNICAL_PROFILE_READY` |
| `TECHNICAL_PROFILE_READY` | `event.ai-usage-flow.completed.v1` | AIUsageFlow persisted. | Mark usage flow ready or conflicted. | `AI_USAGE_FLOW_READY` |
| `AI_USAGE_FLOW_READY` | `event.reconciliation.conflict-detected.v1` | One or more material conflicts exist. | Create conflict task. | `RECONCILIATION_REQUIRED` |
| `AI_USAGE_FLOW_READY` | `event.reconciliation.verified-profile-ready.v1` | No unresolved conflict exists. | Persist VerifiedProfile. | `VERIFIED_PROFILE_READY` |
| `RECONCILIATION_REQUIRED` | `event.reconciliation.verified-profile-ready.v1` | All conflicts resolved by Manager. | Persist VerifiedProfile. | `VERIFIED_PROFILE_READY` |
| `VERIFIED_PROFILE_READY` | `event.legal-matching.completed.v1` | LegalRuleMatch records persisted. | Mark legal basis ready. | `LEGAL_MATCHING_READY` |
| `LEGAL_MATCHING_READY` | `event.classification.completed.v1` | RiskClassification completed. | Mark classification ready. | `CLASSIFICATION_READY` |
| `LEGAL_MATCHING_READY` | `event.classification.blocked.v1` | Classification guardrail blocks output. | Preserve blocking reasons. | `CLASSIFICATION_BLOCKED` |
| `CLASSIFICATION_READY` | `event.gap-analysis.completed.v1` | GapAnalysis persisted. | Mark gap analysis ready. | `GAP_ANALYSIS_READY` |
| `CLASSIFICATION_READY` | `event.gap-analysis.blocked.v1` or `event.gap-analysis.failed.v1` | GapAnalysis cannot complete. | Preserve blocking reasons. | `GAP_ANALYSIS_BLOCKED` |
| `GAP_ANALYSIS_READY` | `event.document.generated.v1` | Document artifact metadata persisted. | Mark document generated. | `DOCUMENT_GENERATED` |
| `GAP_ANALYSIS_READY`, `GAP_ANALYSIS_BLOCKED`, or `CLASSIFICATION_BLOCKED` | `event.document.blocked.v1` | Document guardrail blocks final output. | Preserve blocking reasons. | `DOCUMENT_BLOCKED` |

### Invalid Transitions

- `CREATED -> SCAN_REQUESTED` without WizardProfile and repository snapshot.
- `SCAN_COMPLETED -> CLASSIFICATION_READY` without TechnicalProfile, AIUsageFlow, VerifiedProfile and LegalRuleMatch.
- `VERIFIED_PROFILE_READY -> CLASSIFICATION_READY` without `event.legal-matching.completed.v1`.
- `CLASSIFICATION_READY -> DOCUMENT_GENERATED` without `event.gap-analysis.completed.v1`.
- Any state with unresolved conflict -> `CLASSIFICATION_READY`.
- Provider/model/framework evidence alone -> `CLASSIFICATION_READY`.

### Failure Transitions

- `SCAN_RUNNING + event.scan.failed.v1 -> SCAN_REQUESTED` remains blocked for retry or failed job view; no downstream state.
- `TECHNICAL_PROFILE_READY` is not reached if `event.technical-profile.failed.v1` occurs.
- `AI_USAGE_FLOW_READY` is not reached if `event.ai-usage-flow.failed.v1` occurs.
- `LEGAL_MATCHING_READY` is not reached if `event.legal-matching.failed.v1` occurs.

### Recovery Transitions

- Failed scan may create a new idempotent ScanJob from `SNAPSHOT_CREATED`.
- Failed TechnicalProfile may rerun from the same accepted TechnicalEvidenceReport.
- Failed AIUsageFlow may rerun from the same TechnicalProfile after defect/recovery.
- `RECONCILIATION_REQUIRED` recovers only through Manager resolution and reconciliation rerun.

### Event Mapping

Uses all workflow events from `docs/specs/event-catalog.md`, especially `command.scan.requested.v1`, `event.scan.completed.v1`, `event.technical-profile.completed.v1`, `event.ai-usage-flow.completed.v1`, `event.reconciliation.conflict-detected.v1`, `event.reconciliation.verified-profile-ready.v1`, `event.legal-matching.completed.v1`, `event.classification.completed.v1`, `event.classification.blocked.v1`, `event.gap-analysis.completed.v1`, `event.gap-analysis.blocked.v1`, `event.document.generated.v1`, and `event.document.blocked.v1`.

### Example Journey

```text
CREATED
-> WIZARD_PROFILE_READY
-> REPOSITORY_CONNECTED
-> SNAPSHOT_CREATED
-> SCAN_REQUESTED
-> SCAN_RUNNING
-> SCAN_COMPLETED
-> TECHNICAL_PROFILE_READY
-> AI_USAGE_FLOW_READY
-> VERIFIED_PROFILE_READY
-> LEGAL_MATCHING_READY
-> CLASSIFICATION_READY
-> GAP_ANALYSIS_READY
-> DOCUMENT_GENERATED
```

## ScanJob

### States

`REQUESTED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `SCAN_REQUESTED` | Snapshot exists and idempotency key is unique. | Create ScanJob. | `REQUESTED` |
| `REQUESTED` | `command.scan.requested.v1` consumed | Worker lock acquired. | Write `SCAN_STARTED` audit. | `RUNNING` |
| `RUNNING` | `event.scan.completed.v1` | TechnicalEvidenceReport persisted. | Mark completion metadata. | `COMPLETED` |
| `REQUESTED` or `RUNNING` | `event.scan.failed.v1` | Failure code exists. | Store redacted failure reason. | `FAILED` |
| `REQUESTED` | Manager/system cancellation | Job not running. | Mark canceled and audit. | `CANCELED` |

### Invalid Transitions

- `COMPLETED -> RUNNING`.
- `FAILED -> COMPLETED` without a new ScanJob.
- `CANCELED -> RUNNING`.

### Failure Transitions

Parse failure, privacy guard failure, repository access failure or schema failure produce `FAILED` and `event.scan.failed.v1`.

### Recovery Transitions

Create a new ScanJob against the same or new RepositorySnapshot. Do not mutate completed/failed evidence.

### Event Mapping

`SCAN_REQUESTED`, `SCAN_STARTED`, `event.scan.completed.v1`, `event.scan.failed.v1`.

### Example Journey

`REQUESTED -> RUNNING -> COMPLETED`.

## TechnicalEvidenceReport

### States

`DRAFT`, `SCHEMA_VALID`, `QUALITY_VALID`, `QUALITY_INSUFFICIENT`, `FAILED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | Scanner builds report | ScanJob is `RUNNING`. | Persist report draft and findings. | `DRAFT` |
| `DRAFT` | Schema gate passed | Report matches contract. | Mark schema valid. | `SCHEMA_VALID` |
| `SCHEMA_VALID` | Quality gate passed | Evidence refs and privacy flags pass. | Mark quality valid. | `QUALITY_VALID` |
| `SCHEMA_VALID` | Quality gate insufficient | Missing evidence/coverage prevents downstream certainty. | Store actionable reason. | `QUALITY_INSUFFICIENT` |
| `DRAFT` or `SCHEMA_VALID` | Evidence/report failure | Fatal schema/privacy/integrity failure. | Store redacted failure. | `FAILED` |

### Invalid Transitions

- `QUALITY_VALID -> DRAFT`.
- `FAILED -> QUALITY_VALID` without a new report.
- `QUALITY_INSUFFICIENT -> QUALITY_VALID` without rerun or corrected source evidence.

### Failure Transitions

Schema invalid, raw source leakage, missing report hash or privacy failure yields `FAILED`.

### Recovery Transitions

Rerun scan to create a new TechnicalEvidenceReport. Do not overwrite failed report.

### Event Mapping

Feeds `event.scan.completed.v1` only when report is persisted; downstream profile should require `QUALITY_VALID`.

### Example Journey

`DRAFT -> SCHEMA_VALID -> QUALITY_VALID`.

## TechnicalProfile

### States

`NOT_CREATED`, `READY`, `BLOCKED`, `STALE`. These are derived domain states; the physical model is an immutable profile record.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| `NOT_CREATED` | `command.technical-profile.requested.v1` | TechnicalEvidenceReport is `QUALITY_VALID`. | Aggregate technical profile dimensions. | `READY` |
| `NOT_CREATED` | `event.technical-profile.failed.v1` | Evidence report missing/invalid. | Store failure reason. | `BLOCKED` |
| `READY` | New TechnicalEvidenceReport supersedes source. | New scan completed. | Preserve old profile; mark derived view stale. | `STALE` |

### Invalid Transitions

- Build from `QUALITY_INSUFFICIENT` as if complete.
- Mark provider-package-only evidence as confirmed AI use.

### Failure Transitions

Missing evidence refs, invalid report, or privacy failure emits `event.technical-profile.failed.v1`.

### Recovery Transitions

Rerun from corrected/valid TechnicalEvidenceReport.

### Event Mapping

`command.technical-profile.requested.v1`, `event.technical-profile.completed.v1`, `event.technical-profile.failed.v1`, `TECHNICAL_PROFILE_CREATED`.

### Example Journey

`NOT_CREATED -> READY`.

## AIUsageFlow

### States

`DRAFT`, `READY`, `UNCLEAR`, `CONFLICTED`, `BLOCKED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `command.ai-usage-flow.requested.v1` | WizardProfile, TechnicalProfile and TechnicalEvidenceReport exist. | Create flow draft and evaluate rules. | `DRAFT` |
| `DRAFT` | Rule evaluation completed | Material claims have evidence refs and no critical unknown/conflict. | Persist claims and summary. | `READY` |
| `DRAFT` | Rule evaluation completed with unknown critical usage. | Critical field unknown but no hard failure. | Persist uncertainty reasons. | `UNCLEAR` |
| `DRAFT` | Conflict rule matched. | Wizard/Profile/flow mismatch exists. | Persist conflict candidates. | `CONFLICTED` |
| `DRAFT` | Missing required source or failed evidence report. | Required input absent/failed. | Persist blocking reason. | `BLOCKED` |

### Invalid Transitions

- `READY` with material claims lacking evidence refs.
- `READY` from provider/model/framework presence alone.
- `READY` when unresolved critical conflict exists.

### Failure Transitions

Worker failure or invalid required input emits `event.ai-usage-flow.failed.v1`.

### Recovery Transitions

Regenerate AIUsageFlow from corrected TechnicalProfile/WizardProfile/TechnicalEvidenceReport. Existing flow remains audit history.

### Event Mapping

`command.ai-usage-flow.requested.v1`, `event.ai-usage-flow.completed.v1`, `event.ai-usage-flow.failed.v1`, `AI_USAGE_FLOW_CREATED`.

### Example Journey

Loan approval with automated decision evidence: `DRAFT -> CONFLICTED` if Wizard says assistive-only; otherwise `DRAFT -> READY`.

## Conflict

### States

`NOT_REQUIRED`, `CONFLICT_OPEN`, `RESOLVED`, `VERIFIED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| `NOT_REQUIRED` | Reconciliation compares profiles | No material mismatch exists. | No Conflict record required. | `NOT_REQUIRED` |
| `NOT_REQUIRED` | `event.reconciliation.conflict-detected.v1` | Material mismatch exists. | Create conflict and Manager task. | `CONFLICT_OPEN` |
| `CONFLICT_OPEN` | `RECONCILIATION_RESOLVED` | Manager resolution includes rationale. | Store resolution separately from scanner evidence. | `RESOLVED` |
| `RESOLVED` | Reconciliation rerun | All conflicts resolved and verified. | Include resolution in VerifiedProfile basis. | `VERIFIED` |

### Invalid Transitions

- `CONFLICT_OPEN -> VERIFIED` without Manager resolution.
- Delete or overwrite scanner evidence to resolve conflict.
- Developer finalizes conflict in MVP.

### Failure Transitions

Invalid/missing Manager rationale keeps `CONFLICT_OPEN`.

### Recovery Transitions

Manager updates resolution, requests rescan, or leaves conflict open with blocked workflow.

### Event Mapping

`event.reconciliation.conflict-detected.v1`, `RECONCILIATION_RESOLVED`, `event.reconciliation.verified-profile-ready.v1`.

### Example Journey

`CONFLICT_OPEN -> RESOLVED -> VERIFIED`.

## VerifiedProfile

### States

`NOT_CREATED`, `READY`, `BLOCKED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| `NOT_CREATED` | `event.reconciliation.verified-profile-ready.v1` | No unresolved conflict exists; required source profiles exist. | Persist VerifiedProfile version. | `READY` |
| `NOT_CREATED` | `event.reconciliation.conflict-detected.v1` | Any material conflict exists. | Block profile creation. | `BLOCKED` |
| `BLOCKED` | `RECONCILIATION_RESOLVED` + reconciliation rerun | All conflicts resolved. | Persist VerifiedProfile. | `READY` |

### Invalid Transitions

- Create VerifiedProfile without AIUsageFlow.
- Create VerifiedProfile with unresolved conflict.
- Create VerifiedProfile by overwriting scanner evidence.

### Failure Transitions

Missing source profiles or unresolved conflict keeps `BLOCKED`.

### Recovery Transitions

Resolve conflicts, regenerate profile inputs, or rerun reconciliation.

### Event Mapping

`event.reconciliation.verified-profile-ready.v1`, `VERIFIED_PROFILE_CREATED`.

### Example Journey

`NOT_CREATED -> READY`.

## LegalRuleMatch

### States

`REQUESTED`, `MATCHED`, `NOT_APPLICABLE`, `BLOCKED_UNKNOWN_FACT`, `BLOCKED_MISSING_CITATION`, `FAILED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `command.legal-matching.requested.v1` | VerifiedProfile exists. | Start legal matching run. | `REQUESTED` |
| `REQUESTED` | Rule applicability evaluated. | Required facts match and citations complete enough. | Persist LegalRuleMatch. | `MATCHED` |
| `REQUESTED` | Rule applicability evaluated. | Blocking fact exists or required facts absent. | Persist rationale. | `NOT_APPLICABLE` |
| `REQUESTED` | Rule applicability evaluated. | Critical fact unknown. | Persist blocking reason. | `BLOCKED_UNKNOWN_FACT` |
| `REQUESTED` | Citation coverage evaluated. | Required material citation missing. | Persist citation gap. | `BLOCKED_MISSING_CITATION` |
| `REQUESTED` | `event.legal-matching.failed.v1` | Missing profile/corpus/fatal error. | Persist failure reason if possible. | `FAILED` |

### Invalid Transitions

- `MATCHED` without citation coverage for material rule.
- Match based only on provider/model/framework presence.
- Classification command before legal matching completed.

### Failure Transitions

Missing VerifiedProfile, obsolete corpus or retrieval failure emits `event.legal-matching.failed.v1`.

### Recovery Transitions

Fix corpus/citations or VerifiedProfile unknown facts, then rerun legal matching.

### Event Mapping

`command.legal-matching.requested.v1`, `event.legal-matching.completed.v1`, `event.legal-matching.failed.v1`, `LEGAL_MATCHING_COMPLETED`.

### Example Journey

`REQUESTED -> MATCHED` for loan approval when required facts and complete citation exist.

## RiskClassification

### States

`REQUESTED`, `RUNNING`, `COMPLETED`, `BLOCKED`, `FAILED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `command.classification.requested.v1` | Legal matching completed. | Create requested classification. | `REQUESTED` |
| `REQUESTED` | Worker starts. | Lock acquired. | Evaluate VerifiedProfile + LegalRuleMatch. | `RUNNING` |
| `RUNNING` | `event.classification.completed.v1` | Required legal matches/citations sufficient. | Persist risk level and rationale. | `COMPLETED` |
| `RUNNING` | `event.classification.blocked.v1` | Missing citation, unresolved conflict, unknown critical usage, or insufficient legal match. | Persist blocking reasons. | `BLOCKED` |
| `REQUESTED` or `RUNNING` | Worker fatal failure. | Redacted failure exists. | Persist failure. | `FAILED` |

### Invalid Transitions

- `REQUESTED` before `event.legal-matching.completed.v1`.
- `COMPLETED` with unresolved conflict.
- `COMPLETED` from provider/model/framework presence alone.
- `COMPLETED` with missing material citation.

### Failure Transitions

Worker error yields `FAILED`; guardrail failure yields `BLOCKED`.

### Recovery Transitions

Resolve blocking reasons, rerun legal matching if needed, then request new classification.

### Event Mapping

`command.classification.requested.v1`, `event.classification.completed.v1`, `event.classification.blocked.v1`, `CLASSIFICATION_COMPLETED`, `CLASSIFICATION_BLOCKED`.

### Example Journey

`REQUESTED -> RUNNING -> COMPLETED`.

## GapAnalysis

### States

`REQUESTED`, `RUNNING`, `COMPLETED`, `BLOCKED`, `FAILED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `command.gap-analysis.requested.v1` | RiskClassification is `COMPLETED`. | Create gap-analysis run. | `REQUESTED` |
| `REQUESTED` | Worker starts. | Lock acquired and classification basis exists. | Evaluate obligations, gaps and priorities. | `RUNNING` |
| `RUNNING` | `event.gap-analysis.completed.v1` | Gap items and evidence/legal refs persisted. | Persist GapAnalysis result. | `COMPLETED` |
| `RUNNING` | `event.gap-analysis.blocked.v1` | Classification is blocked, citation basis missing, or required legal basis is unavailable. | Persist blocking reasons. | `BLOCKED` |
| `REQUESTED` or `RUNNING` | `event.gap-analysis.failed.v1` | Fatal worker or input failure. | Persist redacted failure. | `FAILED` |

### Invalid Transitions

- `REQUESTED` before `event.classification.completed.v1`.
- `COMPLETED` without a completed classification basis.
- `COMPLETED` without evidence/legal refs for gap items.
- `COMPLETED -> DOCUMENT_GENERATED` without `event.gap-analysis.completed.v1` projection creating `command.document.requested.v1`.

### Failure Transitions

Worker error yields `FAILED`; guardrail/precondition failure yields `BLOCKED`.

### Recovery Transitions

Resolve missing citation, legal-match, or classification blockers and create a new gap-analysis request. Do not mutate a completed or failed GapAnalysis result.

### Event Mapping

`command.gap-analysis.requested.v1`, `event.gap-analysis.completed.v1`, `event.gap-analysis.blocked.v1`, `event.gap-analysis.failed.v1`, `GAP_ANALYSIS_COMPLETED`, `GAP_ANALYSIS_BLOCKED`.

### Example Journey

`REQUESTED -> RUNNING -> COMPLETED`.

## GeneratedDocument

### States

`REQUESTED`, `GENERATED`, `BLOCKED`, `FAILED`.

### Transition Table

| Current State | Trigger Event | Guard Condition | Action | Next State |
|---|---|---|---|---|
| none | `command.document.requested.v1` | GapAnalysis is `COMPLETED`. | Create document request. | `REQUESTED` |
| `REQUESTED` | `event.document.generated.v1` | Citation/conflict/output guardrails pass. | Persist artifact metadata and hash. | `GENERATED` |
| `REQUESTED` | `event.document.blocked.v1` | Missing citation, unresolved conflict, unsupported final output or blocked classification. | Persist blocking reasons. | `BLOCKED` |
| `REQUESTED` | Worker fatal failure. | Redacted failure exists. | Persist failure. | `FAILED` |

### Invalid Transitions

- `GENERATED` without completed GapAnalysis.
- `GENERATED` with unresolved conflict.
- Final legal output without citation traceability.

### Failure Transitions

Template, storage or guardrail failure yields `FAILED` or `BLOCKED` depending on recoverability.

### Recovery Transitions

Fix citation/conflict/classification basis or storage/template failure, then create a new document request.

### Event Mapping

`command.document.requested.v1`, `event.document.generated.v1`, `event.document.blocked.v1`, `DOCUMENT_GENERATED`, `DOCUMENT_BLOCKED`.

### Example Journey

`REQUESTED -> GENERATED`.
