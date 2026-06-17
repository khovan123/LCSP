# A2B-F-09 Provider SDK Only

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

The repository has an AI provider SDK or dependency in a manifest, but no proven AI model invocation and no traceable downstream business impact.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| ai_provider_present | yes | WP-A2B-F09-01 |
| ai_purpose | unknown | WP-A2B-F09-02 |
| downstream_action | unknown | WP-A2B-F09-03 |
| legal_risk_from_provider_only | no | WP-A2B-F09-04 |

## Expected Scanner Signals

- Expected detection signals: AI_PROVIDER_USAGE or AI_FRAMEWORK_USAGE from manifest/import only.
- Expected non-signals: AI_MODEL_INVOCATION, AI_INPUT_SIGNAL, AI_OUTPUT_SIGNAL, AI_DECISION_FLOW_SIGNAL, AUTOMATED_DECISION_SIGNAL, RANKING_SIGNAL, HUMAN_REVIEW_SIGNAL.
- Expected uncertainty or coverage limits: purpose/action/subjects remain unknown because no invocation or flow is proven.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F09-01 | AI_PROVIDER_USAGE | Provider SDK or framework dependency exists | 0.60-0.80 |
| TF-A2B-F09-02 | SCAN_COVERAGE_LIMITATION | No invocation/downstream path proven from provider-only signal | 0.40-0.70 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | unknown | 0.00-0.39 | TF-A2B-F09-02 | provider-only signal has no business context |
| ai_purpose | unknown | 0.00-0.39 | TF-A2B-F09-01, TF-A2B-F09-02, WP-A2B-F09-02 | no model invocation |
| ai_input_types | unknown | 0.00-0.39 | TF-A2B-F09-02 | no input flow |
| ai_output_types | unknown | 0.00-0.39 | TF-A2B-F09-02 | no output flow |
| downstream_action | unknown | 0.00-0.39 | TF-A2B-F09-02, WP-A2B-F09-03 | no downstream trace |
| affected_subjects | unknown | 0.00-0.39 | TF-A2B-F09-02 | no subject evidence |
| human_review | unclear | 0.00-0.39 | TF-A2B-F09-02 | no review path |
| automation_level | unclear | 0.00-0.39 | TF-A2B-F09-02 | no decision flow |
| potential_harm_categories | unknown | 0.00-0.39 | TF-A2B-F09-02, WP-A2B-F09-04 | no legal-risk inference from provider only |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

No high-impact conflict should be created from provider-only evidence. If WizardProfile says no active AI usage, reconciliation may request clarification but must not conclude legal risk without invocation and usage-flow evidence.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Not eligible for high-impact legal rule matching from provider-only evidence; blocked for critical usage claims.
- Reason: Provider/framework presence alone is not legal-risk classification.
- Citation requirements: Any future legal matching requires evidence-backed AIUsageFlow claims and pinned citations.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: This is the core assertion of the fixture.
- Must block or abstain when usage/evidence is unclear: Unknown purpose/action/subjects block unsupported final classification.

## Acceptance Assertions

- Provider-only signal produces no automated/high-impact classification.
- Missing invocation and downstream action remain unknown/unclear.
- Claims without evidence refs cannot be used for legal rule matching.

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
