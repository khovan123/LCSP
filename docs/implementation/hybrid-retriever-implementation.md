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
| Diacritic support | `unaccent` extension applied to indexed/query text |
| Hybrid weights | FTS `0.4`, vector similarity `0.6` |
| Candidate limit | configurable; default 20 before citation/metadata rerank |
| Final result limit | configurable; default 8 |
| Corpus | approved immutable version pinned to assessment |
| Embedding generation | batch build only; never on-demand inside legal matching request |

The configured embedding model for the MVP acceptance environment must emit 1536-dimensional vectors. Provider/model name and credential reference remain environment configuration and must be recorded in `ModelRunMetadata`.

## PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

## Vector Index

```sql
CREATE INDEX IF NOT EXISTS legal_chunk_hnsw_idx
ON "LegalDocumentChunk"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

`embedding` is populated only for chunks belonging to an approved LegalCorpusVersion. Embedding model/version and content hash are recorded so changed content cannot silently reuse old vectors.

## Vietnamese Full-Text Index

Add a generated or maintained search vector derived from normalized legal text:

```sql
ALTER TABLE "LegalDocumentChunk"
ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

UPDATE "LegalDocumentChunk"
SET "searchVector" = to_tsvector('simple', unaccent(coalesce(content, '')));

CREATE INDEX IF NOT EXISTS legal_chunk_fts_idx
ON "LegalDocumentChunk"
USING gin ("searchVector");
```

Application writes/updates `searchVector` during index build. Do not use the PostgreSQL `english` dictionary for Vietnamese legal content.

## Hybrid Query

```text
hybridScore =
  0.4 * normalizedFtsRank
  + 0.6 * vectorSimilarity
```

Vector similarity is `1 - cosine_distance`. Scores are normalized to `[0,1]` before combination.

Every query applies:

1. approved `corpusVersionId` pinned to the assessment;
2. document effective-date interval at the assessment date;
3. source validation status;
4. optional document type, issuing authority, and source-tier filters;
5. non-superseded document relation for the pinned version;
6. citation reconstruction requirements.

Example query shape:

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

Each returned result must reconstruct:

- legal document ID, type, number, title, issuer;
- article, clause, point, appendix path where applicable;
- source URL and source authority;
- retrieved-at timestamp and content hash;
- legal corpus version ID;
- effective date interval;
- chunk ID and normalized content hash;
- FTS rank, vector similarity, and hybrid score;
- retrieval audit ID.

A candidate without reconstructable citation fields is ineligible for a material LegalRuleMatch.

## Retrieval Privacy

Retriever queries are derived from VerifiedProfile/AIUsageFlow structured labels and must exclude:

- raw repository source;
- secrets and credentials;
- full prompts;
- personal free text not needed for legal retrieval;
- unredacted audit/log payloads.

`RetrievalAuditLog` stores:

- sanitized normalized query terms or structured query facets;
- query hash;
- corpus/effective-date/metadata filters;
- matched chunk/document IDs;
- FTS/vector/hybrid scores;
- result count;
- correlation ID and timestamp.

Do not store arbitrary raw `queryText` that may contain customer-sensitive content.

## Index Build Workflow

```text
LegalCorpusVersion APPROVED
-> command.legal-corpus.index-requested.v1
-> load approved chunks
-> normalize/unaccent text
-> compute FTS vector
-> batch embedding through configured gateway/provider
-> verify dimension/content hash/model metadata
-> write index data and ModelRunMetadata
-> event.legal-corpus.index-completed.v1
```

Index build failure leaves the corpus unavailable for legal matching and produces an actionable audited state.

## Failure Behavior

| Condition | Behavior |
|---|---|
| Corpus not approved | block retrieval |
| Source not validated | exclude source; block if required basis unavailable |
| Embedding missing/dimension mismatch | fail index build; do not silently run vector query |
| HNSW/pgvector unavailable | block required hybrid retrieval |
| FTS unavailable | block required hybrid retrieval |
| Zero candidates | no applicable match claim; classification blocked/degraded according to rule requirement |
| Citation cannot be reconstructed | candidate rejected |
| Effective date mismatch | candidate excluded |
| Provider budget/credential failure during index build | fail with explicit code; preserve approved corpus but mark index unavailable |

## Audit and Cost Controls

- Record embedding provider/model, vector dimension, token/input unit usage, cost metadata, corpus version, and content hashes.
- Enforce monthly embedding budget and per-run caps under `NFR-033`.
- Record only sanitized query metadata and result references.
- Retrieval results are reproducible from corpus version, index profile, query hash, filters, and model version.

## Acceptance

- Vietnamese text search uses `simple` + `unaccent`, not `english` stemming.
- Hybrid retrieval uses approved corpus, date, source, and metadata filters.
- Results reconstruct article/clause/point-level citations.
- Raw source and sensitive customer text are absent from retrieval/audit payloads.
- Missing index/citation fails closed.
- `FR-053`, `FR-054`, and `FR-056` retain `NFR-017`, `NFR-033`, and/or `NFR-034` dependencies as defined in the canonical FR catalog.