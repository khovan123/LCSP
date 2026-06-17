# A2B-F-08 Generated Minified Unsupported Source

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

The repository contains generated, minified, binary, unsupported-language or opaque source regions. The scanner must skip safely, emit coverage limitations and avoid unsupported inference about AI usage or legal risk.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| source_coverage | limited | WP-A2B-F08-01 |
| business_process | unknown | WP-A2B-F08-02 |
| ai_purpose | unknown | WP-A2B-F08-03 |
| downstream_action | unknown | WP-A2B-F08-04 |

## Expected Scanner Signals

- Expected detection signals: SCAN_COVERAGE_LIMITATION and possibly UNSUPPORTED_DYNAMIC_FLOW if an opaque boundary hides a material path.
- Expected non-signals: AI_MODEL_INVOCATION, AUTOMATED_DECISION_SIGNAL, HUMAN_REVIEW_SIGNAL unless separate supported evidence exists.
- Expected uncertainty or coverage limits: all hidden critical flow claims remain unknown/unclear.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F08-01 | SCAN_COVERAGE_LIMITATION | Generated/minified/unsupported region skipped | 0.80-1.00 |
| TF-A2B-F08-02 | UNSUPPORTED_DYNAMIC_FLOW | Opaque boundary prevents flow tracing when relevant | 0.60-0.90 |
| TF-A2B-F08-03 | DOMAIN_CONTEXT_SIGNAL | Only weak context may exist from file path/manifest | 0.00-0.59 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | unknown | 0.00-0.39 | TF-A2B-F08-01, WP-A2B-F08-02 | unsupported source coverage |
| ai_purpose | unknown | 0.00-0.39 | TF-A2B-F08-01, WP-A2B-F08-03 | no reliable invocation/purpose evidence |
| ai_input_types | unknown | 0.00-0.39 | TF-A2B-F08-01 | unsupported source coverage |
| ai_output_types | unknown | 0.00-0.39 | TF-A2B-F08-01 | unsupported source coverage |
| downstream_action | unknown | 0.00-0.39 | TF-A2B-F08-01, TF-A2B-F08-02, WP-A2B-F08-04 | hidden flow boundary |
| affected_subjects | unknown | 0.00-0.39 | TF-A2B-F08-01 | no reliable subject signal |
| human_review | unclear | 0.00-0.39 | TF-A2B-F08-01 | no bounded review path |
| automation_level | unclear | 0.00-0.39 | TF-A2B-F08-01, TF-A2B-F08-02 | cannot determine decision impact |
| potential_harm_categories | unknown | 0.00-0.39 | TF-A2B-F08-01 | no rule-eligible category |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

If WizardProfile supplies a material business purpose, reconciliation must keep scanner coverage limitation visible and distinguish Manager declaration from scanner-derived evidence. If the limitation hides critical usage, classification blocks or requires traceable clarification.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Blocked for claims hidden by unsupported/minified/generated source coverage limitations.
- Reason: Unsupported source cannot support legal-risk inference.
- Citation requirements: No legal citation can substitute for missing technical evidence.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: If provider evidence is absent or hidden, no provider-based risk conclusion is allowed.
- Must block or abstain when usage/evidence is unclear: Critical unknown flow blocks final classification or requires traceable Manager clarification.

## Acceptance Assertions

- Scanner skips unsafe/unsupported regions and emits limitation.
- Unknown claims are not converted into legal conclusions.
- Coverage limitation is visible to reviewers.

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
