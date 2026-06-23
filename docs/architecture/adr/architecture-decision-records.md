# LCSP Architecture Decision Records

## Purpose

This document is the active ADR authority index for the A-to-Z runnable MVP. Detailed decisions live in individual ADR files. Historical reasoning remains in git history and `docs/archive/`, but archived material is not active implementation or UX authority.

## Current Architecture Direction

```text
Modular NestJS API
+ standalone Python Scanner Worker
+ Node.js downstream workers
+ PostgreSQL/Prisma/pgvector
+ RabbitMQ/outbox
+ S3-compatible object storage
+ real LLM/embedding providers for A-to-Z acceptance
```

The system uses deterministic orchestration, state machines, evidence gates, and bounded workers. It does not use free-form autonomous agents to bypass domain rules.

## Status Legend

| Status | Meaning |
|---|---|
| Accepted | Active MVP constraint |
| Accepted — Superseding | Active decision that replaces part/all of an earlier ADR |
| Partially Superseded | Retained only for portions not replaced by a newer ADR |
| Deferred | Not active MVP authority |
| Historical | Evidence only; not implementation authority |

## Authority and Supersession Rules

1. Newer explicit supersession notes override older conflicting wording.
2. ADR-023 overrides TypeScript-first scanner lifecycle ownership in ADR-002/ADR-022.
3. ADR-024 overrides mock-LLM-as-default happy-path wording.
4. ADR-025 overrides local JSONL corpus seed as the legal source architecture.
5. ADR-026 overrides non-hybrid/unspecified legal retrieval for MVP.
6. Product scope and canonical requirements remain governed by PRD, FR/NFR catalogs, and approved change-control records.
7. `FR-050..FR-052` remain Deferred even if older ADR text describes those paths.

## Active Decision Summary

| ADR | Active Decision | Status |
|---|---|---|
| ADR-001 | Modular monolith-first API boundary with extractable modules | Accepted |
| ADR-002 | Async worker workloads remain outside synchronous API lifecycle | Partially Superseded: scanner runtime wording replaced by ADR-023; downstream async separation retained |
| ADR-003 | Manager-led workflow; Developer optional and scoped | Accepted |
| ADR-004 | Evidence-first classification gate | Accepted |
| ADR-005 | GitHub App Repository Scan is the only active MVP evidence path; Local/CI/manual uploads deferred | Accepted |
| ADR-006 | No raw source to LLM and no long-term raw source persistence | Accepted |
| ADR-007 | Binary unresolved-conflict routing; scores are explanatory only | Accepted |
| ADR-008 | Structured technical attestation is supplemental only and cannot unlock classification | Accepted with FR-046 boundary; free-form delegated clarification remains Deferred under FR-052 |
| ADR-009 | Deterministic orchestration and state-machine-controlled worker chaining | Accepted |
| ADR-010 | GitHub App read-only repository evidence path | Accepted |
| ADR-011..ADR-021 | Existing active technical/security/queue/evidence decisions | Retained unless explicitly superseded below |
| ADR-022 | TypeScript-first non-scanner stack and prototype boundaries | Partially Superseded: scanner lifecycle portion replaced by ADR-023 |
| ADR-023 | Python Worker owns Repository Scan; Poetry, `ast` + `libcst`, Node subprocess for TS/JS | Accepted — Superseding |
| ADR-024 | Real configured LLM provider mandatory for A-to-Z acceptance; mock test/offline only | Accepted — Superseding |
| ADR-025 | Provenance-preserving official-source legal corpus with internal approval and immutable versioning | Accepted — Superseding |
| ADR-026 | PostgreSQL `simple` + `unaccent` FTS and pgvector HNSW hybrid retrieval with fail-closed citations | Accepted |

## Clarified ADR-002 Runtime Boundary

The active decision is:

```text
NestJS API handles synchronous HTTP, RBAC, job creation, and query surfaces.
Python Worker solely owns Repository Scan lifecycle.
Node.js worker runtime owns downstream TechnicalProfile, AIUsageFlow,
Reconciliation, legal, classification, gap, and document jobs.
```

Any older statement that the controlled MVP scanner worker is TypeScript-first is historical and superseded.

## Clarified ADR-003 / ADR-008 Collaboration Boundary

- Manager is required and sufficient for the active MVP golden path.
- Developer is optional and limited by task/policy.
- Active Developer input is structured attestation under `FR-046`.
- Attestation is stored separately, is auditable, and may support Manager review.
- Attestation cannot replace scanner metadata, resolve conflict, approve VerifiedProfile, or unlock classification by itself.
- Delegated free-form technical clarification under `FR-052` is Deferred and must not become an active UX route.

## Legal Operations UX Boundary

ADR-025 corpus source validation, review, approval, and index-build actions are performed by an Internal Legal Operator through internal API/CLI for MVP. They are not Manager/Developer customer-facing UX scope. A dedicated legal-operations web console requires a future scope decision.

## Locked Technical Profiles

### Scanner

```text
Python 3.11+
Poetry / pyproject.toml
ast + libcst
Python-native scan-local graph
Node ts-morph subprocess with JSON stdio
metadata-only PostgreSQL persistence
cleanup-verified terminal event
```

### LLM

```text
provider mode required for integrated/A-to-Z acceptance
mock mode limited to unit tests, offline CI, credential-unavailable component development
sanitized structured inputs only
schema validation + timeout/retry + audit + budget controls
```

### Legal Retrieval

```text
validated official-source snapshots
approved immutable LegalCorpusVersion
PostgreSQL simple + unaccent FTS
pgvector vector(1536) HNSW cosine index
0.4 FTS + 0.6 vector score
corpus/effective-date/source/metadata filters
citation reconstruction and retrieval audit
```

## Non-Claims

- This index does not authorize implementation or production deployment.
- It does not certify legal reliability or compliance.
- It does not replace individual ADR detail where no conflict exists.
- Current planning status remains UX pending and story traceability pending.