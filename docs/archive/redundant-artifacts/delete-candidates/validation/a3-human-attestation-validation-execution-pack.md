# A3 Human Attestation Validation Execution Pack

## Purpose

Prepare real validation for A3: whether Manager conflict resolution, human attestation and optional Developer clarification can operate without bypassing scanner evidence, Manager ownership, VerifiedProfile gating or auditability.

## Scope

This is preparation only. It does not run abuse testing, record real results or change governance policy.

## Source References

- `docs/product/validation-plan.md`
- `docs/product/validation-execution-plan.md`
- `docs/specs/reconciliation-policy.md`
- `docs/qa/manual-validation-protocols.md`
- `docs/qa/test-fixture-and-test-data-design.md`
- `docs/qa/release-quality-gate-model.md`

## Reviewer Roles

| Reviewer | Responsibility |
| --- | --- |
| Governance/security reviewer | Evaluates abuse and bypass risk |
| Product owner | Evaluates Manager authority and workflow usability |
| Architecture reviewer | Evaluates whether behavior requires architecture/ADR amendment |
| QA recorder | Captures expected vs observed response and evidence |

## Phase 4.1.1 Proposed Review Model

| Decision Item | Proposed Value | Status |
| --- | --- | --- |
| Protocol version | A3-GOVERNANCE-VALIDATION-v0.1 | APPROVED_FOR_EXECUTION |
| Reviewer model | Governance Reviewer: Phan Nguyễn Quốc Minh; Security / Assurance Reviewer: Nguyễn Anh Tú | APPROVED_FOR_EXECUTION |
| Product owner role | Reviews Manager authority and workflow usability; cannot be sole governance/security reviewer | APPROVED_FOR_EXECUTION |
| QA recorder | Captures evidence and audit expectations; does not adjudicate alone | APPROVED_FOR_EXECUTION |

## Phase 4.1.2 Approval Normalization

Phase 4.1.2 normalizes A3 according to owner confirmation `DEC-VAL-2026-001`.

| Decision Item | Normalized Value | Status |
| --- | --- | --- |
| Governance Reviewer | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| Security / Assurance Reviewer | Nguyễn Anh Tú | APPROVED_FOR_EXECUTION |
| Critical abuse scenarios fail closed | 100% | APPROVED_FOR_EXECUTION |
| Original scanner evidence preserved | 100% | APPROVED_FOR_EXECUTION |
| Unresolved conflict blocks classification | 100% | APPROVED_FOR_EXECUTION |
| Missing citation blocks/degrades final output | 100% | APPROVED_FOR_EXECUTION |
| State-changing governance action produces audit record | 100% | APPROVED_FOR_EXECUTION |
| Silent overwrite of scanner evidence | 0 allowed | APPROVED_FOR_EXECUTION |

This normalization prepares A3 for Phase 4.2 readiness recheck only. It does not run abuse validation, collect evidence or claim A3 results.

## Abuse / Governance Scenarios

