# A2B-F-10 Wizard Source Conflict

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

WizardProfile says AI only assists staff and has no downstream decision impact. Expected technical evidence indicates AI output feeds an automatic downstream approve/reject or status-changing action. Reconciliation must create a conflict and block classification until Manager resolution.

## Expected WizardProfile Claims

| Claim | Expected Value | Evidence Ref |
|---|---|---|
| ai_purpose | assistive | WP-A2B-F10-01 |
| downstream_action | none | WP-A2B-F10-02 |
| automation_level | assistive | WP-A2B-F10-03 |
| human_review | present or not material | WP-A2B-F10-04 |

## Expected Scanner Signals

- Expected detection signals: AI_MODEL_INVOCATION, AI_OUTPUT_SIGNAL, AI_DECISION_FLOW_SIGNAL, AUTOMATED_DECISION_SIGNAL, STATUS_UPDATE_SIGNAL, USER_IMPACT_SIGNAL.
- Expected non-signals: HUMAN_REVIEW_SIGNAL unless explicit review evidence exists before state change.
- Expected uncertainty or coverage limits: none expected if the bounded approve/reject path is complete.

## Expected Technical Findings

| Finding ID | Type | Expected Meaning | Confidence |
|---|---|---|---|
| TF-A2B-F10-01 | AI_MODEL_INVOCATION | Model invocation exists | 0.80-1.00 |
| TF-A2B-F10-02 | AI_OUTPUT_SIGNAL | Output is score/classification label | 0.80-1.00 |
| TF-A2B-F10-03 | AI_DECISION_FLOW_SIGNAL | Output controls decision branch | 0.80-1.00 |
| TF-A2B-F10-04 | STATUS_UPDATE_SIGNAL | Branch writes approve/reject/status update | 0.80-1.00 |
| TF-A2B-F10-05 | AUTOMATED_DECISION_SIGNAL | No evidenced review between output and state change | 0.80-1.00 |

## Expected AIUsageFlow Claims

| Claim | Value | Confidence | Evidence Refs | Uncertainty Reasons |
|---|---|---:|---|---|
| business_process | eligibility_decision or domain-specific process | 0.70-0.90 | TF-A2B-F10-01, TF-A2B-F10-04 | exact domain may require Manager clarification |
| ai_purpose | automated_decision | 0.80-1.00 | TF-A2B-F10-02, TF-A2B-F10-03, WP-A2B-F10-01 | conflicts with Wizard assistive claim |
| ai_input_types | personal_data or unknown | 0.40-0.80 | TF-A2B-F10-01 | exact category depends on synthetic fixture labels |
| ai_output_types | score, decision_label | 0.80-1.00 | TF-A2B-F10-02 | none |
| downstream_action | approve_reject or change_status | 0.80-1.00 | TF-A2B-F10-03, TF-A2B-F10-04, WP-A2B-F10-02 | conflicts with Wizard none claim |
| affected_subjects | customer/applicant/user | 0.60-0.90 | TF-A2B-F10-04 | exact subject may need Manager confirmation |
| human_review | absent with bounded-path evidence or unclear if review claim unsupported | 0.70-1.00 | TF-A2B-F10-05, WP-A2B-F10-04 | conflicts if Wizard claims review |
| automation_level | fully_automated | 0.80-1.00 | TF-A2B-F10-03, TF-A2B-F10-05, WP-A2B-F10-03 | conflicts with Wizard assistive claim |
| potential_harm_categories | eligibility_or_status_impact | 0.70-0.90 | TF-A2B-F10-04, TF-A2B-F10-05 | legal category requires citation |
| evidence_refs | claim-level refs required above | 1.00 | all listed refs | missing refs make claim ineligible |

## Expected Reconciliation Outcome

Conflict required. Orchestrator pauses the workflow, creates a Manager Conflict Resolution Task and keeps classification locked. Manager may provide traceable clarification or update the business declaration, but cannot erase scanner evidence.

## Expected Legal-Rule Eligibility

- Eligible / not eligible / blocked: Blocked until conflict resolution and VerifiedProfile creation; then eligible only for evidence-backed rule matching with citations.
- Reason: WizardProfile and scanner-derived AIUsageFlow disagree on downstream action and automation level.
- Citation requirements: Legal matching waits for resolved VerifiedProfile and pinned legal citations.

## Expected Classification Behavior

- Must not infer from provider/model/framework alone: Conflict is based on output-to-action path, not provider presence.
- Must block or abstain when usage/evidence is unclear: Any unresolved conflict blocks final classification and document generation.

## Acceptance Assertions

- Reconciliation conflict is mandatory.
- Manager cannot silently overwrite scanner facts.
- Classification remains locked until no unresolved conflict remains.

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
