# Technical Evidence Report Contract

## Purpose

Defines the product/architecture contract for technical evidence reports. This is not a JSON schema or implementation code.

## Required Field Groups

| Field group | Required? | Purpose |
| --- | --- | --- |
| assessment_id | Yes | Map report to assessment |
| source_type | Yes | GitHub App, Local/CI, manual JSON, API probe, human technical attestation |
| system_identifier | Yes | System/repo/API being assessed |
| provenance | Yes | Actor, provider, repo, branch, commit, environment |
| scanner_version | Required for scanner-generated reports | Reproducibility |
| ruleset_version | Required for scanner-generated reports | Detection rule trace |
| timestamp | Yes | Freshness |
| scope | Yes | Files/languages/tools/coverage |
| privacy_flags | Yes | No raw source/full AST/secrets handling violation |
| technical_profile | Yes | Normalized technical signals |
| findings | Yes, may be empty | Evidence items |
| confidence_per_signal | Yes | Signal confidence |
| report_hash | Yes | Integrity |

Optional fields:

- `report_version`
- `supporting_document_refs`
- `api_probe_refs`
- `attestation_refs`

## Technical Profile Minimum Dimensions

| Dimension | Required status |
| --- | --- |
| ai_usage_signals | DETECTED, NOT_DETECTED, UNKNOWN |
| data_type_signals | DETECTED, NOT_DETECTED, UNKNOWN |
| decision_flow_signals | DETECTED, NOT_DETECTED, UNKNOWN |
| human_oversight_signals | DETECTED, NOT_DETECTED, UNKNOWN |

## Schema Completeness Gate

Reject report if:

- Missing assessment mapping.
- Missing source type/system identifier.
- Missing provenance.
- Missing required scanner/report version.
- Missing timestamp/scope/privacy flags.
- Missing technical profile or findings array.
- Missing report hash.
- Privacy flags indicate raw source sent to LLM or long-term raw source storage.

## Quality Threshold Gate

Accepting a report is not the same as unlocking classification.

| Condition | Result |
| --- | --- |
| Schema fail | TECHNICAL_EVIDENCE_REJECTED |
| Schema pass but quality/context insufficient | TECHNICAL_EVIDENCE_INSUFFICIENT |
| Schema pass and quality threshold pass | TECHNICAL_EVIDENCE_READY |

Quality threshold is context-aware and depends on WizardProfile. A1 validation may change required Wizard fields and therefore threshold logic.

## Accepted Evidence Condition

Evidence can participate in reconciliation when:

- Schema completeness gate passes.
- Privacy flags pass.
- Provenance is present.
- Technical profile includes required dimensions.
- Evidence quality is sufficient or supplemented by valid controlled evidence.

## Insufficient Evidence Condition

Evidence remains insufficient when:

- Critical fields are UNKNOWN/low-confidence for a high-impact context.
- Scope coverage is too low.
- Provenance is stale or incomplete but not schema-invalid.
- Scanner evidence is weak and no valid supplemental evidence exists.

## Guardrails

- Scanner evidence creates technical evidence; it does not create legal conclusions.
- Raw source code must not be sent to LLM.
- Raw source code must not be stored long-term.
- Findings must not include long source snippets.
