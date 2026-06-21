# LCSP Validation Execution Preparation

## Purpose

This folder contains the Phase 4.1 validation execution preparation pack for LCSP. It prepares real validation runs for A1, A2, A2-b and A3, but does not record validation results.

## Scope

Allowed in this folder:

- Execution packs.
- Recruitment and reviewer preparation.
- Consent, privacy and data-handling plan.
- Evidence capture template.
- Decision rubric.
- Fixture release register.

Not allowed in this folder:

- Real participant interview notes.
- Real validation results.
- Source code or test source.
- CI/CD, Docker, backlog, epic, story, sprint or task artifacts.
- Any readiness status change.

## Validation Packs

| Validation | Execution Pack | Purpose |
| --- | --- | --- |
| A1 | `a1-wizard-validation-execution-pack.md` | Prepare Wizard simplicity/completeness validation with Manager-like users. |
| A2 | `a2-legal-corpus-validation-execution-pack.md` | Prepare legal corpus, citation and rule-reliability review. |
| A2-b | `a2b-scanner-aiusageflow-validation-execution-pack.md` | Prepare scanner and AIUsageFlow mapping validation using synthetic fixtures. |
| A3 | `a3-human-attestation-validation-execution-pack.md` | Prepare governance/abuse validation for Manager conflict resolution and attestation boundaries. |

## Shared Preparation Documents

| Document | Purpose |
| --- | --- |
| `participant-and-reviewer-recruitment-plan.md` | Defines participant/reviewer roles and separation rules. |
| `consent-privacy-and-data-handling-plan.md` | Defines consent, pseudonymization, evidence handling and prohibited data. |
| `validation-evidence-capture-template.md` | Common evidence record template for validation observations. |
| `validation-decision-rubric.md` | PASS / update / inconclusive / fail decision model. |
| `validation-fixture-release-register.md` | Version and release status register for validation fixtures. |

## Mandatory Invariants

- Validation preparation does not unlock implementation.
- Implementation backlog remains blocked until A1, A2, A2-b and A3 have real recorded outcomes, required PRD/spec/architecture/ADR updates are completed, and a later readiness checkpoint explicitly permits implementation planning.
- A2-b must not treat provider/model/framework presence alone as proof of legal risk.
- A2-b must verify evidence-backed AIUsageFlow claims, abstention behavior and rule-mapping eligibility.
- No real customer repository source, secret, raw prompt or personal data may enter validation artifacts.

## Current Readiness

Readiness remains unchanged:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```

