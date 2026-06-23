# LCSP Implementation Documents

## Purpose

Active BUILD layer for the A-to-Z runnable MVP. These documents describe how the planned system will be built, configured, and verified after implementation readiness is certified.

## Current Authority Boundary

```text
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_NOT_AUTHORIZED
```

Implementation documents are build specifications, not evidence that application code exists.

## Active Documents

| File | Purpose |
|---|---|
| `backend-implementation.md` | NestJS API, auth, RBAC, GitHub App, orchestration, audit, and local backend behavior |
| `persistence-implementation.md` | PostgreSQL/Prisma/pgvector models, object metadata, retention, and migration order |
| `queue-implementation.md` | RabbitMQ topology, outbox, retry, idempotency, and worker choreography |
| `scanner-implementation.md` | Cross-runtime scanner build boundary and package structure |
| `python-worker-implementation.md` | Standalone Python Worker process, AST/CST stack, scan lifecycle, and TS/JS subprocess integration |
| `legal-corpus-ingestion-implementation.md` | Official-source ingestion, snapshot/hash provenance, normalization, and approval handoff |
| `hybrid-retriever-implementation.md` | Vietnamese FTS + pgvector indexing, hybrid ranking, filters, citation reconstruction, privacy, and retrieval audit |
| `llm-gateway-implementation.md` | Real provider boundary, privacy, schema validation, retries, budget controls, and model-run metadata |

## Read Order by Workstream

### Scanner

1. `../specs/scanner-spec.md`
2. `../specs/python-scanner-spec.md`
3. `../developer-execution-blueprints/scanner-data-journey.md`
4. `scanner-implementation.md`
5. `python-worker-implementation.md`
6. `persistence-implementation.md`
7. `queue-implementation.md`

### Legal Corpus and Retrieval

1. `../specs/legal-corpus-source-spec.md`
2. `../specs/legal-matching-domain-spec.md`
3. `legal-corpus-ingestion-implementation.md`
4. `hybrid-retriever-implementation.md`
5. `persistence-implementation.md`
6. `queue-implementation.md`

### LLM and Reporting

1. `llm-gateway-implementation.md`
2. `../specs/legal-classification-spec.md`
3. `../specs/document-generation-spec.md`
4. `backend-implementation.md`
5. `persistence-implementation.md`
6. `queue-implementation.md`

## Locked MVP Runtime Decisions

- Python Worker is the sole Repository Scan lifecycle owner.
- Python uses `ast` + `libcst` and Poetry.
- TS/JS analysis uses a fixed Node subprocess with JSON stdio.
- Real configured LLM and embedding providers are mandatory for A-to-Z acceptance.
- Mock LLM is tests/offline development only.
- Legal corpus uses validated official-source snapshots, approval gate, immutable versioning, PostgreSQL FTS + pgvector, and citation reconstruction.
- Vietnamese FTS uses `simple` + `unaccent`, not the English dictionary.
- Real S3-compatible object storage is required for A-to-Z acceptance.

## Internal Operations Boundary

Legal source validation, corpus review/approval, and index build are internal API/CLI operations for MVP. They are not Manager/Developer product UX screens.

## Non-Claims

- Not production deployment authorization.
- Not completed implementation readiness.
- Not legal validation or compliance certification.
- Not proof that code, tests, CI/CD, or infrastructure exist.