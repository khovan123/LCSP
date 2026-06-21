# Validation Evidence Capture Template

## Purpose

Provide a common evidence record template for A1, A2, A2-b and A3 validation. This file is a template only and does not record real validation results.

## Common Evidence Record

| Field | Value |
| --- | --- |
| validation_run_id | TBD |
| validation_type | A1 / A2 / A2-b / A3 |
| protocol_version | TBD |
| fixture_or_participant_ref | TBD |
| reviewer_role | TBD |
| date | TBD |
| input_reference | TBD |
| observed_result | TBD |
| expected_result | TBD |
| pass_fail_inconclusive | NOT_RUN |
| disagreement_note | TBD |
| evidence_reference | TBD |
| privacy_classification | TBD |
| required_follow_up | TBD |

## Phase 4.1.1 Required Execution Metadata

These fields must be resolved before a validation run is opened. Values shown as `TBD` or `PENDING_OWNER_CONFIRMATION` are execution blockers.

| Field | Required Rule |
| --- | --- |
| protocol_version | Must use the approved stream protocol version, not `TBD` |
| storage_reference | Must point to the approved evidence workspace/folder/reference |
| custodian | Must identify the approved Evidence Storage Custodian |
| access_scope | Must list approved roles or named individuals with access |
| retention_policy_ref | Must reference the approved retention/deletion policy |
| consent_record_ref | Required for participant/reviewer evidence where applicable |
| fixture_hash_or_spec_ref | Required for fixture-based validation |

Proposed protocol version labels:

| Validation | Proposed Protocol Version | Status |
| --- | --- | --- |
| A1 | A1-WIZARD-VALIDATION-v0.1 | PENDING_OWNER_CONFIRMATION |
| A2 | A2-LEGAL-CORPUS-VALIDATION-v0.1 | PENDING_OWNER_CONFIRMATION |
| A2-b1 | A2B1-MAPPING-DESIGN-VALIDATION-v0.1 | PENDING_OWNER_CONFIRMATION |
| A3 | A3-GOVERNANCE-VALIDATION-v0.1 | PENDING_OWNER_CONFIRMATION |

Allowed validation result values:

```text
PASS
PASS_WITH_REQUIRED_UPDATES
INCONCLUSIVE_REQUIRES_RERUN
FAIL_REQUIRES_PRODUCT_OR_ARCHITECTURE_AMENDMENT
```

## A1 Evidence Addendum

| Field | Value |
| --- | --- |
| participant_role | SME Manager / compliance-oriented user / technical manager |
| scenario_id | A1-T01..A1-T05 |
| critical_fields_completed | TBD |
| critical_fields_unknown | TBD |
| developer_assistance_needed | TBD |
| confusion_points | TBD |
| timing_minutes | TBD |
| blocked_state_understood | TBD |

## A2 Evidence Addendum

| Field | Value |
| --- | --- |
| sample_id | A2-S1..A2-S5 |
| corpus_version | TBD |
| rule_id | TBD |
| citation_ref | TBD |
| citation_correct | TBD |
| rule_family_expected | TBD |
| rule_family_observed | TBD |
| reviewer_agreement | TBD |

## A2-b Evidence Addendum

| Field | Value |
| --- | --- |
| fixture_id | F-SCAN / F-CONFLICT |
| fixture_version | TBD |
| expected_technical_findings | TBD |
| observed_technical_findings | TBD |
| expected_aiusageflow_claims | TBD |
| observed_aiusageflow_claims | TBD |
| material_claims_have_evidence_refs | TBD |
| uncertainty_behavior | TBD |
| legal_rule_eligibility | TBD |
| false_positive_note | TBD |
| false_negative_note | TBD |

## A3 Evidence Addendum

| Field | Value |
| --- | --- |
| scenario_id | A3-S1..A3-S6 |
| attempted_bypass | TBD |
| expected_blocking_behavior | TBD |
| observed_blocking_behavior | TBD |
| expected_audit_records | TBD |
| observed_audit_records | TBD |
| scanner_evidence_preserved | TBD |
| manager_final_authority_preserved | TBD |

## Privacy Rules

- Do not paste raw source code.
- Do not paste secrets, tokens or credentials.
- Do not paste full prompts.
- Do not include real customer personal data.
- Use fixture IDs, hashes, evidence refs and pseudonymized participant refs.
