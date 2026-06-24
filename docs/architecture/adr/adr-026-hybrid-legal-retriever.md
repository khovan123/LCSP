# ADR-026 — Hybrid Legal Retriever

## Status

Accepted baseline for pre-UX planning; Phase 5.2L approval condition requires technical clarification before epics/stories are marked ready or implementation readiness is certified.

## Decision Context

```text
PROJECT_OWNER_LOCKED
HYBRID_RETRIEVER_REQUIRED_FOR_A_TO_Z_MVP
RETRIEVAL_PROFILE_BASELINE_FOR_UX
RAG_RETRIEVAL_APPROVAL_CONDITION_AMBIGUOUS
TECHNICAL_DECISION_REQUIRED_BEFORE_STORIES_OR_IMPLEMENTATION_READINESS
```

## Decision

LCSP uses PostgreSQL Full-Text Search plus pgvector semantic similarity, constrained by approved corpus version, source validation, effective dates, metadata filters, citation reconstruction, and fail-closed behavior.

```text
PGVECTOR_PLUS_POSTGRESQL_FTS
VIETNAMESE_SIMPLE_PLUS_UNACCENT
HNSW_COSINE_VECTOR_INDEX
FTS_WEIGHT_0_4
VECTOR_WEIGHT_0_6
FAIL_CLOSED_ON_MISSING_CITATIONS
```

The Project Owner approval condition `Update rag: chorma database (vector less)` is ambiguous. This ADR does not adopt ChromaDB or vectorless retrieval. Until the condition is clarified by Project Owner and technical owner decision, PostgreSQL FTS + pgvector remains the active baseline for UX and documentation planning only.

## Architecture

```text
VerifiedProfile
-> LegalMatchingWorker
-> HybridLegalRetriever
   -> sanitized structured query facets
   -> PostgreSQL FTS (`simple` + `unaccent`)
   -> pgvector cosine similarity
   -> approved corpus filter
   -> validated source filter
   -> effective-date filter
   -> metadata filter
   -> weighted ranking
   -> citation reconstruction
   -> RetrievalAuditLog
-> LegalRuleMatch
-> Citation Guardrail
-> Classification
```

## Locked Retrieval Profile

| Concern | MVP Value |
|---|---|
| Vector type | `vector(1536)` |
| Similarity | cosine |
| Index | HNSW, `m=16`, `ef_construction=64` |
| FTS dictionary | PostgreSQL `simple` |
| Vietnamese normalization | `unaccent` over normalized legal text |
| Score | `0.4 * normalizedFtsRank + 0.6 * vectorSimilarity` |
| Candidate limit | configurable, default 20 |
| Final result limit | configurable, default 8 |
| Embedding timing | batch index build after corpus approval |
| Corpus status | `APPROVED` only |
| Source status | validated only |

The acceptance environment must configure an embedding model that emits 1536-dimensional vectors. Provider/model and credential references are deployment configuration and must be recorded in ModelRunMetadata; mock embeddings do not qualify for the A-to-Z acceptance run.

## Required Filters

Every query applies:

- corpus version pinned to the assessment;
- `LegalCorpusVersion.status = APPROVED`;
- source validation status;
- effective start/end date at assessment date;
- document type/issuing authority/source tier when supplied;
- supersession relationships within the pinned corpus;
- citation-field completeness.

## Citation Contract

Every material result reconstructs:

- rule ID;
- document ID, number, title, type, issuer;
- article, clause, point, appendix path where applicable;
- source URL and authority;
- retrieved-at timestamp and content hash;
- corpus version ID;
- effective date interval;
- chunk ID/content hash;
- FTS rank, vector score, hybrid score;
- retrieval audit ID.

A result without reconstructable citation fields cannot support a material LegalRuleMatch.

## Privacy Decision

The retriever receives structured, sanitized legal-query facets derived from VerifiedProfile/AIUsageFlow. It must not receive or log raw repository source, secrets, full prompts, arbitrary customer free text, or unredacted logs.

RetrievalAuditLog stores sanitized terms/facets, query hash, filters, result refs/scores, corpus version, correlation ID, and timestamp. It does not store arbitrary raw query text.

## Fail-Closed Behavior

Classification is blocked or explicitly degraded according to rule criticality when:

- required corpus is not approved;
- required source is unvalidated/unavailable;
- FTS or vector index is unavailable;
- embedding dimension/model metadata is invalid;
- no candidate can support a required rule;
- required citation fields cannot be reconstructed;
- effective-date/corpus-version filters exclude the basis.

The system never synthesizes a citation.

## Index Build

```text
approved corpus
-> normalize Vietnamese text
-> build `simple` + `unaccent` FTS vector/GIN index
-> batch-generate 1536-dimension embeddings
-> verify model/version/content hash
-> build HNSW index
-> publish index-completed event
```

Embedding/index failures leave the corpus version approved but unavailable for retrieval until the index build succeeds.

## Consequences

- PostgreSQL requires `vector` and `unaccent` extensions.
- LegalDocumentChunk stores FTS and vector index data plus model/content metadata.
- Embedding cost/token usage is governed by `NFR-033`.
- Corpus immutability and approval are governed by `NFR-034`.
- Legal citation/version traceability is governed by `NFR-017`.
- Retrieval parameter changes require a new recorded index profile and rebuild; they must not silently alter historical assessment reproducibility.

## Non-Claims

- Retrieval does not make legal conclusions.
- Corpus approval is not legal certification.
- The locked MVP profile is a bounded acceptance profile, not a claim of optimal production ranking.
- Production-scale benchmarking and adaptive weighting remain Post-MVP.
