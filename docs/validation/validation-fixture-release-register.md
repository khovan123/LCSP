# Validation Fixture Release Register

## Purpose

Register validation fixtures and their release status before real A1, A2, A2-b and A3 validation execution.

## Release Status Values

```text
DRAFT
REVIEW_READY
APPROVED_FOR_VALIDATION
RETIRED
```

## Fixture Register

| Fixture ID | Version | Hash / Integrity Ref | Owner | Intended Validation | Sensitive Content | Release Status |
| --- | --- | --- | --- | --- | --- | --- |
| F-SCAN-01 | v0.1 | TBD | QA/Architecture | A2-b internal summarization | Synthetic internal text only | DRAFT |
| F-SCAN-02 | v0.1 | TBD | QA/Architecture | A2-b customer chatbot | Synthetic customer text only | DRAFT |
| F-SCAN-03 | v0.1 | TBD | QA/Architecture | A2-b loan approval / credit scoring | Synthetic financial fields | DRAFT |
| F-SCAN-04 | v0.1 | TBD | QA/Architecture | A2-b HR ranking | Synthetic employment data | DRAFT |
| F-SCAN-05 | v0.1 | TBD | QA/Architecture | A2-b human-reviewed loan | Synthetic financial data | DRAFT |
| F-SCAN-06 | v0.1 | TBD | QA/Architecture | A2-b automated approval/rejection | Synthetic financial/customer data | DRAFT |
| F-SCAN-07 | v0.1 | TBD | QA/Architecture | A2-b provider SDK only | No sensitive data | DRAFT |
| F-SCAN-08 | v0.1 | TBD | QA/Architecture | A2-b dynamic prompt reference | No full prompt stored | DRAFT |
| F-SCAN-09 | v0.1 | TBD | QA/Architecture | A2-b message queue flow break | Synthetic payload labels | DRAFT |
| F-SCAN-10 | v0.1 | TBD | QA/Architecture | A2-b minified/generated coverage limitation | No raw minified body | DRAFT |
| F-SCAN-11 | v0.1 | TBD | Security/QA | Secret redaction validation | Synthetic secret-like values only | DRAFT |
| F-SCAN-12 | v0.1 | TBD | QA/Architecture | A2-b missing downstream path | Synthetic data labels | DRAFT |
| F-RAG-01 | v0.1 | TBD | Legal/Product | A2 correct legal rule/citation | Legal corpus refs only | DRAFT |
| F-RAG-02 | v0.1 | TBD | Legal/Product | A2 missing citation | Legal corpus refs only | DRAFT |
| F-RAG-03 | v0.1 | TBD | Legal/Product | A2 ambiguous legal mapping | Legal corpus refs only | DRAFT |
| F-CONFLICT-01 | v0.1 | TBD | Product/QA | A2-b/A3 source conflicts with Wizard | Synthetic business answers | DRAFT |
| F-CONFLICT-02 | v0.1 | TBD | Product/QA | A2-b/A3 human review conflict | Synthetic business answers | DRAFT |
| F-AUTH-01 | v0.1 | TBD | Security/QA | Auth/OAuth negative validation | No real tokens | DRAFT |
| F-AUTH-02 | v0.1 | TBD | Security/Product | Manager vs Developer permissions | Synthetic users | DRAFT |
| F-OPS-01 | v0.1 | TBD | QA/Ops | Queue duplicate/retry/dead-letter | No raw source payload | DRAFT |
| F-OPS-02 | v0.1 | TBD | QA/Ops | Worker crash/timeout | No sensitive payload | DRAFT |

## Phase 4.1.1 Fixture Governance

Release transition:

```text
DRAFT
-> REVIEW_READY
-> APPROVED_FOR_VALIDATION
-> RETIRED
```

A fixture can be `APPROVED_FOR_VALIDATION` only when it has:

| Required Approval Field | Requirement | Current Status |
| --- | --- | --- |
| version | Stable fixture version | Present as `v0.1` |
| integrity hash | Generated after fixture specification artifact is finalized | PENDING_OWNER_CONFIRMATION |
| expected outcome | Expected findings, AIUsageFlow claims, uncertainty, reconciliation and eligibility documented | Present for A2-b1 required fixtures |
| reviewer approval | Reviewer approval recorded | PENDING_OWNER_CONFIRMATION |
| privacy classification | Sensitive content classification confirmed | PENDING_OWNER_CONFIRMATION |
| release date | Release date recorded | PENDING_OWNER_CONFIRMATION |
| owner | Fixture owner assigned | Phan Nguyễn Quốc Minh confirmed |

Do not fabricate fixture hashes. Generate the hash only after the relevant fixture specification artifact is finalized.

## Phase 4.1.2 Fixture Governance Normalization

The Project Lead approved the fixture governance model but did not explicitly confirm a fixture approver or finalized fixture artifacts. D-07 therefore remains `PENDING_OWNER_CONFIRMATION`.

| Field | Value | Status |
| --- | --- | --- |
| Fixture owner | Phan Nguyễn Quốc Minh | OWNER_CONFIRMED |
| Fixture approver | Not explicitly confirmed | PENDING_OWNER_CONFIRMATION |
| Required fixture cards | 10 finalized A2-b1 fixture specification cards | PENDING_OWNER_CONFIRMATION |
| Reviewer approval for each card | Required | PENDING_OWNER_CONFIRMATION |
| SHA-256 hash | Generate after each finalized card | PENDING_OWNER_CONFIRMATION |
| Release status | Must be `APPROVED_FOR_VALIDATION` before A2-b1 evidence collection | PENDING_OWNER_CONFIRMATION |
| Hash method | SHA-256 after fixture-card finalization | OWNER_CONFIRMED |
| Privacy classification | `SYNTHETIC`; `NO_PERSONAL_DATA`; `NO_SECRET`; `NO_CUSTOMER_SOURCE` | OWNER_CONFIRMED |

Required before A2-b1 evidence collection:

- Fixture approver name and role.
- 10 finalized fixture specification cards.
- Reviewer approval for each card.
- SHA-256 hash generated from each finalized card.
- Release status `APPROVED_FOR_VALIDATION`.

## A2-b1 Fixture Specification Artifact Status

| Fixture ID | Specification Card Location | Specification Hash | Approval Status |
| --- | --- | --- | --- |
| F-SCAN-01 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-02 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-03 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-04 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-05 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-06 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-08 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-10 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-SCAN-07 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-CONFLICT-01 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |
| F-CONFLICT-02 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md#versioned-synthetic-fixture-specification-cards` | PENDING_FINAL_SPEC_HASH | DRAFT |

## Release Criteria

Fixture status may move to `APPROVED_FOR_VALIDATION` only after:

- Expected findings/claims/gate outcomes are reviewed.
- Hash/integrity reference is recorded.
- Sensitive content classification is confirmed.
- Owner signs off the fixture version.
