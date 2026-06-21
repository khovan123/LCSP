# A2B-F-06 Automated Approval Rejection

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

AI output produces a classification label or score. A threshold/business rule directly updates status to approved or rejected without evidenced human review.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | eligibility_decision | WP-A2B-F06-01 |
| ai_purpose | automated_decision | WP-A2B-F06-02 |
| downstream_action | approve_reject or change_status | WP-A2B-F06-03 |
| human_review | absent | WP-A2B-F06-04 |

## Expected Scanner Signals

- Expected detection signals: AI_MODEL_INVOCATION, AI_OUTPUT_SIGNAL, AI_DECISION_FLOW_SIGNAL, AUTOMATED_DECISION_SIGNAL, STATUS_UPDATE_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: HUMAN_REVIEW_SIGNAL.
- Expected uncertainty or coverage limits: none if output-to-rule-to-state-change path is bounded.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F06-01 | AI_MODEL_INVOCATION | Model invocation produces score/classification label | 0.80-1.00 |
| TF-A2B-F06-02 | AI_OUTPUT_SIGNAL | AI output is score or decision_label | 0.80-1.00 |
| TF-A2B-F06-03 | AI_DECISION_FLOW_SIGNAL | Output controls threshold/business rule branch | 0.80-1.00 |
| TF-A2B-F06-04 | STATUS_UPDATE_SIGNAL | Branch writes approved/rejected status | 0.80-1.00 |
| TF-A2B-F06-05 | AUTOMATED_DECISION_SIGNAL | No evidenced review between output and state change | 0.80-1.00 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | eligibility_decision | 0.70-0.90 | TF-A2B-F06-01, TF-A2B-F06-04, WP-A2B-F06-01 | domain may require Manager confirmation if route labels are generic |
| ai_purpose | automated_decision | 0.80-1.00 | TF-A2B-F06-02, TF-A2B-F06-03, WP-A2B-F06-02 | none |
| ai_input_types | personal_data or unknown | 0.40-0.80 | TF-A2B-F06-01 | exact input category depends on fixture labels |
| ai_output_types | score, decision_label | 0.80-1.00 | TF-A2B-F06-02 | none |
| downstream_action | approve_reject, change_status | 0.80-1.00 | TF-A2B-F06-03, TF-A2B-F06-04, WP-A2B-F06-03 | none |
| affected_subjects | customer or applicant | 0.60-0.90 | TF-A2B-F06-04 | exact subject may require route/domain label |
| human_review | absent with bounded-path evidence | 0.80-1.00 | TF-A2B-F06-05, WP-A2B-F06-04 | absent only because bounded path shows no review step |
| automation_level | fully_automated | 0.80-1.00 | TF-A2B-F06-03, TF-A2B-F06-05 | none |
| potential_harm_categories | eligibility_decision, access_or_status_impact | 0.70-0.90 | TF-A2B-F06-04, TF-A2B-F06-05 | legal category requires citation |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

Conflict if WizardProfile claims no automated decision or claims human review without evidence. Classification remains locked until Manager resolution and VerifiedProfile creation.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Eligible for automated-decision/high-impact legal rule matching when VerifiedProfile and citations exist.
- Reason: AI output plus decision rule plus state-changing action plus no review forms the automated decision condition.
- Citation requirements: Legal classification requires pinned legal corpus citation and cannot rely on fixture wording alone.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: The automated decision is based on traced output-to-action path.
- Must block or abstain when usage/evidence is unclear: If any part of output, threshold, action or review absence is unresolved, classification is blocked or degraded.

## Acceptance Assertions

- Automated decision requires all required elements, not just AI provider usage.
- Human review absence is based on bounded path evidence only.
- Missing citations or unresolved conflict block final output.

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
