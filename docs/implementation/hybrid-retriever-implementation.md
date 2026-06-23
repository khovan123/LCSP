# Hybrid Retriever Implementation Specification

## Status

AUTHORITATIVE — A-to-Z Runnable MVP (Phase 5.2J)

New document per SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23). Defines pgvector + FTS hybrid search implementation details per ADR-026.

## Purpose

Defines the PostgreSQL indexing strategy, hybrid ranking execution, and audit logging for legal matching.

## Active References

- `docs/architecture/adr/adr-026-hybrid-legal-retriever.md`
- `docs/specs/legal-matching-domain-spec.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`

---

## Indexing Strategy

### 1. Vector Indexing (pgvector)
- **Column Definition:** `embedding Unsupported("vector(1536)")?` in `LegalDocumentChunk` table.
- **Index Type:** HNSW (Hierarchical Navigable Small World) for fast cosine similarity search.
- **SQL Migration:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE INDEX IF NOT EXISTS legal_chunk_hnsw_idx ON "LegalDocumentChunk" 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
  ```

### 2. Full-Text Search (FTS) Indexing
- **Index Type:** GIN index on text elements of legal clauses.
- **SQL Migration:**
  ```sql
  CREATE INDEX IF NOT EXISTS legal_chunk_fts_idx ON "LegalDocumentChunk" 
  USING gin (to_tsvector('english', content));
  ```
  *(Note: Standard 'english' dictionary is used as a baseline parser for controlled MVP keyword matching).*

---

## Hybrid Query Execution & Ranking

The retriever combines FTS and Vector search scores to identify the most relevant legal articles.

### Linear Weighted Score Formula
The system combines the normalized scores linearly:
```text
Score = (Weight_FTS * FTS_Rank) + (Weight_Vector * (1 - Cosine_Distance))
```
- Default weights: `Weight_FTS = 0.4`, `Weight_Vector = 0.6`.
- FTS Rank is computed using `ts_rank_cd`.
- Cosine Distance is computed using `<=>` operator in pgvector.

### Pinned Filters
Every search query must apply strict relational filters:
1. **Corpus Version Pinning:** Matches `corpusVersionId` recorded at assessment start.
2. **Effective Date Restriction:** Matches `effectiveStartDate <= assessment_date` and `(effectiveEndDate IS NULL OR effectiveEndDate >= assessment_date)`.

### Raw SQL Query Example
```sql
SELECT 
  c.id, 
  c.content,
  (0.4 * ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', :query))) +
  (0.6 * (1 - (c.embedding <=> :embedding::vector))) as hybrid_score
FROM "LegalDocumentChunk" c
JOIN "LegalCorpusItem" item ON c."corpusItemId" = item.id
JOIN "LegalDocument" doc ON item."documentId" = doc.id
WHERE item."corpusVersionId" = :corpusVersionId
  AND doc."effectiveStartDate" <= :assessmentDate
  AND (doc."effectiveEndDate" IS NULL OR doc."effectiveEndDate" >= :assessmentDate)
ORDER BY hybrid_score DESC
LIMIT :limit;
```

---

## Retrieval Auditing

To maintain compliance audit integrity (NFR-010):

- Every retrieval execution must log to the `RetrievalAuditLog` table.
- Logged fields: `id` (UUID), `assessmentId`, `queryText` (raw text), `filtersApplied` (JSON representing pinned version and dates), `resultCount`, and `results` (JSON array of matched chunk IDs, scores, and parent legal locators).
- No query payloads may contain raw system secrets or repository code (NFR-015).
