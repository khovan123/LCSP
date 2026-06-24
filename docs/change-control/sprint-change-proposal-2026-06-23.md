# Sprint Change Proposal — LCSP MVP Scope & Architecture Pivot

**Document ID:** SPRINT-CHANGE-PROPOSAL-5.2J  
**Date:** 2026-06-23  
**Phase:** 5.2J — A-to-Z Runnable MVP Change Proposal  
**Change Classification:** `MAJOR_CONTROLLED_MVP_SCOPE_AND_ARCHITECTURE_PIVOT`  
**Repository:** khovan123/LCSP — branch `main`  
**HEAD at analysis time:** `c33b137`  
**Prepared by:** Developer Agent (Antigravity)

---

## Supersession Record

```text
PHASE_5_2I_VALID_FOR_PREVIOUS_MVP_DEFINITION
SUPERSEDED_BY_PROJECT_OWNER_MVP_SCOPE_PIVOT
SUPERSEDED_IN_PART_BY_PHASE_5_2L
```

Phase 5.2I (commit `c33b137`) is correct and complete for the **previous** controlled MVP definition. It is preserved as historical evidence and must not be deleted or rewritten.
Phase 5.2L supersedes any active authority in this file that preserves RBAC as authorization source of truth, structured attestation, Local/CI scanner report upload under `FR-050`, manual evidence JSON upload under `FR-051`, or Node.js downstream domain worker ownership.

This proposal creates a new canonical baseline. Implementation and story execution for affected areas **must pause** until:
1. This Change Proposal is approved by the Project Owner.
2. Canonical documents are synchronized.
3. Implementation Readiness is re-checked against the new definition.

---

## Section 1: Executive Summary

Project Owner has redefined the MVP success condition from **documentation-ready controlled prototype** to **A-to-Z runnable integrated system** — a real end-to-end flow using real infrastructure (PostgreSQL, RabbitMQ, GitHub, legal corpus, LLM provider, object storage, audit records).

Four previous technical decisions are now superseded:

| # | Previous Decision | New Direction |
|---|---|---|
| 1 | TypeScript-first Node.js scanner worker | **Python Worker** owns Repository Scan lifecycle |
| 2 | Python syntax-only scanner support | **Python is first-class** in MVP scanner |
| 3 | Deterministic mock LLM gateway by default | **Real configured LLM provider** is mandatory for happy path |
| 4 | Local JSONL legal corpus seed | **Provenance-preserving legal corpus** from identified sources with real retrieval index |

These changes cascade into: multi-agent architecture, queue topology, persistence schema, legal matching/RAG, LLM Gateway, acceptance criteria, delivery plan, epics/stories, and team skill requirements.

**Go/No-Go Recommendation:** `CONDITIONAL_GO` — proceed to Document Remediation Wave only after Project Owner formally approves the canonical decisions listed in Section 18.

---

## Section 2: Reason for Change

The Project Owner has determined that the previous MVP definition — a documentation-ready prototype with mock LLM and JSONL corpus seed — is insufficient to validate real-world compliance workflow correctness. A runnable A-to-Z system is required to demonstrate that:

- A Manager can complete the full 18-step happy path under real conditions.
- Risk classification is grounded in real legal corpus data, real retrieval, and real LLM reasoning.
- Python-language repositories (the dominant language class for AI/ML systems subject to Vietnamese AI regulation) receive first-class analysis support.
- The evidence chain from repository → scan → TechnicalProfile → VerifiedProfile → LegalRuleMatch → Report is auditable against real data, not synthetic fixtures.

This is a **strategic pivot**, not a defect correction. Phase 5.2I work is preserved and was correct for the prior scope.

---

## Section 3: Previous vs New MVP Definition

### Previous MVP Definition (Phase 5.2I)

> A documentation-ready controlled prototype that implements the full assessment workflow with deterministic components: Node.js TypeScript scanner worker, mock LLM gateway by default, local JSONL legal corpus seed, and Python syntax-only support. MVP is complete when the prototype is implementation-ready and all canonical documents are synchronized.

**Acceptance:** Documentation-ready. No live infrastructure required.

### New MVP Definition (Phase 5.2J)

> An A-to-Z runnable integrated system where a Manager can execute the 18-step real happy path using: real PostgreSQL, real RabbitMQ, real GitHub repository snapshot, real Python Worker, real legal corpus from provenance-validated sources, real retrieval index, real LLM provider, real document artifact storage, and real audit records.

**Acceptance:** Real end-to-end run passes. Negative-path acceptance also required (see Section 11).

---

## Section 4: Scope Delta

### Added to MVP Scope

| Item | Description |
|---|---|
| Python Worker process | Standalone Python service owning the Repository Scan lifecycle |
| Python-first scanner | Full-class Python static analysis: imports, packages, modules, functions, classes, methods, AI provider/model invocation, input/output tracking, cross-module flow, human-review paths |
| Real LLM integration | Configured provider/model mandatory for happy path; mock retained only for test/CI/offline |
| Legal Source Ingestion Worker | Ingests from identified sources (vbpl.vn, vanban.chinhphu.vn candidates) into corpus store |
| Legal Corpus Review/Approval | Formal corpus approval gate before corpus is used for classification |
| Immutable LegalCorpusVersion | Versioned, immutable corpus snapshots with effective-date and hash |
| Embedding/Index Builder | Builds pgvector index and full-text index from approved corpus |
| Hybrid Legal Retriever | Combined FTS + pgvector retrieval with metadata and effective-date filters |
| Real retrieval audit metadata | Every retrieval run produces traceable audit record |
| Real object storage | Document artifact storage (S3-compatible) with real adapter, not local filesystem mock |
| Golden-path repository fixture | Committed Python + TypeScript AI repository for acceptance testing |
| Golden-path legal corpus fixture | Approved minimal corpus for acceptance testing |
| 18-step A-to-Z acceptance run | Full happy path executed by real Manager against real infrastructure |
| Negative-path acceptance | 14 required negative-path scenarios verified |

### Moved from MVP to Test/CI Only

| Item | New Status |
|---|---|
| Deterministic mock LLM gateway as MVP happy path | `MOVED_TO_TEST_AND_OFFLINE_ONLY` |
| Local JSONL legal corpus seed as production corpus | `MOVED_TO_TEST_FIXTURE_ONLY` |
| Local filesystem artifact store as production store | `MOVED_TO_LOCAL_DEV_ONLY` |

### Retained from Phase 5.2I

| Item | Status |
|---|---|
| NestJS API as web/RBAC/job-creation layer | `RETAINED` |
| RabbitMQ + Outbox pattern | `RETAINED` |
| PostgreSQL persistence schema (additive changes required) | `RETAINED_WITH_EXTENSIONS` |
| Manager-led workflow, RBAC, conflict resolution | `RETAINED` |
| Evidence gates, VerifiedProfile, classification gate | `RETAINED` |
| ADR-006 (no raw source to LLM) | `RETAINED` |
| ADR-015 (LLM Gateway as single boundary) | `RETAINED` |
| ADR-021 (controlled L0-L4 flow analysis) | `RETAINED` |
| Audit trail requirements | `RETAINED` |
| TypeScript/JavaScript scanner (ts-morph, tree-sitter) | `RETAINED` — now integrated with Python Worker |

