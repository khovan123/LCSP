# A2B-F-07 Dynamic Prompt Runtime Dependency

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

AI behavior or prompt content depends on runtime database, remote configuration or external proprietary service data. Static analysis can identify the dynamic prompt reference but cannot inspect runtime content.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| business_process | unknown or Manager-declared context | WP-A2B-F07-01 |
| ai_purpose | unknown | WP-A2B-F07-02 |
| downstream_action | unknown | WP-A2B-F07-03 |
| human_review | unclear | WP-A2B-F07-04 |

## Expected Scanner Signals

- Expected detection signals: AI_PROVIDER_USAGE, AI_MODEL_INVOCATION, DYNAMIC_SYSTEM_PROMPT_REFERENCE, UNSUPPORTED_DYNAMIC_FLOW or SCAN_COVERAGE_LIMITATION.
- Expected non-signals: AUTOMATED_DECISION_SIGNAL unless a bounded static path independently proves it.
- Expected uncertainty or coverage limits: runtime prompt/config boundary must generate uncertainty and prevent unsupported purpose or risk inference.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F07-01 | AI_MODEL_INVOCATION | Model invocation exists | 0.70-0.90 |
| TF-A2B-F07-02 | DYNAMIC_SYSTEM_PROMPT_REFERENCE | Prompt or behavior loaded from runtime source | 0.70-0.90 |
| TF-A2B-F07-03 | UNSUPPORTED_DYNAMIC_FLOW | Static scanner cannot inspect runtime prompt/config | 0.80-1.00 |
| TF-A2B-F07-04 | SCAN_COVERAGE_LIMITATION | Purpose/downstream claims are coverage-limited | 0.80-1.00 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | unknown | 0.00-0.39 | TF-A2B-F07-03, WP-A2B-F07-01 | runtime context not statically available |
| ai_purpose | unknown | 0.00-0.39 | TF-A2B-F07-02, TF-A2B-F07-03, WP-A2B-F07-02 | prompt/purpose loaded dynamically |
| ai_input_types | unknown | 0.00-0.59 | TF-A2B-F07-03 | input category cannot be fused reliably |
| ai_output_types | unknown | 0.00-0.59 | TF-A2B-F07-03 | output parser/path unresolved |
| downstream_action | unknown | 0.00-0.39 | TF-A2B-F07-04, WP-A2B-F07-03 | dynamic boundary blocks trace |
| affected_subjects | unknown | 0.00-0.39 | TF-A2B-F07-04 | no reliable subject path |
| human_review | unclear | 0.00-0.39 | TF-A2B-F07-04, WP-A2B-F07-04 | no bounded review path |
| automation_level | unclear | 0.00-0.39 | TF-A2B-F07-03, TF-A2B-F07-04 | cannot determine decision impact |
| potential_harm_categories | unknown | 0.00-0.39 | TF-A2B-F07-04 | legal category cannot be inferred |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

Create Manager clarification or conflict if WizardProfile provides a material usage purpose not supported by scanner-derived evidence. VerifiedProfile cannot rely on unsupported scanner claims.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Blocked for legal rule matching on unsupported critical claims.
- Reason: Critical business purpose, downstream action and automation level are unknown/unclear.
- Citation requirements: Citations cannot cure missing usage evidence; Manager clarification must be traceable before classification.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: Model invocation plus dynamic prompt reference is insufficient for risk classification.
- Must block or abstain when usage/evidence is unclear: Unknown purpose/downstream action blocks or degrades final classification.

## Acceptance Assertions

- Dynamic/runtime prompt boundary emits uncertainty or coverage limitation.
- Unsupported certainty is a failure.
- LLM may not receive raw prompt or full source to resolve the uncertainty.

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
