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
| F-SCAN-01 | v0.1 | superseded by A2B-F-01 fixture card | QA/Architecture | A2-b internal summarization | Synthetic internal text only | RETIRED |
| F-SCAN-02 | v0.1 | superseded by A2B-F-02 fixture card | QA/Architecture | A2-b customer chatbot | Synthetic customer text only | RETIRED |
| F-SCAN-03 | v0.1 | superseded by A2B-F-03 fixture card | QA/Architecture | A2-b loan approval / credit scoring | Synthetic financial fields | RETIRED |
| F-SCAN-04 | v0.1 | superseded by A2B-F-04 fixture card | QA/Architecture | A2-b HR ranking | Synthetic employment data | RETIRED |
| F-SCAN-05 | v0.1 | superseded by A2B-F-05 fixture card | QA/Architecture | A2-b human-reviewed loan | Synthetic financial data | RETIRED |
| F-SCAN-06 | v0.1 | superseded by A2B-F-06 fixture card | QA/Architecture | A2-b automated approval/rejection | Synthetic financial/customer data | RETIRED |
| F-SCAN-07 | v0.1 | superseded by A2B-F-09 fixture card | QA/Architecture | A2-b provider SDK only | No sensitive data | RETIRED |
| F-SCAN-08 | v0.1 | superseded by A2B-F-07 fixture card | QA/Architecture | A2-b dynamic prompt reference | No full prompt stored | RETIRED |
| F-SCAN-09 | v0.1 | covered by A2B-F-07/A2B-F-08 uncertainty fixtures | QA/Architecture | A2-b message queue flow break | Synthetic payload labels | DRAFT |
| F-SCAN-10 | v0.1 | superseded by A2B-F-08 fixture card | QA/Architecture | A2-b minified/generated coverage limitation | No raw minified body | RETIRED |
| F-SCAN-11 | v0.1 | future security fixture | Security/QA | Secret redaction validation | Synthetic secret-like values only | DRAFT |
| F-SCAN-12 | v0.1 | covered by A2B-F-07/A2B-F-08 uncertainty fixtures | QA/Architecture | A2-b missing downstream path | Synthetic data labels | DRAFT |
| F-RAG-01 | v0.1 | TBD | Legal/Product | A2 correct legal rule/citation | Legal corpus refs only | DRAFT |
| F-RAG-02 | v0.1 | TBD | Legal/Product | A2 missing citation | Legal corpus refs only | DRAFT |
| F-RAG-03 | v0.1 | TBD | Legal/Product | A2 ambiguous legal mapping | Legal corpus refs only | DRAFT |
| F-CONFLICT-01 | v0.1 | superseded by A2B-F-10 fixture card | Product/QA | A2-b/A3 source conflicts with Wizard | Synthetic business answers | RETIRED |
| F-CONFLICT-02 | v0.1 | future conflict fixture | Product/QA | A2-b/A3 human review conflict | Synthetic business answers | DRAFT |
| F-AUTH-01 | v0.1 | TBD | Security/QA | Auth/OAuth negative validation | No real tokens | DRAFT |
| F-AUTH-02 | v0.1 | TBD | Security/Product | Manager vs Developer permissions | Synthetic users | DRAFT |
| F-OPS-01 | v0.1 | TBD | QA/Ops | Queue duplicate/retry/dead-letter | No raw source payload | DRAFT |
| F-OPS-02 | v0.1 | TBD | QA/Ops | Worker crash/timeout | No sensitive payload | DRAFT |

## Phase 4.3.1 A2-b1 Fixture Release Completion

Release transition:

```text
DRAFT
-> REVIEW_READY
-> APPROVED_FOR_VALIDATION
-> RETIRED
```

D-07 is completed for A2-b1 readiness recheck only.

