# LCSP Implementation Readiness Certification

## Purpose

Record the current planning state after the Phase 5.2L scope/runtime correction. This document does not authorize coding, sprint execution, deployment, or customer onboarding.

## Canonical Inventory

| Artifact | State |
|---|---|
| Product scope | normalized |
| Functional requirements | 56 total; Phase 5.2L changed `FR-050` to active Automatic Trusted Scan Initiation, removed `FR-051`, deferred `FR-052`, and superseded `FR-045/FR-046` attestation |
| Non-functional requirements | 33 active |
| Acceptance criteria | AC-001..AC-041 plus AC-050A..AC-050F |
| Use cases | UC-001..UC-017 active; UC-018 superseded for active MVP |
| Domain and implementation-area traceability | remediation in progress |
| Canonical UX | draft created; frozen pending document consolidation and rebase |
| Canonical epics/stories | missing |
| Story traceability | not assessable |

## Active Decisions

- PBAC is the authorization source of truth; RBAC/roles are attributes/templates only.
- Python Worker Platform owns all asynchronous domain workloads.
- Python Scanner Worker solely owns Repository Scan lifecycle.
- Scanner uses Syft, Knip, deptry, Poetry, stdlib `ast`, `libcst`, Semgrep custom rules and tree-sitter/custom parser.
- TS/JS analysis uses a fixed Node.js `ts-morph` subprocess with versioned JSON stdio.
- Real configured LLM provider is required for integrated A-to-Z acceptance; mock mode is test/offline-only.
- Legal corpus uses validated official-source snapshots, internal approval, immutable versions, and S3-compatible storage.
- Retrieval uses ChromaDB structure-first vectorless legal index with metadata/full-text retrieval, direct lookup, xref expansion, parent-context assembly and citation allowlist validation.
- PostgreSQL pgvector legal retrieval is `SUPERSEDED_FOR_ACTIVE_MVP`.
- Internal corpus operations are API/CLI-only for MVP and outside Manager/Developer product UX.
- Manager can complete the golden path without Developer participation.
- Structured Developer attestation is `SUPERSEDED_FOR_ACTIVE_MVP`; delegated free-form clarification is Deferred/Post-MVP.
- `FR-050` is Automatic Trusted Scan Initiation; `FR-051` manual evidence JSON is `REMOVED_FROM_PRODUCT`.

## Pre-UX Closure Assessment

| Area | Status |
|---|---|
| Product scope and actors | PHASE_5_2L_REMEDIATED_FOR_RECHECK |
| Canonical use cases | READY_FOR_UX |
| User task flows | READY_FOR_UX |
| FR/NFR semantics | NORMALIZED |
| Acceptance criteria | NORMALIZED |
| Domain model | NORMALIZED |
| Architecture and ADRs | CHROMADB_VECTORLESS_RENAME_AND_SYNC_APPLIED |
| Scanner runtime documents | SCANNER_BEHAVIOR_AUTHORITY_CONSOLIDATED |
| Legal ingestion and retrieval documents | CHROMADB_VECTORLESS_DOMAIN_CONTRACT_ALIGNED |
| Documentation indexes | CONSOLIDATION_MARKERS_REFRESHED |
| Canonical UX | DRAFT_CREATED_REBASE_PENDING |
| Epics/stories | MISSING |
| Story traceability | NOT_ASSESSABLE |

## Authorized Next Sequence

```text
1. Rebase the UX draft against consolidated scanner/legal/domain authority.
2. Review and approve the canonical UX draft artifact.
3. Run bmad-create-epics-and-stories after UX approval.
4. Rebuild story-level FR/NFR/AC/UX traceability.
5. Run bmad-check-implementation-readiness in a fresh context.
6. Start sprint planning and coding only after readiness approval.
```

## Result

```text
CONSOLIDATION_PASS_APPLIED
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
SCANNER_BEHAVIOR_AUTHORITY_CONSOLIDATED
CHROMADB_VECTORLESS_DOMAIN_CONTRACT_ALIGNED
UX_DRAFT_CREATED
PYTHON_WORKER_PACKAGE_TOPOLOGY_LOCKED
AUDIT_EXPORT_SYNC_API_BOUNDARY_LOCKED
UX_DRAFT_REBASE_PENDING
CHROMADB_STRUCTURE_FIRST_VECTORLESS_LEGAL_RAG_APPROVED
POSTGRESQL_PGVECTOR_LEGAL_RETRIEVAL_SUPERSEDED
STORY_TRACEABILITY_PENDING
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```

## Explicit Non-Claims

- Not production ready.
- Not implementation evidence.
- Not scanner accuracy acceptance.
- Not authorization for deployment.