### Deferred to Post-MVP

| Item | Status |
|---|---|
| Full enterprise IAM / SCIM | `DEFERRED_POST_MVP` |
| Multi-country compliance frameworks | `DEFERRED_POST_MVP` |
| CI/CD production-grade GitHub Action as default path | `DEFERRED_POST_MVP` |
| CodeQL integration | `DEFERRED_POST_MVP` |
| Runtime telemetry as evidence source | `DEFERRED_POST_MVP` |
| Provider failover and enterprise tenant isolation | `DEFERRED_POST_MVP` |

---

## Section 5: Architecture Delta

### 5.1 Scanner Runtime Ownership

**Previous (ADR-022):** TypeScript-first Node.js scanner worker (`apps/worker`), `packages/scanner`.

**New Direction:** Python Worker owns Repository Scan lifecycle.

```text
Repository Scan Lifecycle — NEW:

NestJS API
  → command.scan.requested.v1 → RabbitMQ
  → Python Worker (queue consumer)
      → materialize snapshot workspace
      → run Python AST/static-analysis stack
      → run TypeScript/JavaScript analyzer (embedded adapter or subprocess)
      → generate TechnicalEvidenceReport
      → persist metadata to PostgreSQL
      → cleanup workspace
      → publish event.scan.completed.v1 or event.scan.failed.v1 → RabbitMQ (via outbox)
  → NestJS API (event consumer: TechnicalProfile trigger)
```

**TypeScript/JavaScript analyzer integration:** `TECHNICAL_DECISION_REQUIRED` — three candidate patterns:

| Option | Description | Trade-off |
|---|---|---|
| A | Embedded Node.js subprocess spawned by Python Worker | Simple packaging; subprocess coordination overhead |
| B | Separate `ts-analyzer` microservice called by Python Worker via HTTP/gRPC | Clean boundary; adds service deployment unit |
| C | Python reimplementation of TS/JS analysis | Maximum integration; high implementation cost |

**Decision required:** Option A or B recommended for MVP. Option C is post-MVP.

### 5.2 Python Scanner — First-Class Analysis

**Previous:** Python syntax-only via tree-sitter (`SYNTAX_ONLY` support level, `DEFERRED_FROM_CONTROLLED_MVP_PROTOTYPE`).

**New:** Python is first-class. The Python Worker must implement:

| Capability | Implementation Approach |
|---|---|
| Imports and package usage | AST `import`/`from` extraction; pip manifest parsing |
| Module relationships | Cross-module call graph (bounded scope, L0-L3) |
| Functions, classes, methods | `ast.FunctionDef`, `ast.ClassDef`, method resolution |
| AI provider/model invocation | Pattern matching against provider API patterns (openai, anthropic, google-genai, transformers, LangChain, LlamaIndex, etc.) |
| Input and output tracking | Argument binding and return-value flow (L1-L2 scope) |
| Local and controlled cross-module flow | L2-L3 bounded cross-module tracing |
| Model-output-to-condition/action paths | Downstream branch/action after model call (L1-L2) |
| Human-review paths | Decorator/annotation/conditional pattern matching |
| Common Python web/worker frameworks | FastAPI, Flask, Django, Celery, asyncio workers |
| Common AI/ML/RAG libraries | LangChain, LlamaIndex, HuggingFace, OpenAI SDK, Anthropic SDK, Google GenAI SDK, PyTorch, TensorFlow |
| Evidence references | Metadata-only, no raw source persistence |
| Uncertainty and unsupported dynamic boundaries | `UNSUPPORTED_DYNAMIC_FLOW`, `SCAN_COVERAGE_LIMITATION` |

> **Explicit non-claim:** Python Worker does not claim complete whole-program understanding. Dynamic imports, runtime reflection, multiprocessing queues, and external service calls at dynamic boundaries remain `UNSUPPORTED_DYNAMIC_FLOW`.

### 5.3 LLM Runtime — Real Provider Mandatory

**Previous:** `LLM_PROVIDER_MVP: DETERMINISTIC_MOCK_LLM_GATEWAY_BY_DEFAULT`. Mock is the controlled MVP happy path.

**New:** Real configured LLM provider is mandatory for the A-to-Z MVP acceptance run.

```text
LLM Mode Classification:
  provider  → real inference (required for A-to-Z acceptance)
  mock      → deterministic mock (unit tests, offline CI, credential-unavailable dev)
```

Mock-backed run **does not qualify** as the final A-to-Z MVP acceptance run.

**Required LLM architecture decisions:**

| Concern | Status |
|---|---|
| Provider selection decision owner | `COST_OR_CREDENTIAL_DECISION_REQUIRED` |
| Model configuration | `TECHNICAL_DECISION_REQUIRED` |
| Embedding provider/model | `TECHNICAL_DECISION_REQUIRED` |
| Credential configuration | `COST_OR_CREDENTIAL_DECISION_REQUIRED` |
| Timeout and token limits | `TECHNICAL_DECISION_REQUIRED` |
| Structured output validation | `TECHNICAL_DECISION_REQUIRED` |
| Retry and outage behavior | `TECHNICAL_DECISION_REQUIRED` |
| Privacy restrictions | `PROJECT_OWNER_LOCKED` — no raw source to LLM (ADR-006 retained) |
| Cost-control boundary | `COST_OR_CREDENTIAL_DECISION_REQUIRED` |
| Fallback behavior | `TECHNICAL_DECISION_REQUIRED` |

**Retained invariants (not superseded):**
- All LLM calls route through LLM Gateway (ADR-015 retained).
- No raw source, full prompts, or secrets enter LLM input.
- LLM output cannot override deterministic evidence, legal rules, or citations.
- Citation Guardrail and output guardrails remain required.

### 5.4 Legal Corpus Architecture — Source-Defined Provenance

**Previous:** Local JSONL legal corpus seed with citation-required fields. Source ingestion architecture not defined.

**New:** Legal Corpus must be derived from identified legal sources with full provenance preservation.

**Required corpus metadata per document:**

| Field | Requirement |
|---|---|
| Source hierarchy | PRIMARY or SUPPLEMENTARY |
| Official source URL | Required with retrieval metadata |
| Legal document identity | Unique identifier (decree/circular/decision number) |
| Issuing authority | Government body that issued the document |
| Issue date | Publication date |
| Effective dates | Start and end of legal effect |
| Amendment/replacement/expiry | Relationship to other legal documents |
| Original document snapshot | Immutable copy at ingestion time |
| Content hash | SHA-256 of normalized content |
| Normalized article/clause/point structure | Structured parsing of legal hierarchy |
| Corpus review and approval | Approval record before corpus enters production use |
| LegalCorpusVersion (immutable) | Versioned snapshot of approved corpus |
| Refresh and versioning policy | When and how corpus is updated |
| Unsupported/unavailable source behavior | `fail-closed` — classification blocked if source unavailable |

