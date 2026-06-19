# Phase 4.1 Validation Execution Preparation Report

## Scope

Phase 4.1 prepares execution materials for real validation of:

- A1 - Wizard simplicity and completeness.
- A2 - Legal corpus and legal-rule reliability.
- A2-b - Scanner and AIUsageFlow mapping accuracy.
- A3 - Human attestation abuse and governance.

This phase creates validation execution packs, recruitment guidance, consent/privacy handling, evidence capture templates, a decision rubric and a fixture release register. It does not run validation, record results, create code, create test source, create backlog items or change readiness status.

## Source Documents Used

| Source Document | Use |
| --- | --- |
| `docs/workflows/phase-3-final-quality-documentation-checkpoint-report.md` | Entry condition and Phase 4 permission |
| `docs/product/validation-plan.md` | A1/A2/A2-b/A3 assumptions and validation intent |
| `docs/product/validation-execution-plan.md` | Existing execution plan and backlog gate |
| `docs/product/validation-results-template.md` | Result recording model and default blocked status |
| `docs/product/validation-run-checklist.md` | Operational checklist updated with Phase 4.1 preparation checks |
| `docs/qa/manual-validation-protocols.md` | Manual protocols for A1/A2/A2-b/A3 |
| `docs/qa/test-fixture-and-test-data-design.md` | Required fixture families and expected outcome design |
| `docs/qa/test-scenario-catalog.md` | Scenario coverage for MVP validation |
| `docs/qa/nfr-measurement-and-evidence-plan.md` | Evidence collection and NFR measurement expectations |
| `docs/qa/release-quality-gate-model.md` | Release quality gate references |
| `docs/qa/coverage-gap-register.md` | Open validation and implementation decision gaps |
| `docs/specs/implementation-contract.md` | Canonical role, evidence, gate and readiness invariants |
| `docs/specs/static-analysis-scanner-contract.md` | Static scanner and A2-b evidence constraints |
| `docs/specs/ai-usage-flow-analysis-spec.md` | AIUsageFlow claim-level evidence requirements |
| `docs/specs/ai-usage-rule-mapping-spec.md` | Rule mapping eligibility and provider-only guardrail |
| `docs/specs/legal-rule-citation-contract.md` | Citation and legal output requirements |
| `docs/specs/reconciliation-policy.md` | Manager-owned conflict resolution and evidence traceability |
| `docs/implementation/readiness-gates-and-handoff.md` | Handoff and validation gate constraints |
| `docs/implementation-readiness.md` | Current readiness status |

## Files Created

| File | Purpose |
| --- | --- |
| `docs/validation/README.md` | Validation package index and invariant summary |
| `docs/validation/a1-wizard-validation-execution-pack.md` | A1 participant criteria, tasks, scripts, observation and acceptance preparation |
| `docs/validation/a2-legal-corpus-validation-execution-pack.md` | A2 legal reviewer workflow, corpus provenance and citation verification preparation |
| `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md` | A2-b fixture matrix, expected scanner/AIUsageFlow outcomes and metric capture preparation |
| `docs/validation/a3-human-attestation-validation-execution-pack.md` | A3 abuse/governance scenario preparation |
| `docs/validation/participant-and-reviewer-recruitment-plan.md` | Participant/reviewer role plan and reviewer separation rules |
| `docs/validation/consent-privacy-and-data-handling-plan.md` | Consent, privacy, storage and retention preparation |
| `docs/validation/validation-evidence-capture-template.md` | Common evidence capture template |
| `docs/validation/validation-decision-rubric.md` | Validation decision rubric and update mapping |
| `docs/validation/validation-fixture-release-register.md` | Fixture version, integrity and release status register |
| `docs/workflows/phase-4-1-validation-execution-preparation-report.md` | Phase completion report |

## Files Updated

| File | Update |
| --- | --- |
| `docs/product/validation-execution-plan.md` | Added Phase 4.1 execution pack map and aligned A3 wording with Manager-owned conflict resolution |
| `docs/product/validation-run-checklist.md` | Added Phase 4.1 checklist and updated A3 abuse checks to remove MVP dual-confirmation wording |
| `docs/product/validation-results-template.md` | Added evidence capture and decision rubric references while preserving `NOT_RUN` / `BLOCKED` defaults |
| `docs/qa/manual-validation-protocols.md` | Added execution preparation references for A1/A2/A2-b/A3 |
| `docs/design/traceability-matrix.md` | Added Phase 4.1 validation execution preparation traceability |

## A1 Preparation Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Participant profile | Prepared with decisions required | SME Manager, compliance-oriented user and technical manager profiles are defined; final session count requires approval |
| Tasks | Prepared | Manager Wizard completion, unknown handling, blocked-state explanation and evidence requirement comprehension are covered |
| Moderator and observation materials | Prepared | Script, observation sheet and post-session questionnaire are defined |
| Acceptance thresholds | Prepared with decisions required | Candidate thresholds are documented; final threshold approval is required before execution |
| Required update path | Prepared | Result outcomes map to PRD, spec, UX, QA and readiness documentation updates |

## A2 Preparation Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Legal reviewer profile | Prepared with decisions required | Reviewer profile and independence expectations are defined; final reviewer count requires approval |
| Corpus provenance | Prepared | Source acceptance, version pinning and citation verification are covered |
| Sampling and disagreement handling | Prepared with decisions required | Sampling plan exists; final reviewer agreement threshold must be approved before execution |
| Missing/wrong citation behavior | Prepared | Missing citation blocks or degrades output according to canonical guardrails |
| Required update path | Prepared | Outcomes map to legal corpus, citation contract, RAG/rule matching and ADR updates if required |

