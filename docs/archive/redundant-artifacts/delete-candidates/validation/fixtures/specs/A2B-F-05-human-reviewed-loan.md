# A2B-F-05 Human-Reviewed Loan Decision

## Fixture Governance

- Fixture version: v0.1
- Status: APPROVED_FOR_VALIDATION
- Owner: Phan Nguyễn Quốc Minh
- Fixture Approver: Nguyễn Anh Tú
- Technical Reviewer: Nguyễn Anh Tú
- Legal-eligibility Reviewer: Lê Bảo Nhi
- Adjudicator: Nguyễn Tuấn Anh
- Privacy classification: SYNTHETIC / NO_PERSONAL_DATA / NO_SECRET / NO_CUSTOMER_SOURCE
- Synthetic-data declaration: This fixture is a synthetic specification card only and contains no runnable source, customer repository data, credentials, secrets, full prompts or personal data.

## Scenario Summary

A loan scoring model produces a score, but the flow sends the case to a manager review queue before any final approve/reject decision. Human review is evidenced by explicit review status and approval workflow signals.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | loan_approval | WP-A2B-F05-01 |
| ai_purpose | decision_support | WP-A2B-F05-02 |
| human_review | present | WP-A2B-F05-03 |
| downstream_action | escalate_for_review before approve/reject | WP-A2B-F05-04 |

## Expected Scanner Signals

- Expected detection signals: AI_MODEL_INVOCATION, AI_INPUT_SIGNAL, SENSITIVE_DATA_SIGNAL, AI_OUTPUT_SIGNAL, HUMAN_REVIEW_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: AUTOMATED_DECISION_SIGNAL if review is a bounded mandatory gate before final action.
- Expected uncertainty or coverage limits: none if the review queue/approval step is bounded.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F05-01 | AI_MODEL_INVOCATION | Loan scoring model invocation exists | 0.80-1.00 |
| TF-A2B-F05-02 | AI_OUTPUT_SIGNAL | Model output is score | 0.70-0.90 |
| TF-A2B-F05-03 | HUMAN_REVIEW_SIGNAL | Review queue or manager approval step exists | 0.80-1.00 |
| TF-A2B-F05-04 | USER_IMPACT_SIGNAL | Loan applicant is affected subject | 0.70-0.90 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | loan_approval | 0.80-1.00 | TF-A2B-F05-01, TF-A2B-F05-04, WP-A2B-F05-01 | none |
| ai_purpose | decision_support | 0.70-0.90 | TF-A2B-F05-01, TF-A2B-F05-02, WP-A2B-F05-02 | none |
| ai_input_types | financial_data, personal_data | 0.70-0.90 | TF-A2B-F05-01, TF-A2B-F05-04 | synthetic category labels only |
| ai_output_types | score | 0.70-0.90 | TF-A2B-F05-02 | none |
| downstream_action | escalate_for_review | 0.80-1.00 | TF-A2B-F05-03, WP-A2B-F05-04 | none |
| affected_subjects | customer | 0.70-0.90 | TF-A2B-F05-04 | none |
| human_review | present | 0.80-1.00 | TF-A2B-F05-03, WP-A2B-F05-03 | explicit review path required |
| automation_level | decision_support or semi_automated | 0.70-0.90 | TF-A2B-F05-02, TF-A2B-F05-03 | final approval remains human-reviewed |
| potential_harm_categories | financial_access, oversight_required | 0.70-0.90 | TF-A2B-F05-03, TF-A2B-F05-04 | legal category requires citation |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

No conflict if WizardProfile claims human review and scanner evidence supports a bounded review path. Conflict if WizardProfile claims review but the review path is missing, generic only or bypassed.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Eligible for oversight/documentation rule mapping and any financial decision rules that distinguish human-reviewed decision support.
- Reason: AI score affects a decision workflow but is gated by evidenced human review.
- Citation requirements: Legal output requires citations and must preserve the human-review evidence refs.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: Classification depends on score, review gate and downstream action evidence.
- Must block or abstain when usage/evidence is unclear: If review is not bounded or is only a generic review() name, human_review must be unclear and classification may block.

## Acceptance Assertions

- Human review is present only when explicit review queue/approval evidence exists.
- This fixture does not become fully automated if the review gate is bounded and mandatory.
- Manager declarations supplement but do not overwrite scanner findings.

## Reviewer Sign-off

Review status:
OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL

Meaning:
The Fixture Owner and named internal reviewers confirm that this synthetic
fixture is suitable for pre-implementation mapping-design validation.

This is not:
- independent legal review;
- formal legal reliability validation;
- runtime scanner verification;
- production compliance certification.

- Fixture Owner attestation: Phan Nguyễn Quốc Minh, owner-attested through DEC-VAL-2026-001.
- Technical Reviewer approval: Nguyễn Anh Tú, owner-attested internal approval.
- Legal-eligibility Reviewer approval: Lê Bảo Nhi, owner-attested internal approval.
- Adjudicator acknowledgement: Nguyễn Tuấn Anh, owner-attested internal acknowledgement.
- Date: 2026-06-20
- Evidence reference: DEC-VAL-2026-001 / D-07

## Integrity

- SHA-256: Recorded in docs/validation/validation-fixture-release-register.md
- Hash generated at: after final fixture card creation on 2026-06-20
- Hash generation command/reference: sha256sum docs/validation/fixtures/specs/*.md