| Scenario ID | Scenario | Required Workflow Response | Expected Audit Records | Expected Blocking Behavior | Reviewer Checklist | Acceptance Threshold | Abuse-Prevention Evidence | Required Updates if Failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A3-S1 | Manager attempts to minimize AI impact despite scanner evidence | Reconciliation creates/keeps conflict; Manager must resolve with traceable confirmation/update | `CONFLICT_FOUND`, `MANAGER_CONFLICT_RESOLUTION_REQUIRED`, resolution attempt | Classification locked until conflict resolved and VerifiedProfile approved | Scanner evidence preserved? Manager note recorded? | Manager cannot silently erase scanner evidence | ConflictRecord with both Wizard and scanner refs | Reconciliation policy, UX, audit docs |
| A3-S2 | Manager states human review exists without supporting process evidence | Human review remains unclear or conflict created; evidence needed | Manager declaration, unresolved review note | Classification blocked/degraded if review is critical | Is bounded-path review evidence present? | Unsupported review claim cannot reduce risk alone | AIUsageFlow `human_review=unclear` or conflict | AIUsageFlow spec, reconciliation policy |
| A3-S3 | Manager tries to resolve conflict by removing technical evidence | System preserves scanner evidence and audit; resolution cannot delete findings | denied update or traceable correction event | VerifiedProfile not built from erased evidence | Evidence refs preserved? | Objective scanner metadata cannot be overwritten by attestation | Audit showing attempted change and preserved refs | RBAC/audit/reconciliation docs |
| A3-S4 | Manager leaves conflict unresolved but requests classification | Classification request rejected | `CLASSIFICATION_BLOCKED`, unresolved conflict ref | Classification and final document locked | Does blocked state cite conflict? | 100% unresolved conflicts block classification | Workflow state remains conflict-required | State machine/API docs |
| A3-S5 | Manager changes declaration after TechnicalProfile creation | Reconciliation reruns; previous declaration retained by audit/version | WizardProfile version update, reconciliation rerun | VerifiedProfile invalidated until no conflict remains | Prior version retained? | Changes must be versioned and audited | WizardProfile version refs | Data model/reconciliation docs |
| A3-S6 | Manager requests final document with missing citation or unresolved conflict | Document generation blocked | `DOCUMENT_GENERATION_BLOCKED`, citation/conflict reason | Final output not generated | Citation/conflict reason visible? | 100% final docs require valid prerequisites | Output Guardrail event | Document generation/citation guardrail docs |

## Acceptance Thresholds

| Threshold | Required |
| --- | --- |
| Developer final authority | 0 cases allow Developer to finalize conflict or unblock classification |
| Evidence override | 0 cases allow Manager/attestation to erase scanner facts |
| Unresolved conflict | 100% unresolved conflicts block classification and final document |
| Auditability | 100% abuse attempts produce required audit or denial trace |
| VerifiedProfile gate | 100% classification requests require valid VerifiedProfile |

Phase 4.1.2 approves the fail-closed governance thresholds listed below for Phase 4.2 readiness recheck. Evidence collection still requires explicit Phase 4.2 permission.

### Phase 4.1.1 Proposed Thresholds

These thresholds were owner-confirmed in `DEC-VAL-2026-001` for Phase 4.2 readiness recheck. They do not authorize evidence collection until a Phase 4.2 checkpoint explicitly allows A3.

| Threshold | Proposed Default | Status |
| --- | --- | --- |
| Fail-closed behavior | 100% of critical abuse scenarios fail closed | APPROVED_FOR_EXECUTION |
| Evidence and audit preservation | 100% preserve original scanner evidence and audit trail | APPROVED_FOR_EXECUTION |
| Conflict/citation blockers | 100% block classification or final document when unresolved conflict or missing citation exists | APPROVED_FOR_EXECUTION |
| Scanner finding overwrite | No Manager action silently overwrites scanner findings | APPROVED_FOR_EXECUTION |
| Governance audit | All state-changing governance actions produce audit evidence | APPROVED_FOR_EXECUTION |

## Failure Criteria

- Attestation replaces scanner facts or machine-generated metadata.
- Developer clarification finalizes conflict in MVP.
- Unresolved conflict allows classification or final document.
- Audit record missing for conflict resolution or denied bypass attempt.
- Manager resolution lacks evidence refs or versioned declaration.

## Inconclusive Criteria

- Scenario setup does not include required evidence refs.
- Reviewer cannot distinguish policy failure from ambiguous scenario wording.
- Audit evidence format is incomplete.

## Evidence Capture

| Field | Capture |
| --- | --- |
| scenario_id | A3-S1..A3-S6 |
| actor_role | Manager / optional Developer / System |
| attempted_action | Short action description |
| expected_response | Required block/allow/clarification |
| observed_response | Actual response when validation runs |
| audit_expected | Expected audit event(s) |
| audit_observed | Actual evidence |
| bypass_successful | yes/no/inconclusive |
| reviewer_decision | pass/fail/inconclusive |
| required_update | Product/spec/architecture/ADR/QA update |

## Privacy Rules

- Use synthetic conflict records only.
- Do not include real employee/customer data.
- Do not store real repository source or screenshots containing secrets.
- Pseudonymize reviewer and participant identifiers.
