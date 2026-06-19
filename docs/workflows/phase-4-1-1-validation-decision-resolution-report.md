# Phase 4.1.1 Validation Execution Decision Resolution Report

## Scope

Phase 4.1.1 resolves the shape of validation execution decisions after `PHASE_4_2_VALIDATION_EXECUTION_BLOCKED`. It records proposed defaults, owner responsibilities, required approval evidence and remaining blockers for A1, A2, A2-b and A3.

This phase does not run participant sessions, collect real validation evidence, claim validation outcomes, create implementation artifacts, open backlog or change readiness status.

## Decisions Reviewed

| Decision ID | Validation | Selected Value | Status | Owner | Required Before |
|---|---|---|---|---|---|
| D-01 | All | Project Lead accountable; named reviewers or approved external reviewer roles required; no single person may be sole reviewer for A2, A2-b and A3 | PENDING_OWNER_CONFIRMATION | Product Manager / Project Lead | Any validation execution |
| D-02 | A1 | 1 pilot + 6 valid Manager-like sessions, 45 minutes max, synthetic prototype/demo data only | PENDING_OWNER_CONFIRMATION | Product Manager | A1 execution |
| D-02-THRESHOLDS | A1 | 5/6 task completion, 5/6 verified-evidence block comprehension, 5/6 Manager/Developer distinction, median <=25 minutes, no unresolved P0, max one P1 per critical task | PENDING_OWNER_CONFIRMATION | Product Manager | A1 execution |
| D-03 | A2 | Internal corpus versioning model `LCSP-LEGAL-CORPUS-v0.1.0`; actual source records still pending | PENDING_OWNER_CONFIRMATION | Product Manager / Legal Reviewer | A2 execution |
| D-03-REVIEW | A2 | 2 independent legal reviewers, 1 adjudicator, 30 stratified retrieval/rule-mapping cases | PENDING_OWNER_CONFIRMATION | Product Manager / Legal Reviewer | A2 execution |
| D-03-RULES | A2 | No fabricated citation; pinned corpus traceability; material mismatch fails; 90% adjudicated correctness; disagreements retained | PENDING_OWNER_CONFIRMATION | Legal Reviewer / Product Manager | A2 execution |
| D-04 | A2-b | A2-b1 pre-implementation mapping design validation; A2-b2 post-implementation empirical scanner acceptance gate | PENDING_OWNER_CONFIRMATION | Product Manager / Architect / QA | A2-b1 execution and post-implementation acceptance |
| D-04-THRESHOLDS | A2-b | 100% material evidence refs; 0 false automated/high-impact labels for safe fixtures; decision fixtures expected-or-blocked; dynamic/unsupported fixtures uncertain; disagreements recorded/adjudicated | PENDING_OWNER_CONFIRMATION | Architect / QA / Product Manager | A2-b1 execution |
| D-05 | A3 | 2 independent reviewers: governance/compliance and security/assurance | PENDING_OWNER_CONFIRMATION | Product Manager / Security Reviewer | A3 execution |
| D-05-THRESHOLDS | A3 | 100% critical scenarios fail closed, preserve evidence/audit, block unresolved conflict/missing citation, prevent silent overwrite, audit state changes | PENDING_OWNER_CONFIRMATION | Product Manager / Security Reviewer | A3 execution |
| D-06 | All | Access-controlled private evidence workspace, named custodian, role-based ACL, pseudonymization, prohibited data controls, encryption at rest if available | PENDING_OWNER_CONFIRMATION | Product Manager / Security Reviewer | Any validation execution |
| D-06-RETENTION | All | Proposed raw notes/recordings deletion in 30 days; redacted evidence, decision logs and aggregate findings retained 12 months; access review before each stream and closure | PENDING_OWNER_CONFIRMATION | Product Manager / Security Reviewer | Any validation execution |
| D-07 | A2-b / A3 | DRAFT -> REVIEW_READY -> APPROVED_FOR_VALIDATION -> RETIRED; approval requires version, hash, expected outcome, reviewer approval, privacy classification, release date and owner | PENDING_OWNER_CONFIRMATION | QA / Architecture | Fixture-based validation |

## A1 Decision Resolution

A1 now has a concrete proposed execution design:

- 1 pilot session.
- 6 valid Manager-like participant sessions.
- 45 minutes maximum per session.
- Synthetic prototype/demo data only.
- Critical tasks include assessment creation, WizardProfile completion, Repository Scan requirement understanding, blocked-state interpretation, Manager authority without Developer assignment and verified-evidence precondition understanding.
- P0/P1/P2 severity definitions are documented.

Remaining blocker:

```text
Product Manager approval and named execution roles are not recorded.
```

## A2 Decision Resolution

A2 now has a proposed corpus and legal review protocol:

- Internal corpus versioning model: `LCSP-LEGAL-CORPUS-v0.1.0`.
- Corpus source record fields are defined.
- Review model proposes 2 independent legal reviewers, 1 adjudicator and 30 stratified cases.
- Citation and rule-mapping decision rules are documented.

Remaining blockers:

```text
Actual corpus sources are not recorded.
Legal reviewer names or approved external reviewer roles are not recorded.
Corpus source hashes and approval status are not recorded.
```

