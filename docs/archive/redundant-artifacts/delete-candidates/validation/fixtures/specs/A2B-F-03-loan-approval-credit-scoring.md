# A2B-F-03 Loan Approval Credit Scoring

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

A loan application flow sends synthetic financial/application fields to an AI scoring model. The score is compared to a threshold and feeds an approve/reject action without evidenced human review.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | loan_approval | WP-A2B-F03-01 |
| ai_purpose | scoring | WP-A2B-F03-02 |
| downstream_action | approve_reject | WP-A2B-F03-03 |
| human_review | absent or not claimed | WP-A2B-F03-04 |

## Expected Scanner Signals

- Expected detection signals: AI_MODEL_INVOCATION, AI_INPUT_SIGNAL, SENSITIVE_DATA_SIGNAL, AI_OUTPUT_SIGNAL, AI_DECISION_FLOW_SIGNAL, AUTOMATED_DECISION_SIGNAL, STATUS_UPDATE_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: HUMAN_REVIEW_SIGNAL.
- Expected uncertainty or coverage limits: none expected if the bounded path from input to score to threshold to approve/reject is complete.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F03-01 | AI_MODEL_INVOCATION | Loan scoring model invocation exists | 0.80-1.00 |
| TF-A2B-F03-02 | SENSITIVE_DATA_SIGNAL | Synthetic financial/application fields enter scoring | 0.70-0.90 |
| TF-A2B-F03-03 | AI_OUTPUT_SIGNAL | Model output is score | 0.80-1.00 |
| TF-A2B-F03-04 | AI_DECISION_FLOW_SIGNAL | Score controls threshold/branch | 0.80-1.00 |
| TF-A2B-F03-05 | AUTOMATED_DECISION_SIGNAL | Threshold branch triggers approve/reject without review | 0.80-1.00 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | loan_approval | 0.80-1.00 | TF-A2B-F03-01, TF-A2B-F03-02, WP-A2B-F03-01 | none |
| ai_purpose | scoring | 0.80-1.00 | TF-A2B-F03-01, TF-A2B-F03-03, WP-A2B-F03-02 | none |
| ai_input_types | financial_data, personal_data | 0.70-0.90 | TF-A2B-F03-02 | synthetic category labels only |
| ai_output_types | score | 0.80-1.00 | TF-A2B-F03-03 | none |
| downstream_action | approve_reject | 0.80-1.00 | TF-A2B-F03-04, TF-A2B-F03-05, WP-A2B-F03-03 | none |
| affected_subjects | customer | 0.70-0.90 | TF-A2B-F03-02, TF-A2B-F03-05 | none |
| human_review | absent with bounded-path evidence | 0.80-1.00 | TF-A2B-F03-05, WP-A2B-F03-04 | absent only because bounded path shows no review step |
| automation_level | fully_automated | 0.80-1.00 | TF-A2B-F03-04, TF-A2B-F03-05 | none |
| potential_harm_categories | financial_access, eligibility_decision | 0.70-0.90 | TF-A2B-F03-02, TF-A2B-F03-05 | legal category must be citation-backed |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

If WizardProfile agrees with loan scoring and no human review, reconciliation can proceed to VerifiedProfile only after evidence gates pass. If WizardProfile denies decision impact or claims human review, create a Manager conflict-resolution task and keep classification locked.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Eligible for automated financial decision or affected-person legal rule matching after VerifiedProfile and citations exist.
- Reason: AI output plus threshold plus approve/reject action plus no evidenced review creates an automated decision-use pattern.
- Citation requirements: Classification requires pinned legal corpus version and specific legal citations.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: High-impact eligibility comes from score-to-approve/reject evidence, not provider presence.
- Must block or abstain when usage/evidence is unclear: If threshold/action or review status is unresolved, final classification is blocked or marked unclear.

## Acceptance Assertions

- Automated-decision signal requires output, decision rule, state-changing approve/reject action and no evidenced review step.
- Claims used for legal rule matching have evidence_refs.
- Classification remains blocked until VerifiedProfile and citation guardrail pass.

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
