# A2B-F-02 Customer Chatbot Without Material Decision

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

A customer-facing chatbot receives a user message and returns generated text. No evidence shows that the chatbot approves, rejects, ranks, changes account status, triggers a notification with material effect or makes a decision about the user.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | customer_support | WP-A2B-F02-01 |
| ai_purpose | chatbot | WP-A2B-F02-02 |
| downstream_action | display_to_user | WP-A2B-F02-03 |
| automated_decision | no | WP-A2B-F02-04 |

## Expected Scanner Signals

- Expected detection signals: AI_PROVIDER_USAGE, AI_MODEL_INVOCATION, AI_INPUT_SIGNAL, AI_OUTPUT_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: AUTOMATED_DECISION_SIGNAL, RANKING_SIGNAL, RECOMMENDATION_SIGNAL, STATUS_UPDATE_SIGNAL, HUMAN_REVIEW_SIGNAL unless explicitly represented.
- Expected uncertainty or coverage limits: protected-domain advice or decision impact remains unclear unless evidenced by route/service/output path.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F02-01 | AI_MODEL_INVOCATION | Chat service invokes an AI model | 0.80-1.00 |
| TF-A2B-F02-02 | AI_INPUT_SIGNAL | User message enters the model invocation | 0.70-0.90 |
| TF-A2B-F02-03 | AI_OUTPUT_SIGNAL | Model output is generated_text | 0.70-0.90 |
| TF-A2B-F02-04 | USER_IMPACT_SIGNAL | Response is displayed to a customer | 0.70-0.90 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | customer_support | 0.70-0.90 | TF-A2B-F02-01, TF-A2B-F02-04, WP-A2B-F02-01 | none |
| ai_purpose | chatbot | 0.70-0.90 | TF-A2B-F02-01, TF-A2B-F02-03, WP-A2B-F02-02 | none |
| ai_input_types | user_input | 0.70-0.90 | TF-A2B-F02-02 | none |
| ai_output_types | generated_text | 0.70-0.90 | TF-A2B-F02-03 | none |
| downstream_action | display_to_user | 0.70-0.90 | TF-A2B-F02-03, TF-A2B-F02-04, WP-A2B-F02-03 | none |
| affected_subjects | customer | 0.70-0.90 | TF-A2B-F02-04 | none |
| human_review | unclear | 0.40-0.59 | WP-A2B-F02-04 | not needed for no-decision chatbot unless review is claimed |
| automation_level | assistive | 0.70-0.90 | TF-A2B-F02-03, TF-A2B-F02-04 | no state-changing action |
| potential_harm_categories | customer-facing communication risk only if rule-cited | 0.40-0.70 | TF-A2B-F02-04 | legal category depends on cited corpus rule |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

No conflict if WizardProfile says the system is a customer-support chatbot without automated decision authority. Conflict only if WizardProfile denies customer-facing AI use or scanner evidence later shows a material downstream decision.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Eligible for customer-facing transparency or communication rules if supported by citations; not eligible for automated decision/high-impact rules from this fixture alone.
- Reason: Generated text is returned to the user, but no decision action is traced.
- Citation requirements: Any user-facing transparency conclusion requires pinned corpus citation.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: Provider or framework usage does not create high-impact classification.
- Must block or abstain when usage/evidence is unclear: If the bot’s advice domain or downstream action is unclear and material, classification must be blocked or degraded.

## Acceptance Assertions

- Ordinary chatbot flow is not labeled automated high-impact decision without a traced decision action.
- User-facing output remains separate from approve/reject, ranking or status update signals.
- Claim-level evidence_refs are present for every rule-eligible claim.

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
