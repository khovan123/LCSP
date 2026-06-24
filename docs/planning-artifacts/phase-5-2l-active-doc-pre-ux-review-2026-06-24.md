# Phase 5.2L — Active-Document Pre-UX Review

## Review scope

Reviewed the current GitHub `main` baseline and the open PR #2 branch. `docs/archive/` was excluded from authority review.

## Verified repository state

| Item | Value |
|---|---|
| `main` HEAD | `73f47560a075fe7991ba2611a87f52abbe2e0496` |
| `origin/main` reported by agent | same SHA |
| Review branch | `docs/add-vietnamese-condensed-guide` |
| Open PR | `#2` |
| Reported Phase 5.2L proposal | not present on GitHub `main` or PR #2 at review time |
| Reported readiness report | not present on GitHub `main` or PR #2 at review time |

## Verdict

```text
NOT_READY_FOR_CANONICAL_UX
ACTIVE_DOCS_NOT_SYNCHRONIZED_FOR_PHASE_5_2L
```

The active documentation set is internally coherent for the earlier Phase 5.2K baseline, but it conflicts with the newer Project Owner Phase 5.2L direction.

## Blocking conflicts

| Area | Current active baseline | Required Phase 5.2L state |
|---|---|---|
| Authorization | RBAC / Manager-Developer role enforcement | PBAC as the source of truth; role only as attribute/template |
| Collaboration | Structured attestation active | Structured attestation removed from MVP |
| FR-050 | Future Local/CI report upload | Automatic trusted scan initiation; no manual upload |
| FR-051 | Future manual evidence JSON upload | Removed from product |
| Worker runtime | Python scanner plus Node.js downstream workers | Python Worker Platform for all asynchronous domain workloads |
| Scanner tools | `ast`/`libcst` and `ts-morph` | Add Syft, Knip, deptry, Semgrep, tree-sitter/custom parser |
| Product scope wording | Certification/regulator submission retained as out-of-scope concepts | Removed from product direction |
| Readiness marker | `ACTIVE_DOCS_PRE_UX_SYNCHRONIZED` | must be invalidated for Phase 5.2L until remediation closes |

## Affected active document groups

- product context, PRD, business rules and validation plan;
- use cases, task flows, FR, NFR, AC, baseline and traceability;
- domain model, state machines and event catalog;
- architecture and ADR authority/supersession register;
- scanner specs, implementation and data journey;
- backend, persistence, queue, legal, LLM, classification, reporting and audit docs;
- module/API/worker/shared-contract code maps;
- delivery plan, readiness certification and documentation indexes;
- `docs-vn/` summaries.

## Required closure sequence

```text
1. Commit/push the Phase 5.2L Sprint Change Proposal.
2. Project Owner approves or revises it.
3. Run documentation remediation across all active non-archive docs.
4. Resolve PBAC, auto-trigger, Python platform and scanner-tool technical decisions.
5. Rebuild canonical UC/FR/NFR/AC and traceability.
6. Run an active-document closure review.
7. Only after READY_FOR_CANONICAL_UX, run bmad-ux.
```

## UX gate

Do not start canonical UX from the current baseline. UX would otherwise encode removed attestation flows, RBAC assumptions, manual upload semantics, Node.js worker ownership, and an incomplete scanner evidence model.

## Status markers

```text
PROJECT_OWNER_DIRECTION_RECORDED
SPRINT_CHANGE_PROPOSAL_NOT_VERIFIABLE_ON_GITHUB
ACTIVE_DOCUMENT_REMEDIATION_REQUIRED
UX_HANDOFF_BLOCKED
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```