**Project Owner source candidates:** `vbpl.vn`, `vanban.chinhphu.vn`.

> **Source Validation Required:** Final authority and technical accessibility of these sources must be validated before implementation. Do not claim confirmed accessibility without explicit source validation.

### 5.5 Legal Matching / RAG — Real Retriever

**Previous:** LegalMatchingWorker consumes LegalCorpusVersion; ingestion, indexing, retrieval, and source ownership not sufficiently defined.

**New:** MVP must contain a real retriever operating on the approved corpus.

**Architecture components:**

| Component | Responsibility | Status |
|---|---|---|
| Legal Source Ingestion Worker | Fetch, validate, normalize, snapshot legal source documents | `TECHNICAL_DECISION_REQUIRED` |
| Legal Corpus Review/Approval | Human/authorized review gate before corpus enters production | `PROJECT_OWNER_LOCKED` — required gate |
| Legal Corpus Store | PostgreSQL metadata + immutable document snapshots | `TECHNICAL_DECISION_REQUIRED` |
| Embedding/Index Builder | Build pgvector embeddings + PostgreSQL FTS indexes from approved corpus | `TECHNICAL_DECISION_REQUIRED` |
| Hybrid Legal Retriever | FTS + pgvector + metadata filters + effective-date filters + corpus-version pinning | `TECHNICAL_DECISION_REQUIRED` |
| LegalMatchingWorker | Consumes VerifiedProfile → invokes Retriever → builds LegalRuleMatch records | `RETAINED_WITH_EXTENSIONS` |
| Citation Guardrail | Fail-closed: blocks classification output when required citations are missing or unapproved | `RETAINED` |

**Hybrid retrieval requirements:**
- PostgreSQL full-text search for keyword and article-number matching.
- pgvector cosine similarity for semantic embedding retrieval.
- Metadata filters: legal document type, issuing authority.
- Effective-date filters: document must be in effect at assessment date.
- Corpus-version pinning: retrieval must use the approved `LegalCorpusVersion` recorded at assessment start.
- Hybrid result ranking: weighted combination of FTS rank and vector similarity.
- Citation reconstruction: `rule_id`, `article`, `clause`, `point`, `document_id`, `corpus_version_id`.
- Retrieval audit metadata: retrieval query, scores, filters applied, result count, timestamp.
- Fail-closed: missing or incomplete citations block final classification output.

---

## Section 6: Product and Requirements Impact

### PRD Impact

| PRD Section | Impact |
|---|---|
| §5 End-to-End User Journey (UJ-1..UJ-4) | UJ-1 now requires real Python Worker, real legal corpus, real LLM. Acceptance criteria must be updated. |
| §6 MVP Scope In-Scope | Python Worker, real LLM integration, Legal Source Ingestion, Legal Corpus Review, Hybrid Retriever must be added to in-scope. |
| §6 Out of Scope | "Deterministic mock LLM as happy path" must be removed. |
| §7 FR-E3-1..FR-E3-5 (Technical Evidence) | Scanner runtime language must be updated to Python Worker. |
| §7 FR-E6-3 (Evidence-based risk output) | Must explicitly state real legal corpus and real LLM are required. |
| §8 NFR (Security/Privacy) | NFR-1..NFR-5 retained. Add: real LLM provider privacy restrictions. |
| §14 Audit Trail | Add: LLM run metadata, corpus version, retrieval audit. |
| §15 High-Risk Assumptions | A2 (legal reliability) now partially resolved by real corpus requirement; A2-b2 (scanner accuracy) elevated by Python first-class requirement. |

**PRD status after pivot:** `REQUIRES_REMEDIATION` — PRD must be updated to reflect new MVP definition before implementation resumes.

### Functional Requirements Impact

| FR Range | Impact |
|---|---|
| FR-E3-1 (GitHub App evidence path) | Add: Python Worker ownership of scan execution |
| FR-E6-3 (evidence-based risk output) | Add: real retrieval index, real LLM |
| New FR: Legal Corpus Ingestion | New requirement: Legal Source Ingestion Worker |
| New FR: Corpus Approval Gate | New requirement: Corpus review/approval before production use |
| New FR: LLM Provider Configuration | New requirement: real provider/model/credential for happy path |
| New FR: Embedding-Based Retrieval | New requirement: pgvector index and hybrid retriever |

### Non-Functional Requirements Impact

| NFR Range | Impact |
|---|---|
| NFR-1..NFR-5 (source privacy) | Retained. Add: Python Worker must enforce same raw-source boundaries. |
| NFR-6 (repeatability) | Must now use real LLM + real corpus version pinning for repeatability. |
| NFR-8 (legal corpus version) | Extends to require immutable LegalCorpusVersion + retrieval audit metadata. |
| New NFR: LLM cost-control | Required: token budget, retry limit, cost-control boundary. |
| New NFR: Corpus refresh policy | Required: when and how legal corpus is updated. |
| New NFR: Python Worker isolation | Required: same workspace isolation as TypeScript worker. |

### Acceptance Criteria Impact

All 26 existing acceptance criteria (`AC-001..AC-026`) remain structurally valid. The following require content updates:

| AC | Change |
|---|---|
| AC related to scanner | Update runtime reference: Python Worker |
| AC related to LLM | Change: mock to real provider for acceptance run |
| AC related to legal corpus | Change: JSONL seed to approved corpus from source |
| AC related to end-to-end | Update: must reference 18-step real happy path |

New acceptance criteria required:
- A-to-Z happy path: all 18 steps complete in real environment.
- 14 negative-path scenarios (see Section 11).
- Legal corpus approved before acceptance run.
- Python repository fixture analyzed with first-class findings.

---

## Section 7: Data and Integration Impact

### PostgreSQL Schema Extensions Required

| Table/Area | Change |
|---|---|
| LegalCorpus | New tables: `LegalSource`, `LegalDocument`, `LegalCorpusVersion`, `LegalCorpusItem` |
| LegalDocumentChunk | Chunked text with embedding vector column (pgvector) |
| RetrievalAuditLog | New table: retrieval query, scores, filters, results |
| LLMRunMetadata | Extend with: corpus version, embedding model, retrieval scores |
| RepositoryScanJob | Add: `workerRuntime: PYTHON or TYPESCRIPT` for transition tracking |
| CorpusApprovalRecord | New table: approval authority, date, corpus version, status |

### Queue Topology Extensions

| Change | Detail |
|---|---|
| New consumer: Python Worker | Consumes `command.scan.requested.v1` |
| New producer: Python Worker outbox | Publishes `event.scan.completed.v1` / `event.scan.failed.v1` |
| New queue: Legal Source Ingestion | Command/event pair for corpus ingestion jobs |
| New queue: Embedding Build | Command/event pair for index building jobs |
| Existing NestJS queues | Retained |

### Integration Boundaries

