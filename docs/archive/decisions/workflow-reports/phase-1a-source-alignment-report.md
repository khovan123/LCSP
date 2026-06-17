# Phase 1A Source Alignment Report

## Scope

Phase 1A chỉ thực hiện source-alignment fixes cho các mismatch đã được Phase 0 checkpoint ghi nhận tại CP-04, CP-05, CP-06 và CP-14.

Operating mode:

```text
SOURCE_ALIGNMENT_FIXES_ONLY
```

Không tạo code, không tạo backlog/epic/story/sprint, không tạo Phase 1 runtime architecture output mới, không tạo `docs/implementation/*`, không chạy checkpoint trong lượt này và không đổi readiness status.

Source of truth:

```text
docs/specs/implementation-contract.md
-> docs/workflows/phase-0-checkpoint-review.md
-> PRD
-> ADR
-> Architecture
-> Specs
-> Detailed Design
```

## Files Updated

| File | Update Summary |
|---|---|
| `docs/architecture/multi-agent-system-architecture.md` | Replaced Developer-owned MVP repository connection/scan wording with Manager-owned MVP flow; updated orchestrator state machine entries; updated evidence-to-VerifiedProfile and conflict resolution sequences; added canonical role constraints. |
| `docs/specs/state-machine.md` | Updated repository connection/scan states so Manager is always able to act; optional Developer is non-blocking and scoped by delegation. |
| `docs/specs/reconciliation-policy.md` | Added explicit evidence-based Manager resolution rule and expanded MVP flow to Manager conflict-resolution task, re-run reconciliation, and VerifiedProfile only when no unresolved conflict remains. |
| `docs/design/ux-specification.md` | Renamed Developer Workspace UX section to optional/post-MVP delegated collaboration and clarified it is not required for MVP completion. |

## Manager-owned MVP Flow Changes

Updated canonical flow in affected docs:

```text
Manager connects GitHub Repository
-> Manager runs Repository Scan
-> Scanner creates TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> Manager Conflict Resolution when required
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
-> Gap Analysis
-> Document Generation
```

Key alignment changes:

- `docs/architecture/multi-agent-system-architecture.md` End-to-End Information Flow now says Manager connects GitHub Repository and Manager runs Repository Scan.
- `Evidence to VerifiedProfile Sequence` now starts scan from Manager Workspace.
- Orchestrator action flow no longer makes Developer the required scan actor.
- Developer absence is explicitly non-blocking.

## State Machine Changes

Updated state wording:

| State | Alignment |
|---|---|
| `WAITING_FOR_REPOSITORY_CONNECTION` | Waits for Manager to connect GitHub repository; optional delegated Developer may act only within Manager-granted scope. |
| `REPOSITORY_CONNECTED` | Entered by Manager repository connection or optional delegated actor within Manager scope. |
| `REPOSITORY_SCAN_RUNNING` | Entered by Manager running Repository Scan or optional delegated actor within Manager scope. |
| `EVIDENCE_COLLECTION_IN_PROGRESS` | Marked as legacy umbrella state; Manager-owned repository connection/scan states are the MVP model. |

No state transition now requires Developer as the only MVP actor.

## Conflict Resolution Changes

Updated conflict handling in `docs/architecture/multi-agent-system-architecture.md` and `docs/specs/reconciliation-policy.md`:

```text
Reconciliation detects conflict
-> Orchestrator pauses workflow
-> System creates Manager conflict-resolution task
-> Manager reviews WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs
-> Manager resolves, updates information or requests re-scan/correction
-> Orchestrator re-runs reconciliation if needed
-> VerifiedProfile only when no unresolved conflict remains
```

Manager resolution must remain evidence-based:

- Manager may confirm business meaning.
- Manager may update WizardProfile fields.
- Manager may accept/reject an interpretation with recorded rationale.
- Manager may request re-scan/correction.
- Manager must not arbitrarily override scanner evidence without traceable confirmation, updated information, evidence references and audit.