| Field | Value |
| --- | --- |
| Fixture owner | Phan Nguyễn Quốc Minh |
| Fixture approver | Nguyễn Anh Tú |
| Fixture approver role | Technical Reviewer 2 / Static Analysis Reviewer |
| Legal-eligibility reviewer | Lê Bảo Nhi |
| Adjudicator | Nguyễn Tuấn Anh |
| Approval basis | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL |
| Scope | A2-b1 pre-implementation mapping-design validation only |
| Hash method | SHA-256 after fixture-card finalization |
| Hash command/reference | `sha256sum docs/validation/fixtures/specs/*.md` |
| Privacy classification | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| D-07 status | APPROVED_FOR_EXECUTION |

This release does not permit A2-b1 evidence collection by itself. Evidence collection requires a later readiness recheck.

## A2-b1 Approved Fixture Specification Cards

| Fixture ID | File | Version | Hash | Release Status | Approval Basis | Scope | Privacy |
|---|---|---|---|---|---|---|---|
| A2B-F-01 | `docs/validation/fixtures/specs/A2B-F-01-internal-summarization.md` | v0.1 | `c3b6f0d9c47e039379c07267e516a0fd0bbe89b993df070bb3cd968b7ec99151` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-02 | `docs/validation/fixtures/specs/A2B-F-02-customer-chatbot.md` | v0.1 | `43477aa68e2daeb4d09593ab424e3808d23d2ada657ec91a5a93d28a3b43f206` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-03 | `docs/validation/fixtures/specs/A2B-F-03-loan-approval-credit-scoring.md` | v0.1 | `92bd62657d5babde3406f48c77240e76338dd93839546d7806ebe740c7597b71` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-04 | `docs/validation/fixtures/specs/A2B-F-04-hr-screening-ranking.md` | v0.1 | `78d16a0ad61a5148a6312b79c311328148af5b07db1973593803be7eb1d2919c` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-05 | `docs/validation/fixtures/specs/A2B-F-05-human-reviewed-loan.md` | v0.1 | `649179b2a9b8452b56993d09be3fb72da7d49ade93a8f4e2d0f963e0243fb9ce` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-06 | `docs/validation/fixtures/specs/A2B-F-06-automated-approval-rejection.md` | v0.1 | `0c15100cfbe4d2b4f87c2d8d00a9dda49c54519c59bb00a558425ef4f2276212` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-07 | `docs/validation/fixtures/specs/A2B-F-07-dynamic-prompt-runtime-dependency.md` | v0.1 | `c75e13b2bd23989e56c9a2d2b8b1d7816e13ac8a60f2480157cc19807d3f89d1` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-08 | `docs/validation/fixtures/specs/A2B-F-08-generated-minified-unsupported-source.md` | v0.1 | `505116505dabe4fdb1e2a43eea8073f88f74da63ff210d3767b8dabc42c52f6c` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-09 | `docs/validation/fixtures/specs/A2B-F-09-provider-sdk-only.md` | v0.1 | `0ae7eab4fcb15c8af67577eac8680b68468e063f082e57f5585f79afee4f737d` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |
| A2B-F-10 | `docs/validation/fixtures/specs/A2B-F-10-wizard-source-conflict.md` | v0.1 | `b526a82a8990929dcb9d04b5c838606d4f7606eadf99e78f8cc73698f947ef4f` | APPROVED_FOR_VALIDATION | OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL | A2-b1 pre-implementation mapping-design validation only | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE |

## Release Criteria

The 10 A2-b1 fixture cards satisfy the D-07 release criteria:

- Stable fixture ID.
- Version.
- Finalized synthetic specification artifact.
- SHA-256 integrity hash.
- Expected technical findings.
- Expected AIUsageFlow claims.
- Expected confidence range.
- Expected uncertainty behavior.
- Expected reconciliation outcome.
- Expected legal-rule eligibility.
- Owner-attested internal reviewer approval.
- Privacy classification.
- Release date.
- Owner.

## Explicit Non-Claims

This fixture release does not claim:

- independent legal review;
- formal legal reliability validation;
- runtime scanner verification;
- parser correctness;
- AST extraction accuracy;
- cross-module data-flow accuracy;
- empirical false-positive or false-negative rate;
- production compliance certification.