| Integration | Change |
|---|---|
| GitHub App | Retained (read-only) — Python Worker now materializes snapshot |
| Real LLM Provider | New mandatory integration: API key, endpoint, model config |
| pgvector | New mandatory integration: PostgreSQL extension, embedding column |
| Object Storage (real) | Upgrade from local filesystem mock to real S3-compatible service |
| Legal Source URLs | New external dependency: vbpl.vn, vanban.chinhphu.vn (pending validation) |

---

## Section 8: Legal Corpus Source Architecture Requirements

### Source Hierarchy

```text
PRIMARY SOURCES (legally authoritative)
  → Official government legal databases (vbpl.vn, vanban.chinhphu.vn — pending validation)
  → Ministry-issued decrees, circulars, decisions

SUPPLEMENTARY SOURCES (contextual, not legally authoritative)
  → Regulatory guidance documents
  → Official FAQs and implementation guidance
```

### Ingestion Requirements

1. **Retrieval:** Fetch document from official URL with HTTP metadata (URL, timestamp, HTTP status, redirect history).
2. **Snapshot:** Store immutable original document snapshot with content hash (SHA-256).
3. **Identity:** Extract legal document identity (decree/circular/decision number, type, issuing authority).
4. **Dates:** Extract issue date, effective start date, effective end date where available.
5. **Relationships:** Record amendment relationships (supersedes, superseded-by, amends).
6. **Normalization:** Parse hierarchical structure (chapter/article/clause/point).
7. **Approval:** Submit normalized document to Corpus Review; block corpus use until approved.
8. **Versioning:** On approval, create immutable `LegalCorpusVersion` with version hash.
9. **Refresh:** Define and implement refresh policy (cadence, change detection, re-approval trigger).

### Corpus Unavailability Behavior

```text
If source URL returns error or document is unavailable:
  → Ingest job fails with LEGAL_SOURCE_UNAVAILABLE
  → Audit event recorded
  → Classification that requires the document remains BLOCKED
  → System must not synthesize legal content from unavailable source
```

---

## Section 9: Python Scanner/Worker Requirements

### Process and Package Boundary

```text
Python Worker:
  Package: lcsp-scanner-worker (Python package)
  Process: standalone Python service
  Entry point: consumes RabbitMQ command.scan.requested.v1
  Runtime: Python 3.11+
  Dependency manager: pip + pyproject.toml (or Poetry — TECHNICAL_DECISION_REQUIRED)

TypeScript/JavaScript Analyzer:
  Integration: TECHNICAL_DECISION_REQUIRED (subprocess or microservice)
  Boundary: Python Worker invokes; results normalized to TechnicalFinding schema
```

### Queue Consumer Ownership

```text
command.scan.requested.v1 → Python Worker (sole consumer)
event.scan.completed.v1  → published by Python Worker (via outbox)
event.scan.failed.v1     → published by Python Worker (via outbox)
```

The NestJS worker no longer owns the scan consumer. NestJS API retains job creation, RBAC, and event consumption for downstream workflow triggers.

### Repository Workspace Lifecycle

Identical policy to ADR-016 (retained):
- Ephemeral restricted workspace.
- Workspace naming: `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}`.
- Cleanup immediately after completion or terminal failure.
- Cleanup failure → `SCANNER_WORKSPACE_CLEANUP_FAILED` → audit + blocked state.
- No raw source long-term persistence.

### Failure, Retry, Cleanup and Audit Behavior

| Failure Mode | Behavior |
|---|---|
| Repository access failure | `REPOSITORY_ACCESS_FAILED`; audit; `event.scan.failed.v1` |
| Parser failure (single file) | `SCANNER_PARSE_FAILED`; coverage limitation; continue when bounded |
| Workspace cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; security audit; downstream blocked |
| Unsupported dynamic Python flow | `UNSUPPORTED_DYNAMIC_FLOW`; coverage limitation; do not infer |
| Provider/package-only finding | `AI_PROVIDER_USAGE` finding with abstention on invocation/decision claims |
| Idempotency | `scanJobId` used for deduplication |
| Retry | 3 attempts with exponential backoff before DLQ |

### Python AST/Static Analysis Stack

`TECHNICAL_DECISION_REQUIRED` — candidates:

| Library | Purpose | Notes |
|---|---|---|
| `ast` (stdlib) | Python AST extraction | Zero dependency, comprehensive |
| `libcst` | Concrete syntax tree with source positions | Better for preserving source positions |
| `tree-sitter-python` | Tree-sitter grammar | Could share grammar across runtimes |
| `astroid` / `pylint` | Type inference, cross-module resolution | Higher complexity |
| `rope` | Refactoring + cross-module analysis | Mature |

**Recommendation:** `ast` (stdlib) + `libcst` for primary extraction; `astroid` evaluated for cross-module resolution post-spike.

### TypeScript/JavaScript Analyzer Integration

`TECHNICAL_DECISION_REQUIRED`:

| Option | Pattern |
|---|---|
| A | Python Worker spawns `node ts-analyzer-cli` subprocess; JSON stdio protocol |
| B | Separate `ts-analyzer` HTTP service; Python Worker calls via REST |
| C | Python reimplementation (post-MVP only) |

Option A is recommended for MVP (lower deployment complexity).

---

## Section 10: Real LLM Requirements

### Provider Selection

- **Decision owner:** `COST_OR_CREDENTIAL_DECISION_REQUIRED` — Project Owner must approve provider.
- **Candidates:** OpenAI GPT-4o, Google Gemini 1.5 Pro/Flash, Anthropic Claude 3.x. Final selection pending cost and privacy review.
- **Embedding model:** Separate decision required — `text-embedding-3-small` (OpenAI), `text-embedding-004` (Google), or equivalent.

### Model Configuration

`TECHNICAL_DECISION_REQUIRED`:

| Setting | Constraint |
|---|---|
| Max output tokens | At least 1200 (current default); legal analysis nodes may require higher budget |
| Temperature | Low (0.2 or below) for classification and legal matching nodes |
| System prompt | Versioned; stored as prompt template refs, not in source |

### Credential Configuration

`COST_OR_CREDENTIAL_DECISION_REQUIRED`:
- API key stored as environment secret (not in source, not in logs).
- `LLM_API_KEY_REF` resolved from secret manager.
- Key rotation policy required before production acceptance.

### Timeout and Token Limits

| Setting | MVP Value | Notes |
|---|---|---|
| `LLM_TIMEOUT_MS` | 15000 minimum (may increase for real provider) | `TECHNICAL_DECISION_REQUIRED` |
| `LLM_MAX_OUTPUT_TOKENS` | 1200 baseline; node-specific overrides | `TECHNICAL_DECISION_REQUIRED` |
| Retry budget | 2 retries for transient errors | Retained from existing implementation |

### Structured Output Validation

- All LLM outputs must pass Zod schema validation before acceptance.
- Invalid output triggers retry then fail-closed.
- LLM output cannot create legal conclusions without citation-backed guardrail passing.

### Retry and Outage Behavior

