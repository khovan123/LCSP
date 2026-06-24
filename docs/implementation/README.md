# LCSP Implementation Documents

## Purpose

Active BUILD layer for the A-to-Z runnable MVP. These documents describe how the planned system will be built, configured, and verified after implementation readiness is certified.

## Current Authority Boundary

```text
CONSOLIDATION_PASS_APPLIED
SCANNER_BEHAVIOR_AUTHORITY_CONSOLIDATED
CHROMADB_VECTORLESS_DOMAIN_CONTRACT_ALIGNED
UX_DRAFT_CREATED
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_NOT_AUTHORIZED
```

Implementation documents are build specifications, not evidence that application code exists.

## Active Documents

| File | Purpose |
|---|---|
| `backend-implementation.md` | NestJS API, auth, PBAC, GitHub App, automatic trusted scan initiation, orchestration, audit, and local backend behavior |
| `persistence-implementation.md` | PostgreSQL/Prisma metadata, ChromaDB legal index references, object metadata, retention, and migration order |
| `queue-implementation.md` | RabbitMQ topology, outbox, retry, idempotency, and worker choreography |
| `scanner-implementation.md` | Cross-runtime scanner build boundary and package structure |
| `python-worker-platform-implementation.md` | Shared Python Worker Platform runtime, queue, idempotency, audit, lifecycle and observability contracts |
| `scanner-worker-implementation.md` | Scanner worker toolchain, scan lifecycle, and TS/JS subprocess integration |
| `legal-corpus-ingestion-implementation.md` | Official-source ingestion, snapshot/hash provenance, normalization, and approval handoff |
| `chromadb-vectorless-legal-retriever-implementation.md` | ChromaDB vectorless legal retrieval, hierarchy/xref assembly, citation allowlist, privacy, and retrieval audit |
| `llm-gateway-implementation.md` | Real provider boundary, privacy, schema validation, retries, budget controls, and model-run metadata |

## Read Order by Workstream

### Scanner

1. `../specs/scanner-spec.md`
2. `../developer-execution-blueprints/scanner-data-journey.md`
3. `scanner-implementation.md`
4. `scanner-worker-implementation.md`
5. `python-worker-platform-implementation.md`
6. `persistence-implementation.md`
7. `queue-implementation.md`

### Legal Corpus and Retrieval

1. `../specs/legal-corpus-source-spec.md`
2. `../specs/legal-matching-domain-spec.md`
3. `legal-corpus-ingestion-implementation.md`
4. `chromadb-vectorless-legal-retriever-implementation.md`
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
- Python Worker Platform owns all asynchronous domain workloads.
- Scanner uses Syft, Knip, deptry, `ast` + `libcst`, Semgrep custom rules, tree-sitter/custom parser and Poetry.
- TS/JS analysis uses a fixed Node subprocess with JSON stdio.
- Real configured LLM provider is mandatory for A-to-Z acceptance; embedding provider is not required for legal retrieval MVP.
- Mock LLM is tests/offline development only.
- Legal corpus uses validated official-source snapshots, approval gate, immutable versioning, ChromaDB vectorless retrieval, legal hierarchy/xref assembly, and citation allowlist validation.
- Real S3-compatible object storage is required for A-to-Z acceptance.

## Internal Operations Boundary

Legal source validation, corpus review/approval, and index build are internal API/CLI operations for MVP. They are not Manager/Developer product UX screens.

## Non-Claims

- Not production deployment authorization.
- Not completed implementation readiness.
- Not legal validation or compliance certification.
- Not proof that code, tests, CI/CD, or infrastructure exist.
