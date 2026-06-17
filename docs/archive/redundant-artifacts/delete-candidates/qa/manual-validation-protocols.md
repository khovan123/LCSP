# Manual Validation Protocols

## Purpose

Define manual validation protocols for A1, A2, A2-b and A3. This document records protocols only, not validation results.

## Common Rules

- Use synthetic fixtures and redacted materials only.
- Capture evidence for decisions and inconclusive outcomes.
- Update PRD, ADR, architecture, specs and QA docs after validation if results change assumptions.
- Do not unblock backlog until validation results are recorded and reviewed.

## A1 Wizard Simplicity / Completeness Validation

| Field | Protocol |
| --- | --- |
| Research question | Can Managers complete WizardProfile with enough business/legal truth without unacceptable complexity? |
| Participants / reviewers | Managers, compliance stakeholders, product reviewer |
| Material and fixture set | Wizard prototype/questions, example assessment contexts, blocked-state examples |
| Procedure | Observe participants completing Wizard; capture confusion, missing fields and time-to-complete |
| Data to capture | Completion rate, misunderstood questions, missing information, confidence rating, suggested wording |
| Acceptance thresholds | Thresholds to be defined by PM before result recording; no critical missing field accepted |
| Failure / inconclusive criteria | Participants cannot provide required fields or answer inconsistently |
| Bias and conflict controls | Use multiple domains and avoid coaching participants during task |
| Privacy safeguards | No real customer system data |
| Required evidence for decision | Session notes, anonymized response matrix, recommended Wizard changes |
| Required document updates after result | PRD, WizardProfile spec, UX, FR/BR/NFR, acceptance criteria |

## A2 Legal Corpus and Rule Reliability Validation

| Field | Protocol |
| --- | --- |
| Research question | Does the legal corpus/rule model provide reliable rule/citation basis for expected LCSP classifications? |
| Participants / reviewers | Legal/compliance reviewer, product owner, architecture reviewer |
| Material and fixture set | F-RAG-01, F-RAG-02, F-RAG-03, citation contract, corpus version |
| Procedure | Review retrieval results, citations, rule family mapping and missing-citation behavior |
| Data to capture | Correct citation rate, missing citation cases, ambiguous mapping, reviewer disagreement |
| Acceptance thresholds | Defined before validation; any unsupported legal conclusion is failure |
| Failure / inconclusive criteria | Rules cannot be cited, corpus coverage insufficient or ambiguous outputs unblocked |
| Bias and conflict controls | Blind review expected rule family before viewing system retrieval where possible |
| Privacy safeguards | Use synthetic profiles and public/approved legal corpus references only |
| Required evidence for decision | Corpus coverage matrix, reviewer notes, citation pass/fail table |
| Required document updates after result | Legal RAG spec, citation contract, scoring model, acceptance criteria |

## A2-b Scanner and AIUsageFlow Mapping Accuracy Validation

| Field | Protocol |
| --- | --- |
| Research question | Can scanner + AIUsageFlow accurately map AI usage purpose to legal rule/corpus with enough reliability for LCSP? |
| Participants / reviewers | QA, architecture, scanner owner, legal/RAG reviewer |
| Material and fixture set | F-SCAN-01..F-SCAN-12, F-RAG-01..F-RAG-03, F-CONFLICT-01..F-CONFLICT-02 |
| Procedure | Run fixture review manually or through later test harness; compare expected findings, claims, uncertainty and rule eligibility |
| Data to capture | AI invocation precision, business purpose precision, input/output/action accuracy, human-review accuracy, automated-decision false-positive rate, unknown/abstain correctness, evidence completeness |
| Acceptance thresholds | Must be defined before validation; provider/model/framework alone must never classify a system as high risk |
| Failure / inconclusive criteria | Unsupported claims drive legal matching, unclear usage produces final classification, false positives on automated/high-impact flow are unacceptable above threshold |
| Bias and conflict controls | Expected outputs reviewed before scoring; ambiguous fixture cases separated |
| Privacy safeguards | No real repositories, secrets, personal data or full prompts |
| Required evidence for decision | Fixture result matrix, false-positive/false-negative analysis, confidence calibration notes |
| Required document updates after result | Static scanner contract, AIUsageFlow spec, rule mapping spec, QA fixtures, acceptance criteria |

Acceptance conditions for A2-b:

- Provider/model/framework alone does not classify a system as high risk.
- Decision-impact fixtures map to appropriate legal-rule family or remain blocked/unclear.
- Every material AIUsageFlow claim used in rule matching has evidence refs.
- Unclear critical usage does not lead to final classification.
- False-positive rate for automated/high-impact flow is measured.

## A3 Human Attestation Abuse / Governance Validation