```text
LLM call fails:
  → Retry up to 2 times (exponential backoff)
  → If all retries fail:
    - Classification node: CLASSIFICATION_LLM_UNAVAILABLE; block or degrade per policy
    - Document generation node: DOCUMENT_GENERATION_LLM_UNAVAILABLE; block
    - AIUsageFlow node: degrade to deterministic-only result with uncertainty annotation
  → Audit: provider/model/timeout/failure recorded
```

### Privacy Restrictions

`PROJECT_OWNER_LOCKED` — retained from ADR-006 and ADR-015:
- No raw source code to LLM.
- No secrets to LLM.
- No full AST bodies to LLM.
- Only sanitized metadata, redacted summaries, evidence ref IDs.

### Cost-Control Boundary

`COST_OR_CREDENTIAL_DECISION_REQUIRED`:
- Monthly budget cap must be defined before acceptance run.
- Token usage per workflow run must be logged.
- Alert threshold required.

### Fallback Behavior

- If provider is unavailable: fail-closed per node policy (not silent degradation).
- Mock mode available for unit tests / offline CI / credential-unavailable dev environments.
- Mock-backed run explicitly does not qualify as A-to-Z MVP acceptance.

---

## Section 11: A-to-Z Acceptance Definition

### Happy Path (18 Steps)

| Step | Action | Infrastructure |
|---|---|---|
| 1 | Manager authenticates | Real OAuth/OIDC or email/password |
| 2 | Manager creates Organization and Assessment | Real PostgreSQL |
| 3 | Manager completes WizardProfile | Real PostgreSQL |
| 4 | Manager connects GitHub App | Real GitHub App |
| 5 | Manager selects repository, branch, and commit | Real GitHub repository |
| 6 | Manager runs Repository Scan through Python Worker | Real Python Worker + Real RabbitMQ |
| 7 | System produces TechnicalEvidenceReport | Real Python Worker output |
| 8 | System produces TechnicalProfile | Real PostgreSQL |
| 9 | System produces AIUsageFlow | Real deterministic rules engine |
| 10 | Manager resolves a conflict through UI | Real conflict resolution UI + PostgreSQL |
| 11 | System produces VerifiedProfile | Real PostgreSQL |
| 12 | System retrieves from approved legal corpus | Real pgvector + FTS retrieval |
| 13 | System produces citation-backed LegalRuleMatch records | Real PostgreSQL |
| 14 | System runs Risk Classification | Real LLM provider via LLM Gateway |
| 15 | System runs Gap Analysis | Real deterministic rules + PostgreSQL |
| 16 | System generates a real document artifact | Real LLM provider + real object storage |
| 17 | Manager downloads or views the artifact | Real object storage URL |
| 18 | Manager views or exports audit trail | Real PostgreSQL audit records |

**Required infrastructure for acceptance run:**

```text
Real PostgreSQL (with pgvector extension)
Real RabbitMQ
Real repository snapshot (Python + TypeScript AI repository fixture)
Real Python Worker
Real legal corpus data (from approved sources)
Real retrieval index (pgvector + FTS)
Real LLM provider (configured credentials)
Real document artifact storage (S3-compatible)
Real audit records
```

### Required Negative-Path Acceptance (14 Scenarios)

| Scenario | Expected System Behavior |
|---|---|
| Repository access failure | `REPOSITORY_ACCESS_FAILED`; scan fails closed; audit; no downstream |
| Scanner parser failure | `SCANNER_PARSE_FAILED`; coverage limitation recorded; bounded continuation |
| Workspace cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; security audit; downstream blocked |
| Unsupported dynamic Python flow | `UNSUPPORTED_DYNAMIC_FLOW`; coverage limitation; no false inference |
| Provider/package-only finding | `AI_PROVIDER_USAGE` abstention; no invocation/decision claim emitted |
| Unresolved reconciliation conflict | Classification blocked; no risk level; Manager task created |
| Missing legal citation | Classification degraded or blocked; not finalized; surface missing basis |
| Obsolete or unapproved corpus version | Retrieval blocked; classification blocked; corpus approval gate enforced |
| Empty hybrid-retrieval result | Legal matching returns no match; classification blocked; audit recorded |
| LLM timeout or provider outage | Retry then fail-closed; audit recorded; workflow state preserved |
| Invalid LLM structured output | Retry then fail-closed; schema validation failure recorded |
| Duplicate queue delivery | Idempotency key prevents double processing; second delivery is no-op |
| Outbox retry | Outbox publisher retries delivery; downstream receives exactly once |
| Document guardrail failure | Document generation blocked; guardrail failure reason recorded; no artifact produced |

---

## Section 12: Risks and Dependencies

### High Risks

| Risk | Mitigation |
|---|---|
| Python Worker development time | Spike Python AST stack first; define integration boundary with TS analyzer early |
| Legal source accessibility (vbpl.vn, vanban.chinhphu.vn) | SOURCE_VALIDATION_REQUIRED — validate before committing to ingestion implementation |
| Real LLM cost for acceptance testing | Define cost-control boundary before acceptance run; use mock for regression |
| Legal corpus approval process complexity | Define approval process and ownership immediately; this is on critical path |
| pgvector performance at corpus scale | Benchmark early; define index parameters before large corpus ingestion |
| Python Worker + NestJS API integration | Define queue contract and outbox ownership before parallel development |
| Credential management for real LLM | Define secret management approach before acceptance environment setup |

### External Dependencies

| Dependency | Status |
|---|---|
| vbpl.vn source accessibility | `SOURCE_VALIDATION_REQUIRED` |
| vanban.chinhphu.vn source accessibility | `SOURCE_VALIDATION_REQUIRED` |
| Real LLM provider API access | `COST_OR_CREDENTIAL_DECISION_REQUIRED` |
| PostgreSQL pgvector extension | Requires explicit extension installation |
| S3-compatible object storage (real) | `TECHNICAL_DECISION_REQUIRED` — provider selection |
| Golden-path GitHub repository fixture | `TECHNICAL_DECISION_REQUIRED` — must be committed and accessible |

---

## Section 13: Cost, Credential, and Infrastructure Impact

### Cost Impact

| Item | Cost Concern |
|---|---|
| Real LLM API calls (acceptance run + regression) | Monthly budget cap required |
| Embedding generation for legal corpus | One-time build cost + incremental refresh |
| Object storage (real artifacts) | Low for MVP scale |
| Legal source ingestion (HTTP fetch) | Low unless rate-limited |

**Required before acceptance run:** Project Owner approves monthly LLM cost budget cap.

### Credential Impact

| Credential | Requirement |
|---|---|
| LLM provider API key | New; must be in secret manager; not in source |
| Embedding model API key | May share with LLM provider key |
| GitHub App credentials | Retained |
| PostgreSQL (with pgvector) | Retained + extension install |
| RabbitMQ | Retained |
| Object storage keys | New for real S3-compatible store |

### Infrastructure Impact

| Component | Change |
|---|---|
| Python Worker service | New deployment unit |
| PostgreSQL | Add `pgvector` extension; schema migrations for corpus tables |
| Object storage | Upgrade from local filesystem to real S3-compatible service |
| Network | Python Worker must reach RabbitMQ, PostgreSQL, and GitHub |
| Acceptance environment | Full infrastructure required (not local-only) |

