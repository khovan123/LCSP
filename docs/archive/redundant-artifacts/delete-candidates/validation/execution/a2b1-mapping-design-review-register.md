# A2-b1 Mapping-Design Review Register

## Purpose

This register initializes controlled internal review records for A2-b1 pre-implementation mapping-design validation. It does not record reviewer outcomes yet.

## Scope Boundary

```text
PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY
```

A2-b1 may review:

- expected scanner-signal design;
- expected TechnicalFinding design;
- expected AIUsageFlow claim design;
- expected evidence-reference coverage;
- abstention / uncertainty behavior;
- reconciliation behavior;
- legal-rule eligibility boundary;
- classification blocking behavior when evidence is unclear.

A2-b1 may not review or claim:

- runtime scanner accuracy;
- parser correctness;
- AST extraction accuracy;
- call graph or data-flow accuracy;
- empirical false-positive or false-negative rate;
- benchmark, latency, memory or performance;
- production scanner behavior;
- formal legal reliability validation;
- compliance certification.

## Reviewer Roster

| Role | Assigned Person | Review Evidence Status |
|---|---|---|
| Fixture Owner | Phan Nguyễn Quốc Minh | ASSIGNED_ONLY |
| Technical Reviewer | Nguyễn Anh Tú | PENDING_REAL_REVIEW_EVIDENCE |
| Legal-eligibility Reviewer | Lê Bảo Nhi | PENDING_REAL_REVIEW_EVIDENCE |
| Adjudicator | Nguyễn Tuấn Anh | PENDING_ONLY_IF_DISAGREEMENT |

Assigned roles must not be treated as completed review evidence.

## Status Values

```text
CONFORMS
DEVIATION_FOUND
NEEDS_ADJUDICATION
NOT_STARTED
```

## Review Records

| Review Record ID | Fixture ID | Fixture File Path | Fixture SHA-256 | Review Date | Reviewer Role | Reviewer Identity / Attestation Ref | Review Scope | Expected Scanner Signals Reviewed | Expected Non-Signals Reviewed | Expected TechnicalFinding Reviewed | Expected AIUsageFlow Claims Reviewed | Material Claim Evidence-Reference Coverage Result | Expected Uncertainty / Abstention Behavior Reviewed | Expected Reconciliation Outcome Reviewed | Expected Legal-Rule Eligibility Boundary Reviewed | Expected Classification Blocking Behavior Reviewed | Reviewer Result | Reviewer Rationale | Evidence Reference | Privacy Classification | Retention / Deletion Date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A2B1-R-01 | A2B-F-01 | `docs/validation/fixtures/specs/A2B-F-01-internal-summarization.md` | `c3b6f0d9c47e039379c07267e516a0fd0bbe89b993df070bb3cd968b7ec99151` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-02 | A2B-F-02 | `docs/validation/fixtures/specs/A2B-F-02-customer-chatbot.md` | `43477aa68e2daeb4d09593ab424e3808d23d2ada657ec91a5a93d28a3b43f206` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-03 | A2B-F-03 | `docs/validation/fixtures/specs/A2B-F-03-loan-approval-credit-scoring.md` | `92bd62657d5babde3406f48c77240e76338dd93839546d7806ebe740c7597b71` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-04 | A2B-F-04 | `docs/validation/fixtures/specs/A2B-F-04-hr-screening-ranking.md` | `78d16a0ad61a5148a6312b79c311328148af5b07db1973593803be7eb1d2919c` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-05 | A2B-F-05 | `docs/validation/fixtures/specs/A2B-F-05-human-reviewed-loan.md` | `649179b2a9b8452b56993d09be3fb72da7d49ade93a8f4e2d0f963e0243fb9ce` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-06 | A2B-F-06 | `docs/validation/fixtures/specs/A2B-F-06-automated-approval-rejection.md` | `0c15100cfbe4d2b4f87c2d8d00a9dda49c54519c59bb00a558425ef4f2276212` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-07 | A2B-F-07 | `docs/validation/fixtures/specs/A2B-F-07-dynamic-prompt-runtime-dependency.md` | `c75e13b2bd23989e56c9a2d2b8b1d7816e13ac8a60f2480157cc19807d3f89d1` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-08 | A2B-F-08 | `docs/validation/fixtures/specs/A2B-F-08-generated-minified-unsupported-source.md` | `505116505dabe4fdb1e2a43eea8073f88f74da63ff210d3767b8dabc42c52f6c` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-09 | A2B-F-09 | `docs/validation/fixtures/specs/A2B-F-09-provider-sdk-only.md` | `0ae7eab4fcb15c8af67577eac8680b68468e063f082e57f5585f79afee4f737d` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |
| A2B1-R-10 | A2B-F-10 | `docs/validation/fixtures/specs/A2B-F-10-wizard-source-conflict.md` | `b526a82a8990929dcb9d04b5c838606d4f7606eadf99e78f8cc73698f947ef4f` | PENDING_REAL_REVIEW_EVIDENCE | Technical Reviewer / Legal-eligibility Reviewer | PENDING_REAL_REVIEW_EVIDENCE | PRE_IMPLEMENTATION_MAPPING_DESIGN_VALIDATION_ONLY | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | NOT_STARTED | PENDING_REAL_REVIEW_EVIDENCE | PENDING_REAL_REVIEW_EVIDENCE | SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE | 12 months after evidence capture; pending until evidence supplied |

## Mandatory Fixture Assertions to Review

| Review Record ID | Mandatory Assertion |
|---|---|
| A2B1-R-01 | Internal summarization must not be inferred as high-impact only because AI exists. |
| A2B1-R-02 | Customer chatbot must not be treated as automated decision-making without evidence. |
| A2B1-R-03 | Loan/credit scoring feeding approve/reject without human review must surface decision-use signals. |
| A2B1-R-04 | HR ranking must remain unclear unless downstream automated action is evidenced. |
| A2B1-R-05 | Human-reviewed loan must preserve the human-review distinction. |
| A2B1-R-06 | Automated approve/reject threshold path must require strong evidence references. |
| A2B1-R-07 | Dynamic prompt/runtime dependency must require uncertainty or coverage-limit behavior. |
| A2B1-R-08 | Generated/minified/unsupported source must require abstention or limitation behavior. |
| A2B1-R-09 | Provider SDK-only evidence must not imply model invocation or high-impact use. |
| A2B1-R-10 | Wizard/source contradiction must create a reconciliation conflict and block VerifiedProfile. |

## Adjudication Rule

1. Technical Reviewer and Legal-eligibility Reviewer may review independently.
2. A disagreement becomes `NEEDS_ADJUDICATION`.
3. Adjudicator records the final mapping-design resolution.
4. Original reviewer views remain preserved.
5. No reviewer may silently overwrite another reviewer's record.
6. No adjudication result may be represented as formal legal advice.

## Evidence Safety

All fixture reviews must remain:

```text
SYNTHETIC
NO_PERSONAL_DATA
NO_SECRET
NO_CUSTOMER_SOURCE
```

Do not add real repository source, production prompts, API keys, credentials, customer data, runtime logs, fabricated legal citation or fabricated reviewer approval.