| Field | Protocol |
| --- | --- |
| Research question | Can human attestation and optional Developer clarification be used without allowing bypass of scanner evidence, Manager ownership or auditability? |
| Participants / reviewers | Manager-like user, security reviewer, compliance reviewer, product owner |
| Material and fixture set | F-CONFLICT-01, F-CONFLICT-02, F-AUTH-02, role/permission docs |
| Procedure | Review conflict/clarification cases and attempted bypass scenarios |
| Data to capture | Bypass attempts, confusing authority boundaries, required audit fields, acceptable attestation limits |
| Acceptance thresholds | Developer cannot finalize conflict or unblock classification; Manager resolution remains traceable |
| Failure / inconclusive criteria | Attestation can replace scanner facts, bypass unresolved conflict or avoid audit |
| Bias and conflict controls | Include adversarial prompts/scenarios and role-boundary checks |
| Privacy safeguards | Synthetic conflict data only |
| Required evidence for decision | Abuse-case matrix, governance decision notes, recommended policy changes |
| Required document updates after result | Reconciliation policy, business rules, auth/RBAC docs, QA scenarios, acceptance criteria |

## Phase 4.1 Execution Preparation References

Phase 4.1 adds execution-ready materials for these protocols. These references prepare validation runs only; they do not record results and do not unblock implementation.

| Protocol | Execution Preparation Document | Shared Preparation Inputs |
| --- | --- | --- |
| A1 Wizard simplicity/completeness | `docs/validation/a1-wizard-validation-execution-pack.md` | Recruitment plan, consent/privacy plan, evidence capture template, decision rubric |
| A2 Legal corpus/rule reliability | `docs/validation/a2-legal-corpus-validation-execution-pack.md` | Reviewer recruitment, corpus provenance checklist, evidence capture template, decision rubric |
| A2-b Scanner and AIUsageFlow mapping accuracy | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md` | Fixture release register, A2-b metric capture, privacy plan, decision rubric |
| A3 Human attestation abuse/governance | `docs/validation/a3-human-attestation-validation-execution-pack.md` | Governance reviewer plan, abuse scenario matrix, audit evidence template, decision rubric |

Before executing these protocols, the team must approve final participant/reviewer counts, acceptance thresholds, fixture integrity references, evidence storage access controls and retention/deletion schedule.

## Phase 4.1.1 Decision Resolution Notes

Execution readiness is controlled by `docs/validation/validation-execution-decision-log.md`.

| Validation | Phase 4.1.1 Resolution | Still Blocks Execution |
| --- | --- | --- |
| A1 | Proposed session design and thresholds documented | Owner confirmation, named moderator/recorder, evidence storage approval |
| A2 | Proposed corpus versioning model and review protocol documented | Actual corpus sources, reviewer roster, adjudicator, corpus hash/version approval |
| A2-b1 | Pre-implementation mapping design validation scope documented | Reviewer roster, fixture hashes, fixture approval, threshold approval |
| A2-b2 | Defined as post-implementation empirical scanner acceptance gate | Real scanner implementation required before execution |
| A3 | Proposed governance scenarios and thresholds documented | Reviewer roster, threshold approval, evidence storage approval |

No protocol may collect real evidence while its execution-critical decision rows remain `PENDING_OWNER_CONFIRMATION`.

## Phase 4.1.2 Approval Normalization Notes

The following protocol readiness inputs were normalized from `DEC-VAL-2026-001`:

| Validation | Phase 4.1.2 Normalization | Remaining Execution Boundary |
| --- | --- | --- |
| A1 | Owner/moderator, session count, duration, thresholds and P0/P1/P2 rubric are `APPROVED_FOR_EXECUTION` | Must still pass Phase 4.2 readiness recheck before evidence collection |
| A2 | Corpus model and internal legal-rule review defaults are owner-confirmed | Formal legal reliability validation is `NOT_APPROVED`; do not claim independent/professional legal validation |
| A2-b1 | Mapping-design scope, reviewers, adjudicator and thresholds are `APPROVED_FOR_EXECUTION` | D-07 fixture release remains pending; A2-b1 is not runtime scanner-accuracy validation |
| A2-b2 | Remains `POST_IMPLEMENTATION_ACCEPTANCE_GATE` | Requires real scanner implementation |
| A3 | Governance/security reviewers and fail-closed thresholds are `APPROVED_FOR_EXECUTION` | Must still pass Phase 4.2 readiness recheck before evidence collection |
| Evidence storage | GitHub private repository model is owner-attested for internal validation | Owner attestation only; no independent ACL audit |

No evidence collection is allowed until a Phase 4.2 readiness report explicitly lists the validation stream as allowed.