---

## Section 14: Team and Schedule Impact

### Team Skill Gap

| Skill | Current State | Required |
|---|---|---|
| Python async worker development | Not present in TypeScript-first team | `TEAM_CAPABILITY_REQUIRED` |
| Python AST/static analysis (ast, libcst) | Not present | `TEAM_CAPABILITY_REQUIRED` |
| pgvector / embedding pipeline | Not present | `TEAM_CAPABILITY_REQUIRED` |
| Legal corpus ingestion and normalization | Not present | `TEAM_CAPABILITY_REQUIRED` |
| Vietnamese legal document parsing | Specialized domain knowledge required | `TEAM_CAPABILITY_REQUIRED` |
| Real LLM integration and cost management | Partially present (gateway boundary designed) | Extend existing skill |

### Schedule Impact

Phase 5.2I completion represented the documentation baseline for the previous MVP definition. The pivot introduces:

- **Document Remediation Wave** (before implementation resumes): Major rewrite of ADR-002, ADR-019, ADR-022, scanner-spec, scanner-implementation, llm-gateway-implementation, and new documents for legal corpus architecture. Estimated: 1-2 sprints.
- **Python Worker development**: New workstream not present in Wave 1-7 delivery plan. Estimated: 3-4 sprints.
- **Legal corpus ingestion and approval**: Now on critical path for Wave 5 and A-to-Z acceptance. Estimated: 2-3 sprints (including source validation).
- **Real LLM integration**: Elevated from configuration concern to Wave 5-6 implementation requirement. Estimated: 1-2 sprints.
- **A-to-Z acceptance run preparation**: 1 sprint.

---

## Section 15: Documents Requiring Remediation

### Documents to Update

| Document | Action Required |
|---|---|
| `docs/product/prd.md` | Update MVP definition, scope, UJ-1..UJ-4, FR-E3-1, FR-E6-3, NFRs; add new FRs |
| `docs/architecture/adr/adr-022-typescript-first-npm-only-controlled-prototype.md` | Supersede scanner worker decision; define Python Worker ownership |
| `docs/architecture/adr/architecture-decision-records.md` ADR-002 | Update supersession note: Python Worker supersedes TypeScript-first scanner worker |
| `docs/architecture/adr/architecture-decision-records.md` ADR-019 | Supersede Python syntax-only; define first-class Python scanner |
| `docs/architecture/adr/architecture-decision-records.md` Controlled MVP Decision Status | Update: remove mock LLM as MVP default; add Python Worker, real corpus, real retriever |
| `docs/implementation/scanner-implementation.md` | Rewrite: Python Worker ownership, Python AST stack, TS/JS integration pattern |
| `docs/implementation/llm-gateway-implementation.md` | Update: real provider mandatory for happy path; mock retained for test/offline only |
| `docs/implementation/persistence-implementation.md` | Extend: legal corpus tables, pgvector columns, corpus approval, retrieval audit |
| `docs/implementation/queue-implementation.md` | Extend: Python Worker queue, corpus ingestion queue, embedding build queue |
| `docs/implementation/backend-implementation.md` | Update: scanner runtime reference; legal corpus ingestion boundary |
| `docs/implementation-readiness-certification.md` | Full re-certification required after remediation |
| `docs/implementation-delivery-plan.md` | Add: Python Worker workstream, corpus ingestion wave, real LLM wave, A-to-Z acceptance wave |
| `docs/specs/scanner-spec.md` | Rewrite Python support level from SYNTAX_ONLY to FULL_STATIC; add Python analyzer contracts |
| `docs/specs/legal-matching-domain-spec.md` | Add: corpus source hierarchy, ingestion requirements, hybrid retriever, approval gate |
| `docs/specs/requirements-baseline.md` | Update: add new FRs for Python Worker, real LLM, corpus ingestion, hybrid retriever |
| `docs/specs/acceptance-criteria-catalog.md` | Add: A-to-Z acceptance criteria, 14 negative-path criteria |
| `docs/specs/requirements-traceability-matrix.md` | Update: trace new FRs/ACs to implementation areas |
| `docs/specs/non-functional-requirements.md` | Add: LLM cost-control NFR, corpus refresh NFR, Python Worker isolation NFR |

### New Documents to Create

| Document | Purpose |
|---|---|
| `docs/architecture/adr/adr-023-python-worker-scanner-runtime.md` | New ADR: Python Worker as scanner runtime owner |
| `docs/architecture/adr/adr-024-real-llm-provider-mvp-requirement.md` | New ADR: real LLM mandatory for A-to-Z acceptance |
| `docs/architecture/adr/adr-025-legal-corpus-source-architecture.md` | New ADR: corpus source hierarchy, ingestion, approval, versioning |
| `docs/architecture/adr/adr-026-hybrid-legal-retriever.md` | New ADR: pgvector + FTS hybrid retriever architecture |
| `docs/implementation/python-worker-implementation.md` | Python Worker build specification |
| `docs/implementation/legal-corpus-ingestion-implementation.md` | Legal corpus ingestion build specification |
| `docs/implementation/hybrid-retriever-implementation.md` | Hybrid retriever build specification |
| `docs/specs/legal-corpus-source-spec.md` | Legal corpus source requirements and schema |
| `docs/specs/python-scanner-spec.md` | Python scanner capability specification |

---

## Section 16: Epics/Stories Requiring Replacement or Revision

> Note: Story creation is deferred until document remediation is complete and this Change Proposal is approved.

### Epics Requiring Full Replacement

| Epic (Previous) | Reason |
|---|---|
| Scanner Worker (TypeScript Node.js) | Entirely superseded by Python Worker |
| Python syntax-only support | Superseded by first-class Python analysis |
| LLM mock gateway as default | Superseded by real provider requirement |
| Local JSONL corpus as source | Superseded by source-defined corpus architecture |

### Epics Requiring Major Revision

| Epic | Change |
|---|---|
| Legal Matching/RAG | Extend for corpus ingestion, approval, hybrid retriever, embedding index |
| Technical Evidence Collection | Update for Python Worker ownership |
| Implementation Delivery Plan Waves | Add Python Worker wave, corpus ingestion wave, real LLM wave |

### New Epics Required

| Epic | Description |
|---|---|
| Python Worker — Scanner Runtime | Design, implement, test Python Worker process |
| Python First-Class Scanner | Implement full Python AST analysis stack |
| Legal Source Validation | Validate source accessibility; define ingestion architecture |
| Legal Corpus Ingestion | Implement Legal Source Ingestion Worker |
| Legal Corpus Review/Approval | Implement corpus approval gate and process |
| Embedding/Index Builder | Build pgvector + FTS indexes from approved corpus |
| Hybrid Legal Retriever | Implement retriever with filters and ranking |
| Real LLM Integration | Configure real provider; implement in gateway; validate with real calls |
| A-to-Z Acceptance Run | Infrastructure setup, golden fixtures, 18-step + 14 negative-path verification |

