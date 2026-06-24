# Legal Corpus Source Specification

## Status

AUTHORITATIVE — A-to-Z Runnable MVP (Phase 5.2J)

New document per SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23) and ADR-025.

## Purpose

Defines legal corpus source requirements, ingestion schema, approval process, and corpus management policy. Design/spec contract, not source code.

## Source Hierarchy

| Tier | Description | Authority |
|---|---|---|
| PRIMARY | Official government legal databases; ministry-issued decrees, circulars, decisions | Legally authoritative |
| SUPPLEMENTARY | Regulatory guidance documents; official FAQs and implementation guidance | Contextual only |

**Source candidates (pending validation):**

| Source | URL | Status |
|---|---|---|
| Hệ thống pháp luật Việt Nam | vbpl.vn | `SOURCE_VALIDATION_REQUIRED` |
| Cổng thông tin Chính phủ | vanban.chinhphu.vn | `SOURCE_VALIDATION_REQUIRED` |

## Legal Document Identity Schema

| Field | Description | Example |
|---|---|---|
| `document_type` | Type of legal instrument | `DECREE`, `CIRCULAR`, `DECISION`, `LAW`, `RESOLUTION` |
| `document_number` | Official document number | `13/2023/NĐ-CP` |
| `issuing_authority` | Government body | `Chính phủ`, `Bộ Khoa học và Công nghệ` |
| `issue_date` | Publication date | `2023-04-17` |
| `effective_start_date` | Legal effect start | `2023-07-01` |
| `effective_end_date` | Legal effect end (if known) | `null` or date |
| `source_url` | Official canonical URL | `https://vbpl.vn/...` |
| `source_hierarchy` | PRIMARY or SUPPLEMENTARY | `PRIMARY` |

## Document Relationship Schema

| Field | Description |
|---|---|
| `supersedes` | List of document identifiers this document replaces |
| `superseded_by` | Document identifier that replaces this document |
| `amends` | List of documents this document partially modifies |

## Document Structure Schema

Normalized document structure (chapter/article/clause/point hierarchy):

```json
{
  "document_id": "uuid",
  "articles": [
    {
      "article_number": "1",
      "title": "Phạm vi điều chỉnh",
      "clauses": [
        {
          "clause_number": "1",
          "text": "...",
          "points": [
            { "point_number": "a", "text": "..." }
          ]
        }
      ]
    }
  ]
}
```

Rules:
- Normalized text must not include raw HTML/PDF formatting artifacts.
- Each article/clause/point is stored as a structured `LegalDocumentChunk` with stable hierarchical ID and metadata.
- Base retrieval unit is Clause (`Khoản`). Do not split inside a sentence or clause only to satisfy token size.
- Point (`Điểm`) chunks retain parent Clause and Article context for assembly.
- Cross-reference edges are extracted so referenced context can be retrieved one hop when a primary match cites another provision.
- Chunk boundaries align with legal hierarchy to preserve citation fidelity.

## Ingestion Pipeline

| Step | Input | Output | Failure Behavior |
|---|---|---|---|
| 1. Fetch | Source URL | Raw document + HTTP metadata | `LEGAL_SOURCE_UNAVAILABLE`; audit; fail |
| 2. Snapshot | Raw document | Immutable snapshot + SHA-256 hash | Fail; do not proceed without snapshot |
| 3. Identity extraction | Raw document | Structured identity fields | `LEGAL_IDENTITY_EXTRACTION_FAILED`; manual review |
| 4. Date extraction | Raw document | Effective dates | Best-effort; flag missing dates |
| 5. Relationship mapping | Identity + registry | Amendment relationships | Best-effort; flag unmapped |
| 6. Normalization | Raw document | Chapter/article/clause/point structure | `LEGAL_NORMALIZATION_FAILED`; manual review |
| 7. Structure-first chunking | Normalized structure | `LegalDocumentChunk` rows with stable hierarchical IDs and xref metadata | Required for ChromaDB vectorless retrieval |
| 8. Review submission | Normalized document | `CorpusApprovalRecord` attached to `LegalCorpusVersion.status = DRAFT` | Blocked until approved |
| 9. Approval | Review | `CorpusApprovalRecord` (APPROVED) + `LegalCorpusVersion` | Blocked if not approved |

## Corpus Approval Process

| Step | Requirement |
|---|---|
| Review authority | Legal Team or designated approver |
| Review scope | Document identity, effective dates, normalization accuracy, amendment relationships |
| Approval record | `authority`, `date`, `scope_description`, `status`, `corpus_version_id` |
| Approval gate | `LegalCorpusVersion.status = APPROVED` before production retrieval |
| Rejection | Approval is not recorded as approved; the corpus version remains `DRAFT` and is blocked from retrieval until corrected or abandoned. |
| Re-approval trigger | Content hash change, effective date change, or supersession event |

## LegalCorpusVersion Management

| Concern | Policy |
|---|---|
| Creation | Only after all included documents are approved |
| Immutability | Once approved, cannot be modified |
| Supersession | Replaced versions are `SUPERSEDED`; existing assessments retain pinned version |
| Corpus pinning | Each assessment pins to approved corpus version at start |

Canonical lifecycle vocabulary for legal corpus versions, legal documents within a corpus version, approval gate state, queue payload status fields and approval API responses is:

```text
DRAFT -> APPROVED -> SUPERSEDED
```

Do not use `PENDING_REVIEW`, `RETIRED` or `OBSOLETE` as active corpus lifecycle statuses in Phase 5.2J contracts.

## Refresh Policy

`TECHNICAL_DECISION_REQUIRED` — Architecture Team must define:

| Item | Decision Required |
|---|---|
| Ingestion cadence | How often to check for source updates |
| Change detection | Content hash comparison or source metadata versioning |
| Re-approval trigger | What changes require a new `LegalCorpusVersion` |
| Rollback behavior | How to handle corpus regression |

## Corpus Unavailability Behavior

```text
If source URL returns error or document unavailable at ingestion time:
  → LEGAL_SOURCE_UNAVAILABLE audit event
  → Ingest job marked failed
  → Classification requiring the document remains BLOCKED
  → System must not synthesize legal content from unavailable sources
```

Fail-closed behavior is `PROJECT_OWNER_LOCKED`.

## Golden-Path Corpus Fixture

Required for A-to-Z acceptance testing:

| Requirement | Detail |
|---|---|
| Minimum documents | Key decrees/circulars relevant to Vietnamese AI regulation acceptance scenario |
| Approval status | Must be approved before acceptance run |
| ChromaDB vectorless index | Pre-built approved legal records, metadata filters, full-text records and direct lookup IDs included in acceptance environment setup |
| Citation fidelity | Citations must reconstruct to `article`, `clause`, `point` level |

## Non-Claims

- This spec does not confirm that vbpl.vn or vanban.chinhphu.vn are accessible.
- Corpus approval does not constitute legal certification.
- The retrieval system does not make legal conclusions.