## A2-b Preparation Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Fixture coverage | Prepared | Internal summarization, chatbot, loan approval, HR ranking, human-reviewed loan, auto decision, dynamic prompt, unsupported source, provider-only and wizard/source conflict fixtures are defined |
| Expected findings and AIUsageFlow claims | Prepared | Each fixture includes expected technical findings, claim values, confidence band, uncertainty and reconciliation outcome |
| Evidence eligibility | Prepared | Material claims require `evidence_refs`; claims without refs cannot drive legal matching or final classification |
| Abstention behavior | Prepared | Unknown/unclear critical purpose, human review or downstream action must block final classification or require traceable Manager clarification |
| Metrics | Prepared with decisions required | Required A2-b metrics are listed; final pass/fail thresholds require approval before execution |

## A3 Preparation Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Abuse scenarios | Prepared | Manager minimization, unsupported human-review claim, evidence removal attempt, unresolved conflict, declaration change and missing citation/document request are covered |
| Expected workflow response | Prepared | Unresolved conflict and missing citation block classification/final document generation |
| Audit evidence | Prepared | Required audit events and governance evidence are listed |
| Manager authority boundary | Prepared | Manager remains final conflict resolver but cannot silently erase scanner evidence |
| Acceptance thresholds | Prepared with decisions required | Governance thresholds require approval before execution |

## Fixture and Evidence-Capture Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Common evidence template | Prepared | Required fields include run ID, validation type, protocol version, reviewer role, observed/expected result, decision and privacy classification |
| Decision rubric | Prepared | PASS, PASS_WITH_REQUIRED_UPDATES, INCONCLUSIVE_REQUIRES_RERUN and FAIL_REQUIRES_PRODUCT_OR_ARCHITECTURE_AMENDMENT are defined |
| Fixture release register | Prepared with decisions required | Fixtures are listed as `DRAFT`; hashes/integrity refs and `APPROVED_FOR_VALIDATION` status must be completed before execution |
| Privacy constraints | Prepared | Synthetic fixtures are required by default; real customer repositories, secrets, raw prompts and personal data are excluded |

## Recruitment, Consent and Privacy Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Recruitment plan | Prepared with decisions required | Roles are separated across A1, A2, A2-b and A3; final participant/reviewer counts require approval |
| Reviewer separation | Prepared | One person must not be sole reviewer for both legal and technical decisions |
| Consent and privacy | Prepared with decisions required | Consent elements and prohibited data are defined; storage location and retention/deletion schedule require approval |
| Data minimization | Prepared | No real customer source, secret, raw prompt or personal data should enter validation artifacts |

## Open Decisions

| Item | Classification | Recommended Default | Owner | Required Before |
| --- | --- | --- | --- | --- |
| Final A1 participant/session count | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | 3-5 sessions across the defined Manager-like profiles | Product Manager | A1 execution |
| Final A1 acceptance threshold | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | No critical field missing; no Developer assistance required for core Wizard completion; blocked-state comprehension captured | Product Manager | A1 execution |
| A2 legal reviewer count and disagreement rule | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | At least two reviewers or one reviewer plus independent architecture/product review; disagreement logged and resolved before final decision | Product Manager + Legal Reviewer | A2 execution |
| A2 citation correctness/completeness threshold | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Any unsupported legal conclusion or missing critical citation fails the sample | Legal Reviewer | A2 execution |
| A2-b metric thresholds | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Approve thresholds for invocation precision, purpose mapping, input/output/action accuracy, human-review detection, abstention correctness and evidence completeness | Product Manager + Architect + QA | A2-b execution |
| A3 governance acceptance threshold | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Zero successful bypass of unresolved conflict, scanner evidence, citation guardrail or audit requirement | Product Manager + Governance/Security Reviewer | A3 execution |
| Fixture hashes and integrity references | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Assign versioned hash/integrity ref before changing fixtures to `APPROVED_FOR_VALIDATION` | QA Owner | A2-b/A3 execution |
| Evidence storage location and access control | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Use access-controlled project documentation storage; restrict raw notes to validation reviewers | Product Manager | Any validation execution |
| Validation evidence retention/deletion schedule | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Define retention period and deletion owner before collecting participant evidence | Product Manager + Security Reviewer | Any validation execution |
| Real A1/A2/A2-b/A3 outcomes | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Record outcomes with evidence references and decision rubric before any implementation planning | Product Manager | Implementation readiness review |
| Required PRD/spec/architecture/ADR/QA updates after validation | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Complete all required source updates before implementation backlog can be considered | Product Manager + Architect | Implementation readiness review |

## Explicitly Blocked Activities

- Running real participant interviews or reviewer sessions in this phase.
- Claiming A1, A2, A2-b or A3 validation results.
- Creating implementation backlog, epics, stories, sprint plans or implementation tasks.
- Creating source code, test source, CI/CD files, Dockerfiles or executable validation automation.
- Using real customer repositories, raw source, secrets, raw prompts or personal data in validation artifacts.
- Changing readiness status or opening implementation execution.

## Decision

PHASE_4_1_VALIDATION_PREPARATION_COMPLETED_WITH_DECISIONS_REQUIRED

PHASE_4_2_VALIDATION_EXECUTION_READINESS_CHECK_ALLOWED

This permission allows only `bmad-checkpoint-preview` to review whether A1, A2, A2-b and A3 may start collecting real validation evidence.

It does not permit implementation backlog creation, code generation, test automation, CI/CD setup, sprint planning or development execution.

Readiness remains unchanged:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