---

## Section 17: Recommended Implementation Waves

> Replaces Wave 1-7 delivery plan for affected areas. Unaffected waves (Assessment, Wizard, RBAC, Audit, Reconciliation, VerifiedProfile, Document Generation shell) remain sequenced as previously planned.

### Wave 0: Document Remediation (prerequisite — do not implement until complete)

- Update all documents listed in Section 15.
- Create new ADRs (ADR-023..ADR-026).
- Re-certify implementation readiness.
- Project Owner approves Change Proposal.

### Wave A: Python Worker Foundation

- Python Worker process setup (package, queue consumer, workspace lifecycle).
- Python AST extraction (ast + libcst).
- TypeScript/JavaScript analyzer integration (subprocess or service — decision required).
- Provider/package detection patterns for Python AI libraries.
- Python Worker outbox integration (same contract as existing outbox).
- Failure/retry/audit behavior.

### Wave B: Python First-Class Scanner

- Full Python static analysis: imports, modules, functions, classes, methods.
- AI invocation detection (LangChain, OpenAI SDK, Anthropic, Google GenAI, HuggingFace).
- Input/output tracking (L1-L2 scope).
- Cross-module flow (L2-L3 bounded).
- Human-review path detection.
- Evidence references (metadata-only).
- Coverage limitations for dynamic boundaries.
- Acceptance testing against golden-path Python fixture.

### Wave C: Legal Corpus Foundation

- Source validation (vbpl.vn, vanban.chinhphu.vn).
- Legal Source Ingestion Worker.
- Legal document normalization (article/clause/point structure).
- Immutable LegalCorpusVersion.
- Corpus approval process and tooling.
- Golden-path legal corpus fixture (minimum viable corpus for acceptance).

### Wave D: Hybrid Retriever

- pgvector extension installation and configuration.
- Embedding builder (batch embedding generation from corpus chunks).
- PostgreSQL FTS indexing.
- Hybrid retriever (FTS + pgvector + metadata filters + effective-date filters + version pinning).
- Citation reconstruction.
- Retrieval audit logging.
- Fail-closed behavior for missing citations.

### Wave E: Real LLM Integration

- Provider selection and credential setup.
- LLM Gateway: real provider adapter (alongside retained mock adapter).
- Structured output validation for real provider responses.
- Timeout/retry configuration for real provider.
- Cost logging.
- Node-by-node validation: classification, gap analysis, document generation.

### Wave F: A-to-Z Acceptance

- Acceptance environment setup (all real infrastructure).
- Golden-path repository fixture (Python + TypeScript AI project).
- 18-step happy path acceptance run.
- 14 negative-path scenarios.
- Cost-control verification.
- Audit trail verification.

---

## Section 18: Decisions Requiring Project Owner Approval

### PROJECT_OWNER_LOCKED (already decided by Project Owner)

1. Python Worker owns Repository Scan lifecycle.
2. Python is first-class in MVP scanner.
3. Real LLM provider is mandatory for A-to-Z acceptance run.
4. Mock-backed run does not qualify as final A-to-Z MVP acceptance.
5. Legal corpus must be derived from provenance-validated sources.
6. Legal Corpus Review/Approval is a mandatory gate before production use.
7. Fail-closed behavior for missing or unapproved corpus versions.
8. A-to-Z acceptance requires all 18 steps to pass with real infrastructure.
9. 14 negative-path scenarios are required for acceptance.
10. Phase 5.2I is preserved as historical evidence; not defective.

### TECHNICAL_DECISION_REQUIRED (assigned owner: Architecture Team)

1. Python Worker framework and packaging (pyproject.toml / Poetry / pip).
2. Python AST/static-analysis stack (ast + libcst vs astroid vs tree-sitter-python).
3. TypeScript/JavaScript analyzer integration with Python Worker (subprocess Option A vs HTTP service Option B).
4. Embedding provider and model selection.
5. Hybrid retrieval and ranking strategy (weights, thresholds).
6. Object/document storage provider selection (S3-compatible service).
7. pgvector index parameters (dimensions, index type, similarity metric).
8. LLM model selection (pending provider decision).
9. Timeout and token limit values for real provider.
10. Fallback behavior per LLM node type.

### SOURCE_VALIDATION_REQUIRED (assigned owner: Legal Team)

11. Confirm technical accessibility of vbpl.vn.
12. Confirm technical accessibility of vanban.chinhphu.vn.
13. Define primary versus supplementary source hierarchy.
14. Confirm legal document identity scheme (document number format).

### COST_OR_CREDENTIAL_DECISION_REQUIRED (assigned owner: Project Owner + Finance)

15. Real LLM provider selection and monthly cost budget cap.
16. Embedding model selection (cost).
17. Object storage provider and cost.
18. Acceptance environment infrastructure cost approval.

### DEFERRED_POST_MVP

19. Full enterprise IAM / SCIM.
20. Multi-country compliance frameworks.
21. CI/CD production GitHub Action as default path.
22. CodeQL integration.
23. Runtime telemetry as evidence source.
24. Provider failover and enterprise tenant isolation.
25. Python semantic type inference beyond L2-L3 bounded analysis.

---

## Section 19: Go/No-Go Recommendation

### Recommendation: CONDITIONAL_GO

**Go conditions (all must be met before Document Remediation Wave begins):**

| # | Condition | Status |
|---|---|---|
| 1 | Project Owner approves this Change Proposal | Pending |
| 2 | Project Owner approves monthly LLM cost budget cap | `COST_OR_CREDENTIAL_DECISION_REQUIRED` |
| 3 | Architecture Team selects Python Worker framework and packaging | `TECHNICAL_DECISION_REQUIRED` |
| 4 | Architecture Team selects Python AST stack | `TECHNICAL_DECISION_REQUIRED` |
| 5 | Architecture Team selects TS/JS analyzer integration pattern | `TECHNICAL_DECISION_REQUIRED` |
| 6 | Legal Team begins source validation (vbpl.vn, vanban.chinhphu.vn) | `SOURCE_VALIDATION_REQUIRED` |
| 7 | Team capability assessment: Python Worker, pgvector, legal corpus skills | `TEAM_CAPABILITY_REQUIRED` |

**No-Go blockers (must not proceed if any is unresolved):**
- Real LLM provider credentials unavailable before acceptance run.
- Legal sources inaccessible and no validated alternative defined.
- Python Worker developer capability absent and no acquisition plan.
- Corpus approval process has no defined owner.

**Not a blocker for Document Remediation start:**
- Final LLM model selection (can be deferred to Wave E).
- Exact pgvector index parameters (can be decided during Wave D).
- Object storage provider (can be decided during Wave E).
- Source ingestion implementation (can be decided during Wave C).

---

## ADR Impact Classification Table

