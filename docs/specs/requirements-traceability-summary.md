# LCSP Requirements Traceability Summary

## Purpose

Summarize canonical requirement and planning traceability after Phase 5.2K pre-UX active-document closure. This document does not certify implementation readiness or story coverage.

## Canonical Inventory

| Item | Count / Status |
|---|---|
| Canonical FR total | 56 |
| Active MVP FR total | 53 (`FR-001..FR-049`, `FR-053..FR-056`) |
| Deferred FR total | 3 (`FR-050..FR-052`) |
| Active NFR total | 33 (`NFR-001..NFR-030`, `NFR-033..NFR-035`) |
| AC total | 41 |
| Canonical use cases | `UC-001..UC-018` |
| Canonical UX | authorized and pending creation |
| Canonical epics/stories | missing |
| Story traceability | pending / not assessable |

`NFR-031` and `NFR-032` are legacy aliases of active `NFR-005` and `NFR-008`. PRD `FR-E*` values and legacy `UC-MXX-XX` values are source aliases only.

## Active Scope

- GitHub App read-only Repository Scan is the golden technical-evidence path.
- Python Worker owns Repository Scan lifecycle.
- Python analysis is first-class and bounded; TS/JS uses a Node subprocess.
- Real LLM and embedding providers are required for A-to-Z acceptance.
- Legal corpus uses validated official-source snapshots, internal approval, immutable versioning, and hybrid FTS/pgvector retrieval.
- Manager can complete the golden path without Developer participation.
- Structured attestation is optional supplemental input under `FR-046`.
- Local/CI upload (`FR-050`), manual evidence JSON (`FR-051`), and delegated free-form clarification (`FR-052`) are Deferred.

## UX Boundary

`bmad-ux` is authorized to design:

- Manager authentication, organization, assessment, Wizard, repository, scan, evidence, reconciliation, classification, gap, document, and audit experiences;
- optional Developer invitation/task, redacted findings, and structured attestation experiences;
- all loading, empty, permission-denied, insufficient, blocked, failed, retry, rerun, degraded, and audit-reference states.

It must not design active customer-facing flows for:

- `FR-050..FR-052`;
- corpus source ingestion, review, approval, or index administration;
- production administration outside active MVP scope.

Internal Legal Operator corpus administration remains API/CLI-only for MVP. Manager UX may display assessment-relevant corpus version and citation provenance only.

## Story Dependency Carry-Forward

| FR | Required story-layer NFR dependencies |
|---|---|
| FR-053 | NFR-017, NFR-034 |
| FR-054 | NFR-017, NFR-034 |
| FR-055 | NFR-012, NFR-033 |
| FR-056 | NFR-017, NFR-033, NFR-034 |

Every story must trace to canonical UC, FR, AC, relevant NFRs, UX flow/state, domain state, implementation area, and failure/recovery behavior.

## Status

```text
ACTIVE_DOCS_PRE_UX_SYNCHRONIZED
CANONICAL_USE_CASES_NORMALIZED
CANONICAL_ACCEPTANCE_CRITERIA_NORMALIZED
LEGAL_CORPUS_UX_BOUNDARY_LOCKED
PYTHON_WORKER_CODE_MAPS_ALIGNED
SCANNER_RUNTIME_BLUEPRINT_ALIGNED
CANONICAL_UX_AUTHORIZED
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
STORY_COVERAGE_NOT_ASSESSABLE
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
```