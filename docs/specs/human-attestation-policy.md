# Human Attestation Policy

## Purpose

Defines controlled human attestation as an evidence supplement. Attestation is not a bypass.

ADR-008 remains validation-dependent until A3 is tested.

## Required Schema

Every accepted attestation must include:

- assessment_id
- source_type = HUMAN_TECHNICAL_ATTESTATION or equivalent controlled source
- attested_by user id
- role
- claim field
- claim value
- reason
- scope
- timestamp
- supporting_evidence_refs where applicable
- audit event reference

## Manager Claim Scope

Manager may confirm:

- business purpose
- user group
- user impact
- affected rights/benefits
- human review process as actually operated
- business/legal meaning of evidence
- final assessment confirmation

## Developer Claim Scope

Developer may attest:

- repo/branch/commit correctness
- production scope
- model call is production logic
- scanner false positive/false negative
- technical profile correction
- decision flow in code
- deployment/runtime technical truth

## Dual Confirmation Claims

Claims requiring Manager + Developer:

- auto_decision
- ai_assisted_decision
- human_oversight
- sensitive_data_usage
- user-facing external LLM
- biometric_or_high_impact_use
- any conflict that can change risk level

## Forbidden Claims / Metadata Replacement

Attestation must not replace:

- report hash
- scanner version
- ruleset version
- scan timestamp
- repo/commit metadata
- legal corpus version
- evidence report integrity
- machine-generated privacy flags

## Audit Events

Audit must record:

- attestation submitted
- attestation accepted/rejected
- role-bound claim violation
- forbidden metadata replacement attempt
- dual-confirmation request
- dual-confirmation completion
- report disclosure when attestation influenced classification

## Abuse Cases

| Abuse case | Expected behavior |
| --- | --- |
| Developer replaces scanner_version | Reject/block |
| Manager confirms technical truth alone | Reject or route to Developer |
| Developer denies auto_decision despite high conflict | Block until dual confirmation |
| Attestation missing scope/timestamp/reason | Reject |
| Critical claim lacks dual confirmation | Block VerifiedProfile/classification |

## Reject / Block Conditions

- Free-text attestation attempts to unlock classification.
- Wrong role makes claim.
- Required schema missing.
- Critical claim lacks dual confirmation.
- Attestation replaces forbidden metadata.
