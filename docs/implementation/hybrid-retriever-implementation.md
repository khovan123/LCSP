# Hybrid Retriever Implementation Specification

## Status

AUTHORITATIVE — A-to-Z Runnable MVP

## Purpose

Define PostgreSQL FTS + pgvector indexing, hybrid ranking, effective-date/corpus filters, citation reconstruction, privacy, and retrieval auditing for legal matching.

## Active References

- `docs/architecture/adr/adr-026-hybrid-legal-retriever.md`
- `docs/specs/legal-matching-domain-spec.md`
- `docs/specs/legal-corpus-source-spec.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`

## Locked MVP Retrieval Profile

| Concern | Value |
|---|---|
| Vector column | `vector(1536)` |
| Similarity | cosine distance (`<=>`) |
| Vector index | HNSW, `m=16`, `ef_construction=64` |
| FTS configuration | PostgreSQL `simple` dictionary over normalized Vietnamese text |
| Diacritic support | `unaccent` applied to indexed and query text |
| Hybrid weights | FTS `0.4`, vector similarity `0.6` |
| Candidate limit | configurable, default 20 before citation/metadata rerank |
| Final result limit | configurable, default 8 |
| Corpus | approved immutable version pinned to assessment |
| Embedding generation | batch build only; never on demand in legal matching |

The configured embedding model for the MVP acceptance environment must emit 1536-dimensional vectors. Provider/model name and credential reference are environment configuration and are recorded in `ModelRunMetadata`.

## PostgreSQL Extensions and Indexes

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE "LegalDocumentChunk"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

UPDATE "LegalDocumentChunk"
SET "searchVector" = to_tsvector('simple', unaccent(coalesce(content, '')));

CREATE INDEX IF NOT EXISTS legal_chunk_fts_idx
ON "LegalDocumentChunk"
USING gin ("searchVector");

CREATE INDEX IF NOT EXISTS legal_chunk_hnsw_idx
ON "LegalDocumentChunk"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

Do not use the PostgreSQL `english` dictionary for Vietnamese legal content. Embeddings are written only for chunks in an approved LegalCorpusVersion, with content hash and embedding model/version metadata.

## Hybrid Ranking

```text
hybridScore =
  0.4 * normalizedFtsRank
  + 0.6 * vectorSimilarity
```

Vector similarity is `1 - cosine_distance`. Scores are normalized to `[0,1]` before combination.

Every query applies:

1. approved corpus version pinned to the assessment;
2. effective-date interval at assessment date;
3. validated source status;
4. optional document type, issuing authority, and source-tier filters;
5. supersession relationships inside the pinned corpus;
6. citation reconstruction completeness.

Example shape:

```sql
WITH candidates AS (
  SELECT
    c.id,
    item."corpusVersionId",
    doc.id AS "documentId",
    ts_rank_cd(
      c."searchVector",
      plainto_tsquery('simple', unaccent(:queryText))
    ) AS fts_rank,
    1 - (c.embedding <=> :queryEmbedding::vector) AS vector_similarity
  FROM "LegalDocumentChunk" c
  JOIN "LegalCorpusItem" item ON c."corpusItemId" = item.id
  JOIN "LegalDocument" doc ON item."documentId" = doc.id
  JOIN "LegalCorpusVersion" corpus ON item."corpusVersionId" = corpus.id
  JOIN "LegalSource" source ON doc."sourceId" = source.id
  WHERE item."corpusVersionId" = :corpusVersionId
    AND corpus.status = 'APPROVED'
    AND source."validationStatus" = 'VALIDATED'
    AND doc."effectiveStartDate" <= :assessmentDate
    AND (doc."effectiveEndDate" IS NULL OR doc."effectiveEndDate" >= :assessmentDate)
)
SELECT *,
  (0.4 * fts_rank) + (0.6 * vector_similarity) AS hybrid_score
FROM candidates
ORDER BY hybrid_score DESC
LIMIT :candidateLimit;
```

## Citation Reconstruction

Each material result reconstructs:

- legal document ID, type, number, title, and issuer;
- article, clause, point, and appendix path where applicable;
- source URL and authority;
- retrieved-at timestamp and content hash;
- corpus version ID;
- effective date interval;
- chunk ID and normalized content hash;
- FTS rank, vector similarity, hybrid score;
- retrieval audit ID.

A candidate without reconstructable citation fields is ineligible for a material LegalRuleMatch.

## Retrieval Privacy

Retriever queries are derived from structured VerifiedProfile/AIUsageFlow labels and exclude raw repository source, credentials, full prompts, unnecessary personal free text, and unredacted logs.

`RetrievalAuditLog` stores sanitized query terms/facets, query hash, corpus/date/metadata filters, matched IDs, scores, result count, correlation ID, and timestamp. It does not store arbitrary raw query text that may contain customer-sensitive content.

## Canonical Index Build Workflow

```text
LegalCorpusVersion APPROVED
-> command.embedding-build.requested.v1
-> load approved chunks
-> normalize and unaccent text
-> compute FTS vectors
-> batch embedding through configured gateway/provider
-> verify dimension, content hash, and model metadata
-> write index data and ModelRunMetadata
-> event.embedding-build.completed.v1
```

Failure publishes `event.embedding-build.failed.v1`, leaves the corpus unavailable for legal matching, and exposes an actionable audited state.

## Failure Behavior

| Condition | Behavior |
|---|---|
| Corpus not approved | block retrieval |
| Source not validated | exclude source and block if required basis is unavailable |
| Embedding missing or dimension mismatch | fail index build; do not silently run vector query |
| pgvector/HNSW unavailable | block required hybrid retrieval |
| FTS unavailable | block required hybrid retrieval |
| Zero candidates | do not claim applicability; block/degrade classification by rule criticality |
| Citation cannot be reconstructed | reject candidate |
| Effective date mismatch | exclude candidate |
| Budget or credential failure during index build | fail explicitly; keep approved corpus but mark index unavailable |

## Audit and Cost Controls

- Record embedding provider/model, vector dimension, usage/cost metadata, corpus version, and content hashes.
- Enforce monthly embedding budget and per-run caps under `NFR-033`.
- Record only sanitized query metadata and result references.
- Reproduce retrieval from corpus version, index profile, query hash, filters, and model version.

## Acceptance

- Vietnamese search uses `simple` + `unaccent`, not English stemming.
- Hybrid retrieval uses approved corpus, date, source, and metadata filters.
- Results reconstruct article/clause/point-level citations.
- Raw source and sensitive customer text are absent from retrieval/audit payloads.
- Missing index or citation fails closed.
- `FR-053`, `FR-054`, and `FR-056` retain canonical `NFR-017`, `NFR-033`, and `NFR-034` dependencies.