# A2B-F-01 Internal Summarization

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

Internal staff use an AI feature to summarize internal documents. The expected design shows an AI invocation and generated summary, but no approval, rejection, ranking, notification, status update or other automated downstream decision.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | internal_productivity | WP-A2B-F01-01 |
| ai_purpose | summarization | WP-A2B-F01-02 |
| human_review | not material to downstream decision | WP-A2B-F01-03 |
| automated_decision | no | WP-A2B-F01-04 |

## Expected Scanner Signals

- Expected detection signals: AI_PROVIDER_USAGE, AI_MODEL_INVOCATION, AI_INPUT_SIGNAL, AI_OUTPUT_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: AUTOMATED_DECISION_SIGNAL, RANKING_SIGNAL, RECOMMENDATION_SIGNAL, STATUS_UPDATE_SIGNAL, HUMAN_REVIEW_SIGNAL.
- Expected uncertainty or coverage limits: downstream action may be unknown if the summary display path is not visible; no high-impact inference is allowed from provider/model/framework presence.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F01-01 | AI_MODEL_INVOCATION | Model call exists in an internal summarization service | 0.80-1.00 |
| TF-A2B-F01-02 | AI_INPUT_SIGNAL | Internal document/user text enters the model invocation | 0.60-0.90 |
| TF-A2B-F01-03 | AI_OUTPUT_SIGNAL | Model output is a summary or generated_text | 0.60-0.90 |
| TF-A2B-F01-04 | USER_IMPACT_SIGNAL | Output is for internal staff only | 0.60-0.90 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | internal_productivity | 0.70-0.90 | TF-A2B-F01-01, TF-A2B-F01-04, WP-A2B-F01-01 | none |
| ai_purpose | summarization | 0.70-0.90 | TF-A2B-F01-01, TF-A2B-F01-03, WP-A2B-F01-02 | none |
| ai_input_types | user_input, public_data or unknown internal text labels | 0.60-0.80 | TF-A2B-F01-02 | exact source category may be partial |
| ai_output_types | summary | 0.70-0.90 | TF-A2B-F01-03 | none |
| downstream_action | display_to_user or none | 0.60-0.80 | TF-A2B-F01-03, TF-A2B-F01-04 | unknown if display path is not visible |
| affected_subjects | internal_staff | 0.60-0.80 | TF-A2B-F01-04 | none |
| human_review | unclear | 0.40-0.59 | WP-A2B-F01-03 | not material unless downstream decision appears |
| automation_level | assistive | 0.70-0.90 | TF-A2B-F01-03, TF-A2B-F01-04 | none |
| potential_harm_categories | none identified or low-impact informational | 0.40-0.70 | TF-A2B-F01-04 | legal relevance requires cited rule if later used |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

No conflict if WizardProfile describes an internal assistant/summarizer and scanner evidence shows no downstream decision action. Create clarification only if the downstream action is unknown and material to classification.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Eligible only for evidence-backed general governance or transparency rules where citations exist; not eligible for high-impact automated decision rules.
- Reason: The fixture does not show AI output controlling approval, rejection, ranking or status changes.
- Citation requirements: No legal conclusion may be rendered without pinned corpus citation; provider/model detection is not a citation basis.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: Provider or model invocation alone must not create high-risk classification.
- Must block or abstain when usage/evidence is unclear: If downstream impact becomes unknown and material, final classification must be blocked or routed to traceable Manager clarification.

## Acceptance Assertions

- A2-b1 reviewers confirm this fixture remains assistive/internal unless evidence of downstream decision appears.
- Every material AIUsageFlow claim used for rule mapping has evidence_refs.
- Internal summarization is not treated as an automated high-impact decision.

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
