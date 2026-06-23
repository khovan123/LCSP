# LCSP Implementation Readiness Certification

## Purpose

Record the current planning state after the A-to-Z MVP scope remediation and pre-UX active-document closure. This document does not authorize coding, sprint execution, deployment, or customer onboarding.

## Canonical Inventory

| Artifact | State |
|---|---|
| Product scope | normalized |
| Functional requirements | 56 total; 53 active; FR-050..FR-052 Deferred |
| Non-functional requirements | 33 active |
| Acceptance criteria | 41 canonical rows |
| Use cases | UC-001..UC-018 canonical |
| Domain and implementation-area traceability | normalized |
| Canonical UX | pending |
| Canonical epics/stories | missing |
| Story traceability | not assessable |

## Active Decisions

- Python Worker solely owns Repository Scan lifecycle.
- Python uses Poetry, stdlib `ast`, and `libcst`.
- TS/JS analysis uses a fixed Node.js `ts-morph` subprocess with versioned JSON stdio.
- Real configured LLM and embedding providers are required for integrated A-to-Z acceptance; mock mode is test/offline-only.
- Legal corpus uses validated official-source snapshots, internal approval, immutable versions, and S3-compatible storage.
- Retrieval uses PostgreSQL `simple` plus `unaccent` FTS and pgvector `vector(1536)` HNSW cosine search.
- Internal corpus operations are API/CLI-only for MVP and outside Manager/Developer product UX.
- Manager can complete the golden path without Developer participation.
- Structured Developer attestation is optional supplemental input; delegated free-form clarification is Deferred.

## Pre-UX Closure Assessment

| Area | Status |
|---|---|
| Product scope and actors | READY_FOR_UX |
| Canonical use cases | READY_FOR_UX |
| User task flows | READY_FOR_UX |
| FR/NFR semantics | NORMALIZED |
| Acceptance criteria | NORMALIZED |
| Domain model | NORMALIZED |
| Architecture and ADRs | NORMALIZED |
| Scanner runtime documents | NORMALIZED |
| Legal ingestion and retrieval documents | NORMALIZED |
| Documentation indexes | NORMALIZED |
| Canonical UX | PENDING |
| Epics/stories | MISSING |
| Story traceability | NOT_ASSESSABLE |

## Authorized Next Sequence

```text
1. Run bmad-ux in a fresh context.
2. Review and approve the canonical UX artifact.
3. Run bmad-create-epics-and-stories.
4. Rebuild story-level FR/NFR/AC/UX traceability.
5. Run bmad-check-implementation-readiness in a fresh context.
6. Start sprint planning and coding only after readiness approval.
```

## Result

```text
ACTIVE_DOCS_PRE_UX_SYNCHRONIZED
CANONICAL_UX_AUTHORIZED
CANONICAL_UX_PENDING
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