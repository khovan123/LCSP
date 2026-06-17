# ADR-026 - Hybrid Legal Retriever

## Status

Accepted for A-to-Z Runnable MVP (Phase 5.2J)

## Decision Context

```text
PROJECT_OWNER_LOCKED (retriever required for A-to-Z acceptance)
TECHNICAL_DECISION_REQUIRED (retrieval parameters)
```

Approved as part of SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23).

## Decision

```text
HYBRID_RETRIEVER_REQUIRED_FOR_A_TO_Z_MVP
PGVECTOR_PLUS_POSTGRESQL_FTS
FAIL_CLOSED_ON_MISSING_CITATIONS
```

## Retriever Architecture

```text
LegalMatchingWorker
  → receives VerifiedProfile
  → invokes HybridLegalRetriever
      → FTS query (PostgreSQL tsvector)
      → pgvector cosine similarity query
      → metadata filters (document type, issuing authority)
      → effective-date filter (document in effect at assessment date)
      → corpus-version pinning (approved LegalCorpusVersion)
      → hybrid result ranking (weighted FTS rank + vector similarity)
  → builds LegalRuleMatch records
  → Citation Guardrail validates citations before classification
```

## Components

| Component | Responsibility | Status |
|---|---|---|
| Embedding/Index Builder | Batch embedding from approved corpus chunks; build pgvector + FTS indexes | `TECHNICAL_DECISION_REQUIRED` for parameters |
| Hybrid Legal Retriever | FTS + pgvector + metadata + effective-date + corpus-version pinning + hybrid ranking | `TECHNICAL_DECISION_REQUIRED` for weights/thresholds |
| Citation Reconstructor | Reconstruct `rule_id`, `article`, `clause`, `point`, `document_id`, `corpus_version_id` | Required |
| Retrieval Audit Logger | Query, scores, filters, result count, timestamp | Required |
| Citation Guardrail | Fail-closed: block classification if citations missing or unapproved | Retained |

## Required Retrieval Capabilities

| Capability | Requirement |
|---|---|
| Full-text search | PostgreSQL `tsvector` / `to_tsquery` on normalized article/clause/point text |
| Semantic search | pgvector cosine similarity on document chunk embeddings |
| Metadata filters | Document type, issuing authority, source hierarchy |
| Effective-date filter | Document must be in effect at assessment date |
| Corpus-version pinning | Must use approved `LegalCorpusVersion` at assessment start |
| Hybrid ranking | Weighted FTS rank + vector similarity — weights `TECHNICAL_DECISION_REQUIRED` |
| Citation reconstruction | `rule_id`, `article`, `clause`, `point`, `document_id`, `corpus_version_id` |
| Retrieval audit | Query, filters, scores, result count, corpus version ID, timestamp |
| Fail-closed | Insufficient retrieval blocks classification; does not silently degrade |

## Embedding Requirements

| Concern | Status |
|---|---|
| Embedding provider/model | `TECHNICAL_DECISION_REQUIRED` — candidates: `text-embedding-3-small` (OpenAI), `text-embedding-004` (Google) |
| Embedding dimensions | `TECHNICAL_DECISION_REQUIRED` — aligned with chosen model |
| Chunk size | `TECHNICAL_DECISION_REQUIRED` — balance retrieval precision with embedding cost |
| Index type | `TECHNICAL_DECISION_REQUIRED` — pgvector IVFFlat or HNSW; benchmark before large corpus |
| Similarity metric | Cosine similarity (default for normalized embeddings) |
| Batch embedding | Generated during Embedding/Index Builder run; not on-the-fly |

## pgvector Requirements

- PostgreSQL `pgvector` extension must be explicitly installed.
- `LegalDocumentChunk` must include embedding vector column.
- Index must be built before acceptance run.
- pgvector performance must be benchmarked at corpus scale.

## Fail-Closed Behavior

```text
Retrieval result is insufficient when:
  - No matching documents found for a required legal rule
  - Required citation fields cannot be reconstructed
  - Corpus version is not approved or is retired
  - pgvector index is unavailable

In all cases:
  → Classification is BLOCKED
  → Missing citation basis surfaced to Manager
  → Audit event recorded
  → System must not synthesize citations
```

## LegalRuleMatch Contract Extension

Each `LegalRuleMatch` record must include:

| Field | Requirement |
|---|---|
| `rule_id` | Unique rule identifier |
| `document_id` | Source legal document |
| `article` | Article number |
| `clause` | Clause identifier (if applicable) |
| `point` | Point identifier (if applicable) |
| `corpus_version_id` | Approved corpus version used |
| `retrieval_audit_id` | Reference to retrieval audit record |
| `fts_rank` | FTS rank score |
| `vector_score` | pgvector cosine similarity score |
| `hybrid_score` | Final weighted score |

## Consequences

- PostgreSQL must have pgvector extension installed before Wave D.
- Embedding build must complete before legal matching can run.
- Retrieval parameters must be benchmarked during Wave D.
- Legal corpus approval (ADR-025) must complete before Embedding/Index Builder runs on production corpus.
- A golden-path corpus fixture with embeddings must be prepared for acceptance testing.

## Non-Claims

- This ADR does not select the specific embedding provider or model.
- This ADR does not specify exact pgvector index parameters.
- The Citation Guardrail does not make legal conclusions.
