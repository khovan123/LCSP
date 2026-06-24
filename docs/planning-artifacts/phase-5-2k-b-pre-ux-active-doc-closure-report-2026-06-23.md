# Phase 5.2K-B — Pre-UX Active Document Closure Report

## Phase 5.2L Supersession Notice

```text
HISTORICAL_ONLY
SUPERSEDED_IN_PART_BY_PHASE_5_2L
```

This report remains historical evidence for Phase 5.2K. Phase 5.2L supersedes any active authority in this file that preserves RBAC as authorization source of truth, structured attestation, old `FR-050`/`FR-051` semantics, or Node.js downstream domain worker ownership.

## Status

```text
ACTIVE_DOCS_PRE_UX_SYNCHRONIZED
SUPERSEDED_CANONICAL_UX_AUTHORIZATION_PHASE_5_2K
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_NOT_AUTHORIZED
```

## Scope

Documentation/planning remediation only. Archive content was not changed. No application code, tests, CI/CD, containers, deployment, sprint state, UX artifact, or story artifact was created.

## Repository Baseline

| Item | Value |
|---|---|
| Repository | `khovan123/LCSP` |
| Base branch | `main` |
| Base SHA | `b1d144487c5b8b01b84e48ec528b7b77854af43c` |
| Remediation branch | `docs/pre-ux-active-doc-closure` |
| Pre-report branch SHA | `8567f35a1885fc79131a9de06d7beb8a0d7e678a` |

## Closed Findings

### Canonical Requirements and Traceability

- Canonical use cases use `UC-001..UC-018`.
- Active traceability no longer uses legacy `UC-MXX-XX` IDs.
- Legacy UC IDs are classified as source/recovery aliases only.
- Functional requirement inventory remains 56 total, 53 active, and `FR-050..FR-052` Deferred.
- Deferred FRs have no active MVP acceptance criteria, UX screens, or implementation stories.
- Acceptance criteria remain `AC-001..AC-041` and now use canonical UCs and semantic NFR dependencies.
- A-to-Z acceptance excludes optional Developer participation as a prerequisite.
- Traceability retains `CANONICAL_UX_PENDING` and `STORY_TRACEABILITY_PENDING` without claiming implementation readiness.

### Product and UX Boundary

- Manager completes the active golden path without Developer participation.
- Structured Developer attestation under `FR-046` is optional supplemental input only.
- Delegated free-form technical clarification under `FR-052` is Deferred.
- Internal Legal Operator is defined for source validation and corpus approval.
- Corpus ingestion, review, approval, and index administration are internal API/CLI operations for MVP and excluded from Manager/Developer product UX.
- Manager UX may expose only assessment-relevant corpus version, citation provenance, status, and safe blocked reasons.
- User task flows explicitly require loading, empty, permission-denied, insufficient, blocked, failed, retry/rerun, degraded, and audit-reference states.

### Scanner Runtime and Code Ownership

- Python Worker is the sole Repository Scan lifecycle owner and scan-command consumer.
- Python stack is Poetry, stdlib `ast`, and `libcst`.
- TypeScript/JavaScript analysis uses a fixed Node.js `ts-morph` subprocess with versioned JSON stdio.
- Node scanner lifecycle worker and Python syntax-only wording were removed from active code maps and runtime blueprints.
- Scanner graph assembly is Python-native and scan-local; PostgreSQL stores metadata only.
- Completed scan event requires quality-valid report plus verified workspace cleanup.
- Scanner specification no longer contains stale approval/Wave-0 markers or duplicate taxonomy heading.

### Legal Corpus and Retrieval

- Domain model includes LegalSource, LegalDocument, LegalCorpusItem, LegalDocumentChunk, CorpusApprovalRecord, LegalCorpusVersion, RetrievalAuditLog, and ModelRunMetadata.
- Legal corpus lifecycle and embedding-index lifecycle are included in domain state machines.
- Source ingestion uses validated allowlisted official-source URLs, immutable S3-compatible snapshots, and SHA-256 provenance.
- Canonical legal command/event names are aligned across event, queue, worker, code-map, ingestion, and retriever documents.
- Vietnamese FTS is locked to PostgreSQL `simple` plus `unaccent`.
- Vector profile is locked to `vector(1536)`, HNSW cosine, and `0.4` FTS / `0.6` vector weighting.
- Retrieval applies corpus, source, effective-date, metadata, and citation reconstruction filters.
- Retrieval audit stores sanitized facets/query hash and result references instead of arbitrary customer-sensitive raw query text.

### Documentation and Delivery

- Documentation read order includes product, requirements, UX inputs, Python Worker, and legal implementation specifications.
- Implementation index includes Python Worker, legal ingestion, hybrid retriever, and LLM gateway documents.
- Delivery plan verifies all 33 active NFRs, including `NFR-033..NFR-035`.
- Implementation readiness document now authorizes UX planning only and keeps coding/sprint execution paused.

## Active Documents Updated

The closure modified active documents under:

- `docs/product/`
- `docs/specs/`
- `docs/architecture/adr/`
- `docs/developer-execution-blueprints/`
- `docs/implementation/`
- `docs/code-map/`
- top-level documentation/readiness/delivery indexes

No files under `docs/archive/` were modified.

## Validation Performed

- Compared `main` with `docs/pre-ux-active-doc-closure`; branch was ahead and not behind at the time of validation.
- Reviewed the changed-file inventory and confirmed all changes are documentation files.
- Cross-checked canonical inventories: 18 UCs, 56 FRs, 41 ACs, 33 active NFRs.
- Cross-checked deferred FR behavior: `FR-050..FR-052` have no active acceptance or UX obligation.
- Cross-checked Python scan ownership across ADR, scanner spec, implementation, data journey, and code maps.
- Cross-checked legal ingestion/index command names:
  - `command.legal-source.ingest.requested.v1`
  - `event.legal-source.ingest.completed.v1`
  - `event.legal-source.ingest.failed.v1`
  - `command.embedding-build.requested.v1`
  - `event.embedding-build.completed.v1`
  - `event.embedding-build.failed.v1`
- Cross-checked legal corpus/internal operator UX boundary across system context, use cases, task flows, API map, domain model, event catalog, and implementation specs.
- Cross-checked readiness markers to avoid implementation authorization.

No code/test suite was run because the change set contains no application code or executable test scope.

## Authorized Next Sequence

```text
1. Merge this documentation closure after review.
2. Run bmad-ux in a fresh context window.
3. Review and approve canonical UX.
4. Run bmad-create-epics-and-stories.
5. Rebuild story-level traceability.
6. Run bmad-check-implementation-readiness.
7. Start sprint planning and coding only after readiness approval.
```

## Final Markers

```text
ACTIVE_DOCS_PRE_UX_SYNCHRONIZED
CANONICAL_USE_CASES_NORMALIZED
CANONICAL_ACCEPTANCE_CRITERIA_NORMALIZED
DEFERRED_FR_REMOVED_FROM_ACTIVE_ACCEPTANCE
LEGAL_CORPUS_UX_BOUNDARY_LOCKED
PYTHON_WORKER_CODE_MAPS_ALIGNED
SCANNER_RUNTIME_BLUEPRINT_ALIGNED
LEGAL_RETRIEVAL_PROFILE_LOCKED
SUPERSEDED_CANONICAL_UX_AUTHORIZATION_PHASE_5_2K
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```
