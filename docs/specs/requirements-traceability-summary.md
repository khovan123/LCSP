# LCSP Requirements Traceability Summary

## Purpose

Summarize canonical requirement and planning traceability after Phase 5.2L active-document correction. This document does not certify implementation readiness or story coverage.

## Canonical Inventory

| Item | Count / Status |
|---|---|
| Canonical FR total | 56 |
| Active MVP FR total | Phase 5.2L active set includes `FR-050` Automatic Trusted Scan Initiation and excludes superseded/removed attestation/manual JSON requirements |
| Removed / superseded FRs | `FR-045`, `FR-046` structured attestation superseded; `FR-051` removed |
| Deferred FR total | `FR-052` delegated clarification remains deferred |
| Active NFR total | 33 (`NFR-001..NFR-030`, `NFR-033..NFR-035`) |
| AC total | `AC-001..AC-041` plus `AC-050A..AC-050F` |
| Canonical use cases | `UC-001..UC-017`; `UC-018` structured attestation superseded |
| Canonical UX | authorized and pending creation |
| Canonical epics/stories | missing |
| Story traceability | pending / not assessable |

`NFR-031` and `NFR-032` are legacy aliases of active `NFR-005` and `NFR-008`. PRD `FR-E*` values and legacy `UC-MXX-XX` values are source aliases only.

## Active Scope

- PBAC is the authorization source of truth; roles are attributes/templates only.
- GitHub App read-only Repository Scan is the golden technical-evidence path.
- `FR-050` automatically creates or resumes scan workflows from trusted integration context.
- Python Worker Platform owns all asynchronous domain workloads.
- Scanner analysis uses Syft, Knip, deptry, Python `ast`/`libcst`, Semgrep custom rules, tree-sitter/custom parser, and bounded `ts-morph`.
- Real LLM and embedding providers are required for A-to-Z acceptance.
- Legal corpus uses validated official-source snapshots, internal approval, immutable versioning, and hybrid FTS/pgvector retrieval.
- Manager can complete the golden path without Developer participation.
- Structured attestation is `SUPERSEDED_FOR_ACTIVE_MVP`.
- Local/CI scanner report upload is superseded by `FR-050`.
- Manual evidence JSON (`FR-051`) is `REMOVED_FROM_PRODUCT`.
- Delegated free-form clarification (`FR-052`) is Deferred/Post-MVP.

## UX Boundary

`bmad-ux` is authorized to design:

- Manager authentication, organization, assessment, Wizard, repository, scan, evidence, reconciliation, classification, gap, document, and audit experiences;
- optional Developer invitation/task and redacted findings experiences without structured attestation;
- all loading, empty, permission-denied, insufficient, blocked, failed, retry, rerun, degraded, and audit-reference states.

It must not design active customer-facing flows for:

- manual scanner report upload, `FR-051`, `FR-052`, and structured attestation;
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
PHASE_5_2L_ACTIVE_DOCS_SYNCHRONIZED
CANONICAL_USE_CASES_NORMALIZED
CANONICAL_ACCEPTANCE_CRITERIA_NORMALIZED
LEGAL_CORPUS_UX_BOUNDARY_LOCKED
PYTHON_WORKER_CODE_MAPS_ALIGNED
SCANNER_RUNTIME_BLUEPRINT_ALIGNED
PBAC_AUTHORIZATION_MODEL_ALIGNED
FR_050_AUTOMATIC_TRUSTED_SCAN_INITIATION_TRACED
FR_051_REMOVED_FROM_PRODUCT
STRUCTURED_ATTESTATION_SUPERSEDED_FOR_ACTIVE_MVP
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
READY_FOR_CANONICAL_UX
CANONICAL_UX_PENDING
RAG_RETRIEVAL_CONDITION_TECHNICAL_DECISION_REQUIRED_BEFORE_STORIES
STORY_TRACEABILITY_PENDING
STORY_COVERAGE_NOT_ASSESSABLE
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
```
