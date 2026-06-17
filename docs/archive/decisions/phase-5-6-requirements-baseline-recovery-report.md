# Phase 5.6 Requirements Baseline Recovery Report

## Scope

Mode: `REQUIREMENTS_BASELINE_RECOVERY`. This recovery used existing active docs and archived delete-candidate requirement catalogs only. No new use cases, FRs, NFRs, business rules, PRD content, architecture, stories, or backlog items were created.

## Files Created

- `docs/specs/requirements-baseline.md`
- `docs/specs/requirements-traceability-summary.md`
- `docs/archive/decisions/phase-5-6-requirements-baseline-recovery-report.md`

## Source Documents Used

- `docs/archive/decisions/requirements-baseline-audit-report.md`
- `docs/product/prd.md`
- `docs/product/business-rules.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/use-case-specification.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/functional-requirements.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/non-functional-requirements.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/traceability-matrix.md`

## Recovery Actions

| Area | Result | Evidence |
| --- | --- | --- |
| Use Case Recovery | COMPLETED | 63 UC IDs referenced by active business rules inventoried |
| FR Namespace Normalization | PARTIAL | 78 legacy FR aliases listed; 20 have no active PRD equivalent |
| NFR Namespace Normalization | PARTIAL | 29 legacy NFR aliases listed; 8 have no active PRD equivalent |
| Acceptance Criteria Mapping | COMPLETED_WITH_SCOPE_NOTES | 16 ACs inventoried; AC-13..AC-16 are documentation acceptance criteria |
| Lightweight Traceability | COMPLETED | 94 BR rows summarized with UC/FR/NFR resolution status |
| Governance | COMPLETED | Authority split recorded in both created specs |

## Verification Results

| Check | Result | Evidence |
| --- | --- | --- |
| No contradictory FR namespaces remain | PARTIAL | `FR-E*` is canonical and `FR-###` is legacy alias only; however several legacy aliases have `NO_ACTIVE_PRD_EQUIVALENT` |
| No contradictory NFR namespaces remain | PARTIAL | `NFR-1..14` is canonical and `NFR-###` is legacy alias only; however several legacy aliases have `NO_ACTIVE_PRD_EQUIVALENT` |
| Every BR trace reference can be resolved | PASS | Every referenced legacy FR/NFR ID has a crosswalk resolution status |
| Every AC can be traced | PASS_WITH_SCOPE_NOTES | AC-1..AC-12 map to runtime FR/BR/NFR; AC-13..AC-16 map to PRD documentation acceptance scope |

## Remaining Gaps

| Gap | Impact | Required Follow-up |
| --- | --- | --- |
| Legacy auth/account FR aliases have no active PRD `FR-E*` equivalent | Cannot honestly map all `FR-###` to active PRD requirements without creating new PRD requirements. | Owner decision: either keep them as archived aliases, restore as active PRD FRs, or remove active BR trace references. |
| Legacy security/auth NFR aliases have no active PRD `NFR-#` equivalent | Some active BR NFR trace references resolve only to archived aliases. | Owner decision: either expand active PRD NFR catalog from archived source or classify those aliases as archived/out-of-scope. |
| PRD documentation ACs are not runtime ACs | AC-13..AC-16 cannot map to runtime UC/FR/BR/NFR without inventing false relationships. | Keep separate as documentation acceptance criteria or move them out of product AC list. |

## Final Decision

`REQUIREMENTS_BASELINE_STILL_INCOMPLETE`

Reason: The recovery created an active baseline and traceability summary, but the no-invention rule prevents forcing legacy auth/account/security aliases into PRD `FR-E*` / `NFR-1..14` equivalents that do not currently exist.

