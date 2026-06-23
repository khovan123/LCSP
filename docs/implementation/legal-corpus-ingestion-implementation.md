# Legal Corpus Ingestion Implementation Specification

## Status

AUTHORITATIVE — A-to-Z Runnable MVP (Phase 5.2J)

New document per SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23). Defines the ingestion worker and approval gate implementation per ADR-025.

## Purpose

Defines the implementation details for the `Legal Source Ingestion Worker` and the corpus approval gate database mappings.

## Active References

- `docs/architecture/adr/adr-025-legal-corpus-source-architecture.md`
- `docs/specs/legal-corpus-source-spec.md`
- `docs/specs/legal-matching-domain-spec.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`

---

## Ingestion Pipeline Workflow

The Ingestion Worker is a NestJS worker consuming `command.legal-source.ingest.requested.v1` events.

```text
[Ingest Request]
  → 1. Fetch official legal URL
  → 2. Save PDF/HTML snapshot to S3 Object Storage
  → 3. Generate content hash (SHA-256)
  → 4. Parse content structure (Chapters, Articles, Clauses, Points)
  → 5. Persist LegalSource, LegalDocument, & LegalCorpusItem (Status: DRAFT)
```

### Ingestion Details
1. **HTTP Ingestion:** Fetch source using a robust HTTP client (e.g. Axios with custom User-Agent and retry logic). Record request headers, HTTP status, and timestamp.
2. **S3 Object Storage Adapter:** Upload the original raw file directly to S3. Structure path: `/snapshots/legal/{documentType}/{documentNumber}-{contentHash}.pdf`.
3. **Parsing Engine:** Use regex and hierarchical text parsers to segment the document by standard legal indicators:
   - *Chapter:* `Chương [I-V|X]+: ...`
   - *Article:* `Điều \d+: ...`
   - *Clause:* `\d+\. ...`
   - *Point:* `[a-z]\) ...`
4. **Failure Recovery:** If the fetch fails or formatting parsing breaks, abort the transaction, log the failure as `LEGAL_SOURCE_UNAVAILABLE`, and block downstream matching tasks.

---

## Legal Corpus Review & Approval Gate

No ingested document can be used for compliance matching until it is reviewed and approved.

### DB Status Progression
```text
DRAFT (after ingestion) → APPROVED (after review) → SUPERSEDED (on replacement)
```

### Approval Event Flow
1. Internal Legal Approver or designated system operator uses API endpoint `POST /api/v1/internal/legal-corpus/approve` providing `corpusVersionId`. This is an internal control permission, not a customer-facing `Admin` product role.
2. System writes a `CorpusApprovalRecord` detailing the reviewer, approval timestamp, and comments.
3. System updates the status of `LegalCorpusVersion` to `APPROVED`.
4. System triggers index building by publishing `command.embedding-build.requested.v1`.
5. Only `APPROVED` corpus versions are queried by the hybrid retriever during assessments.

The same lifecycle vocabulary must be used in database status fields, queue payloads and approval API responses:

```text
DRAFT -> APPROVED -> SUPERSEDED
```
