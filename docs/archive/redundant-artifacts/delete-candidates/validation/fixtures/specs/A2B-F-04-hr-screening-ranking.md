# A2B-F-04 HR Screening Ranking

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

An HR screening flow uses AI to score or rank synthetic candidate profiles. The ranking action is visible, but the fixture requires downstream hiring decision automation to remain unclear unless evidence proves that ranking directly controls approval, rejection or status change.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | recruitment | WP-A2B-F04-01 |
| ai_purpose | ranking | WP-A2B-F04-02 |
| downstream_action | rank | WP-A2B-F04-03 |
| automated_decision | unclear unless final decision action is evidenced | WP-A2B-F04-04 |

## Expected Scanner Signals

- Expected detection signals: AI_MODEL_INVOCATION, AI_INPUT_SIGNAL, SENSITIVE_DATA_SIGNAL, AI_OUTPUT_SIGNAL, RANKING_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: AUTOMATED_DECISION_SIGNAL unless ranking controls a state-changing approve/reject/status action without review.
- Expected uncertainty or coverage limits: human review and final hiring decision automation are unclear unless a bounded path exists.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F04-01 | AI_MODEL_INVOCATION | Candidate scoring/ranking model invocation exists | 0.80-1.00 |
| TF-A2B-F04-02 | SENSITIVE_DATA_SIGNAL | Synthetic employment/candidate fields enter model | 0.70-0.90 |
| TF-A2B-F04-03 | AI_OUTPUT_SIGNAL | Model output is score/ranking | 0.80-1.00 |
| TF-A2B-F04-04 | RANKING_SIGNAL | Output controls sorting/ranking | 0.80-1.00 |
| TF-A2B-F04-05 | USER_IMPACT_SIGNAL | Candidate is affected subject | 0.70-0.90 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | recruitment | 0.80-1.00 | TF-A2B-F04-01, TF-A2B-F04-02, WP-A2B-F04-01 | none |
| ai_purpose | ranking | 0.80-1.00 | TF-A2B-F04-03, TF-A2B-F04-04, WP-A2B-F04-02 | none |
| ai_input_types | employment_data, personal_data | 0.70-0.90 | TF-A2B-F04-02 | synthetic category labels only |
| ai_output_types | ranking, score | 0.80-1.00 | TF-A2B-F04-03, TF-A2B-F04-04 | none |
| downstream_action | rank | 0.80-1.00 | TF-A2B-F04-04, WP-A2B-F04-03 | approve/reject remains unclear unless traced |
| affected_subjects | candidate | 0.70-0.90 | TF-A2B-F04-05 | none |
| human_review | unclear | 0.40-0.59 | WP-A2B-F04-04 | no bounded review path in this fixture |
| automation_level | decision_support or unclear | 0.40-0.70 | TF-A2B-F04-04, WP-A2B-F04-04 | final decision automation not proven |
| potential_harm_categories | employment_opportunity, ranking_impact | 0.70-0.90 | TF-A2B-F04-02, TF-A2B-F04-04 | legal category requires citation |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

No conflict if WizardProfile says AI ranks candidates and does not claim final automated decision. Create conflict if WizardProfile denies employment impact or scanner evidence later traces rank to automatic rejection/status change.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Eligible for recruitment/ranking rule mapping when cited; blocked for fully automated hiring decision unless approve/reject/status path is evidenced.
- Reason: Ranking is evidenced, but final decision automation is not assumed.
- Citation requirements: Any legal conclusion requires pinned legal citation and evidence-backed AIUsageFlow claims.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: Recruitment impact comes from ranking path evidence, not provider presence.
- Must block or abstain when usage/evidence is unclear: If downstream decision or human review is unclear and material, final classification is blocked/degraded.

## Acceptance Assertions

- HR ranking is distinct from automated rejection.
- Absence of review signal is not proof of absent review unless bounded path supports it.
- Unclear downstream decision remains unclear rather than overclaimed.

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