## Developer Optionality Changes

Developer is now consistently described in affected docs as:

```text
Optional technical collaborator.
Not required for MVP assessment completion.
```

Removed from MVP-required flow:

- Developer-owned repository connection.
- Developer-owned scan initiation.
- Developer final technical conflict resolution.
- Developer confirmation as unlock condition.

## Post-MVP Delegation References

Post-MVP delegation remains allowed only as scoped, optional collaboration:

- Manager may delegate a scoped technical clarification task.
- Developer clarification is input only.
- Developer input does not finalize conflict.
- Developer input does not unlock classification.
- Delegation never removes Manager permissions.

`docs/design/ux-specification.md` now labels Developer Workspace UX as:

```text
Optional / Post-MVP Delegated Collaboration
```

## Legacy Wording Scan Results

Scan scope:

- `docs/architecture/multi-agent-system-architecture.md`
- `docs/specs/state-machine.md`
- `docs/specs/reconciliation-policy.md`
- `docs/design/flowcharts.md`
- `docs/design/sequence-diagrams.md`
- `docs/design/ux-specification.md`
- `docs/design/use-case-specification.md`
- `docs/design/functional-requirements.md`
- `docs/design/business-rules.md`
- `docs/design/traceability-matrix.md`
- `docs/project/project-overview.md`

| Phrase | Remaining Occurrences | Allowed Location / Reason |
|---|---:|---|
| `Developer connects GitHub repository` | 0 | None. |
| `Developer connects GitHub Repository` | 0 | None. |
| `Developer runs repository scan` | 0 | None. |
| `Developer runs Repository Scan` | 0 | None. |
| `Developer technical conflict resolution` | 0 | None. |
| `Developer confirmation required` | 0 | None. |
| `Manager + Developer confirmation required` | 0 | None. |
| `Developer must resolve technical conflict` | 0 | None. |
| `Developer unlocks classification` | 0 | None. |
| `Manager connects GitHub Repository` | Present | Required canonical MVP wording in project overview and multi-agent architecture. |
| `Manager runs Repository Scan` | Present | Required canonical MVP wording in project overview, implementation contract, state machine and multi-agent architecture. |
| `Manager conflict-resolution task` | Present | Required canonical MVP conflict flow in implementation contract, reconciliation policy and multi-agent architecture. |
| `Manager is final conflict resolver` | Present | Required canonical role constraint in multi-agent architecture. |
| `Developer is optional in MVP` | Present | Required canonical role constraint in multi-agent architecture. |
| `Developer delegation is Post-MVP` | Present | Required canonical role constraint in multi-agent architecture. |

Additional Developer-related occurrences remain only in allowed contexts:

- optional delegated collaboration;
- post-MVP clarification;
- blocked-transition guard that says Developer alone cannot unlock classification;
- Deferred/Future evidence paths.

## Deferred Scope Verification

The following remain outside MVP main flow:

- Generic Submit Evidence.
- Manual Technical Evidence JSON.
- Local/CI Scanner Report Upload.
- CLI Evidence Submission.
- CI/CD Evidence Submission.
- API Probing.

Remaining occurrences of Local/CI/manual evidence are explicitly marked Deferred/Future/Enterprise in detailed design documents and are not active MVP flow.

## Items Explicitly Not Changed

This Phase 1A did not change:

- `docs/workflows/phase-0-checkpoint-review.md` decision.
- `docs/workflows/phase-1-checkpoint-review.md` decision.
- `docs/implementation/*` documents.
- PRD scope beyond the already aligned wording.
- ADR numbering or status.
- API implementation, database schema code or source code.
- Backlog, epics, stories, sprint plans or implementation tasks.
- Readiness status.

## Decision

PHASE_1A_SOURCE_ALIGNMENT_COMPLETED

Next allowed step:

```text
bmad-checkpoint-preview
```

Run checkpoint review for Phase 0 canonical contract and source-alignment fixes.

Current readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