## A2-b Scope and Fixture Resolution

A2-b is now explicitly split:

| Stream | Meaning | Execution Boundary |
| --- | --- | --- |
| A2-b1 | Pre-Implementation Mapping Design Validation | May validate expected scanner-rule design, evidence graph, AIUsageFlow claim model, uncertainty, reconciliation and legal-rule eligibility |
| A2-b2 | Post-Implementation Empirical Scanner Acceptance Validation | Must remain `POST_IMPLEMENTATION_ACCEPTANCE_GATE` until a real scanner implementation exists |

A2-b1 synthetic fixture specification cards were added inside `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md`. They are documentation-only cards, not executable source fixtures.

Remaining blockers:

```text
Fixture specification hashes are pending.
Required fixture release status remains DRAFT.
A2-b1 reviewer names or approved external reviewer roles are not recorded.
A2-b1 thresholds are not approved by owners.
```

## A3 Decision Resolution

A3 now has a proposed governance/security review model:

- 2 independent reviewers: governance/compliance and security/assurance.
- Required scenarios are aligned to Manager-owned conflict resolution and fail-closed behavior.
- Proposed thresholds require preserving scanner evidence/audit, blocking unresolved conflict/missing citation and preventing silent scanner overwrite.

Remaining blockers:

```text
Governance/security reviewers are not named or explicitly approved.
A3 thresholds are not owner-approved.
Shared evidence storage controls are not approved.
```

## Evidence Storage and Privacy Resolution

The minimum evidence storage model is now documented:

- access-controlled private evidence workspace;
- concrete provider/workspace/folder/reference required before execution;
- named custodian required;
- named roles or individuals required for access;
- retention owner required;
- deletion confirmation method required;
- no raw customer repository, credentials, secrets or full prompts;
- proposed retention policy for raw notes, redacted evidence and decision logs.

Remaining blocker:

```text
No concrete storage provider/location, custodian, ACL, retention owner or deletion confirmation method has been approved.
```

## Remaining Execution Blockers

| Blocker | Affected Validation |
| --- | --- |
| Required decision-log rows are `PENDING_OWNER_CONFIRMATION` | A1, A2, A2-b1, A3 |
| Named reviewers or explicitly approved external reviewer roles missing | A1, A2, A2-b1, A3 |
| Evidence storage provider/location/custodian/ACL/retention/deletion missing | A1, A2, A2-b1, A3 |
| Corpus sources, hashes and review approval status missing | A2 |
| Fixture hashes and `APPROVED_FOR_VALIDATION` release status missing | A2-b1 |
| A2-b2 depends on real scanner implementation | A2-b2 |

## Documents Updated

| Document | Update |
| --- | --- |
| `docs/validation/validation-execution-decision-log.md` | Created decision log with D-01..D-07 and approval status |
| `docs/validation/a1-wizard-validation-execution-pack.md` | Added Phase 4.1.1 session design, critical task and threshold defaults |
| `docs/validation/a2-legal-corpus-validation-execution-pack.md` | Added corpus versioning model, corpus source fields and review protocol defaults |
| `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md` | Added A2-b1/A2-b2 scope split, fixture specification cards and A2-b1 thresholds |
| `docs/validation/a3-human-attestation-validation-execution-pack.md` | Added review model and proposed governance thresholds |
| `docs/validation/participant-and-reviewer-recruitment-plan.md` | Added Phase 4.1.1 RACI matrix |
| `docs/validation/consent-privacy-and-data-handling-plan.md` | Added required storage decision fields and proposed retention policy |
| `docs/validation/validation-evidence-capture-template.md` | Added required execution metadata and proposed protocol versions |
| `docs/validation/validation-decision-rubric.md` | Added decision-log status values and A2-b result boundary |
| `docs/validation/validation-fixture-release-register.md` | Added fixture release governance and A2-b1 fixture artifact status |
| `docs/product/validation-execution-plan.md` | Added Phase 4.1.1 decision-log reference and A2-b scope split |
| `docs/product/validation-run-checklist.md` | Added Phase 4.1.1 decision approval checklist |
| `docs/product/validation-results-template.md` | Added decision-log and A2-b1/A2-b2 result boundary reference |
| `docs/qa/manual-validation-protocols.md` | Added Phase 4.1.1 decision resolution notes |
| `docs/qa/coverage-gap-register.md` | Added Phase 4.1.1 execution readiness gaps |
| `docs/design/traceability-matrix.md` | Added Phase 4.1.1 decision traceability |

## Explicitly Blocked Activities

- Running participant sessions.
- Collecting real validation evidence.
- Claiming validation outcomes.
- Creating source code, test source, CI/CD, Docker or infrastructure artifacts.
- Creating backlog, epics, stories, sprint plans or implementation tasks.
- Starting development execution.
- Changing readiness status.

## Decision

PHASE_4_1_1_DECISIONS_PARTIALLY_RESOLVED

No validation stream has all execution-critical decisions at `APPROVED_FOR_EXECUTION`, so no `PHASE_4_2_VALIDATION_EXECUTION_READINESS_RECHECK_ALLOWED` permission is granted yet.

Readiness remains unchanged:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
