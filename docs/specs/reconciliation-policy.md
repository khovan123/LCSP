# LCSP Reconciliation Policy

## Purpose

Defines how LCSP compares WizardProfile and TechnicalProfile to produce conflicts, route confirmations and create VerifiedProfile.

## Comparison Scope

Reconciliation compares critical fields including:

- ai_usage
- purpose
- sector
- data_type
- user_group
- user_impact
- decision_role
- human_oversight
- external_llm_usage
- biometric_or_high_impact_use
- production_scope

## Conflict Types

| Conflict type | Example | Primary resolver |
| --- | --- | --- |
| Technical evidence conflict | Scanner finding may be false positive | Developer |
| Scope/provenance conflict | Wrong repo/branch/commit scanned | Developer |
| Business/legal meaning conflict | Wizard purpose/user impact incorrect | Manager |
| Risk-impacting material conflict | Auto decision, data type, human oversight mismatch | Manager + Developer |

## Conflict Severity

| Severity | Meaning |
| --- | --- |
| Low | Not likely to affect risk/legal obligation |
| Medium | Needs review |
| Material | Can affect risk classification or obligations |
| Critical | Can materially change high-risk determination or legal responsibility |

## Conflict Score

Conflict Score determines blocking behavior. Evidence Confidence and AI Intervention may inform the score but cannot block alone.

## Confirmation Rules

| Claim | Required confirmation |
| --- | --- |
| Technical truth | Developer |
| Business/legal truth | Manager |
| auto_decision | Manager + Developer |
| ai_assisted_decision | Manager + Developer |
| human_oversight | Manager + Developer |
| sensitive_data_usage | Manager + Developer |
| user-facing external LLM | Manager + Developer |
| biometric/high-impact use | Manager + Developer |
| Any conflict changing risk level | Manager + Developer |

## VerifiedProfile Creation Rule

VerifiedProfile can be created only when:

- WizardProfile submitted.
- Technical evidence accepted for reconciliation.
- Schema and quality gates pass or valid supplemental evidence is accepted.
- No unresolved material/critical conflict remains.
- Required Manager/Developer confirmations are recorded.

## Block Conditions

- Conflict Score >= 0.75 and conflict affects risk classification/legal obligation.
- Conflict Score >= 0.85 on critical field.
- Critical confirmation missing.
- Evidence insufficient and no valid supplemental evidence.