| ADR | Impact |
|---|---|
| ADR-001 (monolith-first) | `RETAINED` |
| ADR-002 (separate worker runtime) | `PARTIALLY_SUPERSEDED` — TypeScript-first scanner worker superseded; Python Worker is new owner; NestJS API and other workers retained |
| ADR-003 (Manager-led workflow) | `RETAINED` |
| ADR-004 (evidence-first classification gate) | `RETAINED` |
| ADR-005 (hybrid evidence collection) | `RETAINED` — GitHub Repository Scan still sole active path |
| ADR-006 (no raw source to LLM) | `RETAINED` |
| ADR-007 (binary conflict routing) | `RETAINED` |
| ADR-008 (human technical attestation) | `RETAINED` |
| ADR-009 (orchestrator-controlled multi-agent) | `RETAINED` — Python Worker is new orchestration runtime for scan |
| ADR-010 (simplify MVP evidence to repo scan only) | `RETAINED` |
| ADR-011 (OAuth/OIDC login) | `RETAINED` |
| ADR-012 (Manager as super-role) | `RETAINED` |
| ADR-013 (post-MVP Developer delegation) | `RETAINED` |
| ADR-014 (AIUsageFlow as mandatory bridge) | `RETAINED` |
| ADR-015 (LLM Gateway as single boundary) | `RETAINED` |
| ADR-016 (temporary isolated workspace) | `RETAINED` — now applies to Python Worker workspace |
| ADR-017 (queue-based orchestrator) | `RETAINED` — Python Worker participates in same queue topology |
| ADR-018 (VerifiedProfile required before legal matching) | `RETAINED` |
| ADR-019 (Python syntax-only support) | `SUPERSEDED` — Python is now first-class in MVP |
| ADR-020 (LegalCorpusVersion immutability) | `RETAINED` — extended by source ingestion and approval requirements |
| ADR-021 (controlled L0-L4 flow analysis) | `RETAINED` |
| ADR-022 (TypeScript-first npm-only controlled prototype) | `SUPERSEDED` — Python Worker is scanner runtime owner |
| ADR-023 | `NEW` — Python Worker as scanner runtime |
| ADR-024 | `NEW` — real LLM provider mandatory |
| ADR-025 | `NEW` — legal corpus source architecture |
| ADR-026 | `NEW` — hybrid legal retriever |

---

## Approval Block

| Role | Name | Decision | Date |
|---|---|---|---|
| Project Owner | Project Owner | ✅ APPROVED | 2026-06-23 |
| Architecture Lead | [Architecture Lead] | ☐ APPROVED / ☐ REJECTED / ☐ CONDITIONAL | [date] |
| Legal Lead | [Legal Lead] | ☐ APPROVED / ☐ REJECTED / ☐ CONDITIONAL | [date] |

**Conditions or Notes:**

> Project Owner approved all decisions listed in Section 18 on 2026-06-23. Wave 0 Document Remediation authorized to begin immediately. Implementation Waves A–F proceed after Wave 0 completion and implementation readiness re-certification.

---

## Wave 0 Document Remediation — Completion Record

**Status:** `WAVE_0_COMPLETE`  
**Completed:** 2026-06-23  
**Authorized by:** Project Owner approval above

### Files Updated

| File | Action |
|---|---|
| `docs/product/prd.md` | MVP scope, in-scope, and out-of-scope sections updated for Python Worker, real LLM, and RAG |
| `docs/architecture/adr/adr-022-typescript-first-npm-only-controlled-prototype.md` | Status + Phase 5.2J Supersession Note added |
| `docs/architecture/adr/architecture-decision-records.md` | ADR-002/ADR-009/ADR-019 notes updated; ADR-023/024/025/026 entries appended |
| `docs/implementation/llm-gateway-implementation.md` | LLM mode defaults, locked decisions, and provider table updated per ADR-024 |
| `docs/implementation/scanner-implementation.md` | Fully rewritten as A-to-Z MVP authoritative build document |
| `docs/implementation/persistence-implementation.md` | Updated integration decisions and added Prisma models for Legal Source, Document, Chunk, Ingestion, and ModelRunMetadata |
| `docs/implementation/queue-implementation.md` | Added Legal Source Ingestion and Embedding Build queues, and mapped scanner queue to Python Worker |
| `docs/implementation/backend-implementation.md` | Updated local integration defaults and command contracts for Python Worker and real LLM |
| `docs/implementation-readiness-certification.md` | Updated integration decisions (scanner runtime, LLM, legal corpus, storage) for Phase 5.2J |
| `docs/implementation-delivery-plan.md` | Updated Waves 3, 5, 6, 7 and added Wave 8 (A-to-Z Acceptance), with tasks mapped up to TASK-034 |
| `docs/specs/scanner-spec.md` | 6 targeted updates: Python first-class, Python Worker runtime, locked decisions, readiness |
| `docs/specs/legal-matching-domain-spec.md` | Appended Legal Corpus Ingestion, Approval Gate, and Hybrid pgvector Retriever specs |
| `docs/specs/functional-requirements.md` | Updated FR-018 and FR-032; appended FR-053 through FR-056 |
| `docs/specs/requirements-baseline.md` | Updated FR-066 mapping and appended mappings for FR-079 through FR-082 |
| `docs/specs/acceptance-criteria-catalog.md` | Appended AC-027 through AC-041 (happy path and 14 negative-path scenarios) |
| `docs/specs/non-functional-requirements.md` | Appended NFR-033, NFR-034, and NFR-035 |
| `docs/specs/requirements-traceability-matrix.md` | Updated FR mappings and AC/NFR coverage tables; updated Orphan Check counts |

### Files Created

| File | Purpose |
|---|---|
| `docs/architecture/adr/adr-023-python-worker-scanner-runtime.md` | New ADR: Python Worker owns Repository Scan lifecycle |
| `docs/architecture/adr/adr-024-real-llm-provider-mvp-requirement.md` | New ADR: Real LLM provider mandatory for A-to-Z acceptance |
| `docs/architecture/adr/adr-025-legal-corpus-source-architecture.md` | New ADR: Legal corpus source hierarchy, ingestion, approval |
| `docs/architecture/adr/adr-026-hybrid-legal-retriever.md` | New ADR: Hybrid pgvector + FTS legal retriever |
| `docs/specs/python-scanner-spec.md` | New spec: Python FULL_STATIC scanner capability requirements |
| `docs/specs/legal-corpus-source-spec.md` | New spec: Legal corpus ingestion schema, approval process, corpus management |
| `docs/implementation/python-worker-implementation.md` | New implementation spec: Python Worker processes, dependencies, AST parsers, and node subprocess |
| `docs/implementation/legal-corpus-ingestion-implementation.md` | New implementation spec: Ingestion pipeline from source URLs and S3 snapshots |
| `docs/implementation/hybrid-retriever-implementation.md` | New implementation spec: Cosine similarity search, pgvector indexing, FTS configuration, and RRF |

### Next Step

Implementation Readiness Re-Certification using `docs/implementation/implementation-readiness-certification.md` against the Phase 5.2J A-to-Z MVP definition.

---

*End of Sprint Change Proposal SPRINT-CHANGE-PROPOSAL-5.2J*
