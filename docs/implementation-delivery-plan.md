# LCSP Implementation Delivery Plan

## Purpose

This document provides the engineering execution sequence for the controlled MVP prototype.

It is not backlog, sprint planning, story creation, task tracking, architecture creation or implementation specification. It defines build order, team ownership, dependencies and expected outputs.

## Delivery Principles

### Build Vertical Slices

Each wave should produce a runnable system slice with persisted state, audit events and contract checks before expanding breadth.

### Minimize Rework

Start with shared foundations: Prisma schema, outbox, audit, RBAC and queue contracts. Later teams build on stable contracts instead of inventing local variants.

### Preserve Traceability

Every implemented behavior must trace back to UC, FR, AC, domain spec and state machine references in `docs/specs/requirements-traceability-matrix.md`.

### Validate Contracts Early

DTO, queue, Prisma and state-machine contracts should be compiled and smoke-tested before complex AI/legal/document behavior is implemented.

## Team Model

### Platform Team

Responsible for:

- auth;
- organization;
- RBAC;
- audit;
- PostgreSQL/Prisma;
- RabbitMQ/outbox;
- local runtime and shared contracts.

### Assessment Team

Responsible for:

- assessment lifecycle;
- WizardProfile;
- Manager workspace state;
- repository connection API boundary.

### Scanner Team

Responsible for:

- repository snapshot;
- scan job;
- ParserRegistry;
- LanguageMapper;
- AST extraction;
- TechnicalEvidenceReport and scanner evidence.

### Intelligence Team

Responsible for:

- TechnicalProfile;
- AIUsageFlow;
- reconciliation;
- VerifiedProfile.

### Legal Team

Responsible for:

- legal corpus ingestion boundary;
- legal matching;
- citation coverage;
- classification guardrails and results.

### Reporting Team

Responsible for:

- gap analysis;
- document generation;
- document status;
- output guardrails and artifact metadata.

## Build Waves

### Wave 1: Foundations

Includes:

- PostgreSQL.
- Prisma.
- RabbitMQ.
- Outbox.
- Audit.
- RBAC.

Exit Criteria:

- Prisma baseline schema compiles and migrates locally.
- OutboxEvent can be written and published to RabbitMQ using canonical exchange/routing key.
- AuditEvent can be written for a state-changing action.
- Manager/Developer permission guard can deny a Developer Manager-only action.
- Local API/worker can start with no application secrets in logs.

### Wave 2: Assessment Core

Includes:

- Assessment.
- Wizard.
- Repository Connection.

Exit Criteria:

- Manager can create Assessment.
- Manager can submit WizardProfile.
- System can show readiness without risk level.
- GitHub repository connection metadata can be recorded separately from OAuth/OIDC login.
- Assessment state transitions are audited.

### Wave 3: Python Worker & Scanner Foundation

Includes:

- Standalone Python Worker process (`lcsp-scanner-worker`).
- Python AST/CST analysis stack (`ast`, `libcst`).
- TypeScript/JavaScript analyzer subprocess adapter.
- Ephemeral restricted repository workspaces.
- TechnicalEvidenceReport and scanner evidence metadata persistence.

Exit Criteria:

- Standalone Python Worker consumes `command.scan.requested.v1` and cleans up workspaces successfully.
- First-class Python AST extractor resolves imports, packages, functions, AI usage, and I/O tracking.
- TS/JS files analyzed via node subprocess and results normalized.
- TechnicalEvidenceReport generated with evidence refs and zero long-term raw source code persistence.
- `event.scan.completed.v1` or `event.scan.failed.v1` published via worker outbox.

### Wave 4: Intelligence Layer

Includes:

- TechnicalProfile.
- AIUsageFlow.
- Reconciliation.
- VerifiedProfile.

Exit Criteria:

- TechnicalProfile is derived from accepted TechnicalEvidenceReport.
- AIUsageFlow claims include evidence refs, confidence and uncertainty.
- Reconciliation creates conflict or VerifiedProfile.
- Unresolved conflict blocks classification.
- Manager resolution is separate from scanner evidence and audited.

### Wave 5: Legal Ingestion & RAG Layer

Includes:

- Legal Source Ingestion Worker (fetch, hash, snapshot).
- Corpus Review/Approval Gate workflow.
- pgvector + FTS index building.
- Hybrid Legal Retriever (keyword + semantic similarity).
- LegalMatchingWorker (VerifiedProfile matching).

Exit Criteria:

- Legal sources ingested from approved government URLs, snapshot as PDF/HTML in object storage, and hashed.
- Corpus items approved and locked into an immutable `LegalCorpusVersion`.
- Hybrid retrieval returns citation-backed matches filtering by effective date and corpus version.
- LegalMatchingWorker persists `LegalRuleMatch` records with citation coverage.

### Wave 6: Real LLM Gateway & Classification Layer

Includes:

- Real LLM Provider Integration (Gemini, Claude, or GPT).
- Timeout, token, and cost budget controls.
- Structured output (Zod schema) validation.
- Citation Guardrail enforcement.
- Risk Classification Worker.

Exit Criteria:

- Real LLM calls execute successfully via the LLM Gateway.
- System prompt templates versioned; input payloads contain redacted metadata only (ADR-006).
- Invalid LLM schema output triggers retry and then fails closed.
- RiskClassification result persists citation basis; missing citations fail closed.

### Wave 7: Reporting Layer & Hardening

Includes:

- Gap Analysis.
- Document Generation Worker.
- Real S3-compatible object storage integration.
- NFR verification (security, cleanup, redaction).
- Queue DLQ and retry behavior validation.

Exit Criteria:

- Gap analysis generated from valid classification basis.
- Final document generated using real LLM and saved to real object storage.
- Storage URLs generated with secure temp permissions.
- All NFRs (NFR-001..NFR-030) verified.

### Wave 8: A-to-Z Acceptance Run

Includes:

- Golden-path repository and legal corpus fixtures.
- 18-step happy-path verification.
- 14 negative-path scenarios validation.

Exit Criteria:

- Real Manager executes all 18 happy-path steps on real database, queue, storage, and LLM infrastructure.
- All 14 required negative-path scenarios pass and log expected failure codes.

## Dependency Graph

```text
Assessment
-> Repository
-> Scanner
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> VerifiedProfile
-> LegalMatching
-> Classification
-> DocumentGeneration
```

No alternative active MVP path bypasses this chain.

## Parallelization Opportunities

### Can Build in Parallel

| Workstream | Parallel With | Constraint |
|---|---|---|
| Auth/RBAC foundation | Prisma schema and audit foundation | Must share User/Organization/Role contracts. |
| RabbitMQ/outbox foundation | Prisma schema foundation | OutboxEvent schema must be stable. |
| Wizard UI/API | Repository connection API | Assessment model and Manager guard must exist. |
| Scanner parser foundation | Assessment core | Scanner can use local fixture inputs before GitHub integration. |
| Legal corpus ingestion boundary | Intelligence layer | Must wait for VerifiedProfile contract for full integration. |
| Document template shell | Classification worker | Must wait for classification/document guardrails for final output. |

### Cannot Build in Parallel

| Workstream | Blocked By | Reason |
|---|---|---|
| TechnicalProfile integration | Scanner evidence output | Requires TechnicalEvidenceReport and findings. |
| AIUsageFlow integration | TechnicalProfile | Requires profile and evidence refs. |
| VerifiedProfile | Reconciliation | Requires conflict/no-conflict outcome. |
| Classification | LegalMatching | Must not consume verified-profile-ready directly. |
| Final document generation | Classification and gap basis | Final output requires citations and no unresolved conflict. |

### Dependency Constraints

- Outbox and audit must exist before worker transitions are implemented.
- State-machine guards must be enforced before async worker chaining is enabled.
- Legal Matching must be implemented before Classification.
- Document Generation final output must wait for Classification and citation guardrails.

## First 30 Engineering Tasks

These are build-order tasks, not backlog stories or sprint tickets.

| Task | Purpose | Dependency | Owner Team | Expected Output |
|---|---|---|---|---|
| TASK-001 Create Prisma baseline schema | Establish physical persistence foundation. | None | Platform Team | Initial migration compiles. |
| TASK-002 Add Prisma client generation | Enable typed DB access. | TASK-001 | Platform Team | `db:generate` works locally. |
| TASK-003 Implement environment config loader | Centralize DB/queue/auth config. | None | Platform Team | Config module with redacted logging. |
| TASK-004 Implement AuditEvent writer | Persist audit events consistently. | TASK-001 | Platform Team | Audit writer service. |
| TASK-005 Implement OutboxEvent writer | Persist reference-only queue handoff. | TASK-001 | Platform Team | Outbox writer service. |
| TASK-006 Implement outbox publisher | Publish canonical messages to RabbitMQ. | TASK-005 | Platform Team | Publisher with lock/retry/published status. |
| TASK-007 Create RabbitMQ topology bootstrap | Declare exchanges, queues and DLQs. | TASK-006 | Platform Team | Local topology creation command/module. |
| TASK-008 Implement Manager/Developer RBAC guard | Enforce role boundaries. | TASK-001 | Platform Team | Guard denies Developer Manager-only actions. |
| TASK-009 Implement auth/session baseline | Support local authenticated actor context. | TASK-003, TASK-008 | Platform Team | Session/auth guard usable by API. |
| TASK-010 Implement Organization model/service | Create tenant boundary. | TASK-001, TASK-008 | Platform Team | Organization CRUD baseline. |
| TASK-011 Implement Assessment create API | Create Manager-owned assessment. | TASK-008, TASK-010 | Assessment Team | `POST /api/v1/assessments`. |
| TASK-012 Implement WizardProfile submit API | Persist WizardProfile. | TASK-011 | Assessment Team | WizardProfile submission and audit. |
| TASK-013 Implement readiness state projection | Show no-risk readiness status. | TASK-012 | Assessment Team | Readiness response without risk level. |
| TASK-014 Implement GitHub repository connection metadata | Record selected repository connection. | TASK-011, TASK-008 | Assessment Team | RepositoryConnection persistence. |
| TASK-015 Implement RepositorySnapshot metadata | Pin branch/commit metadata. | TASK-014 | Scanner Team | RepositorySnapshot record. |
| TASK-016 Implement ScanJob request API | Create idempotent ScanJob and outbox command. | TASK-015, TASK-005 | Scanner Team | `command.scan.requested.v1` outbox event. |
| TASK-017 Implement Python AST/CST Extractor | Extract imports, package, functions, and AI patterns from Python code. | None | Scanner Team | AST extractor unit tests pass. |
| TASK-018 Implement Node.js TS/JS Subprocess Adapter | Spawn TS/JS analyzer as subprocess in Python Worker. | None | Scanner Team | Subprocess communication tests pass. |
| TASK-019 Implement Python Worker scan handler | Consume scan command, manage ephemeral workspace, run extractors, handle cleanup. | TASK-016, TASK-017, TASK-018 | Scanner Team | Python Worker processes scan job. |
| TASK-020 Implement TechnicalEvidenceReport persistence | Persist report, findings, and coverage. | TASK-019 | Scanner Team | TechnicalEvidenceReport stored. |
| TASK-021 Implement TechnicalProfile worker | Aggregate accepted evidence into profile. | TASK-020 | Intelligence Team | `event.technical-profile.completed.v1`. |
| TASK-022 Implement AIUsageFlow worker | Generate evidence-backed usage claims. | TASK-021 | Intelligence Team | AIUsageFlow + claims persisted. |
| TASK-023 Implement Reconciliation & Conflict resolution | Create conflict or VerifiedProfile; provide resolution APIs. | TASK-022, TASK-008 | Intelligence Team | Conflict or VerifiedProfile output. |
| TASK-024 Implement Legal Source Ingestion Worker | Ingest legal PDF/HTML snapshot, content hash, and URLs from sources. | None | Legal Team | LegalSource & LegalDocument records saved. |
| TASK-025 Implement Corpus Approval Gate | Review and lock corpus items into immutable version. | TASK-024 | Legal Team | Approved LegalCorpusVersion created. |
| TASK-026 Implement pgvector + FTS indexing | Generate vector embeddings and full-text index for approved corpus items. | TASK-025 | Legal Team | Embeddings generated and indexed in DB. |
| TASK-027 Implement Hybrid Legal Retriever | FTS + pgvector hybrid query API with effective-date and version filters. | TASK-026 | Legal Team | Retrieval returns citation-backed matches. |
| TASK-028 Implement Legal Matching worker | Match VerifiedProfile against Retriever citations. | TASK-023, TASK-027 | Legal Team | LegalRuleMatch records persisted. |
| TASK-029 Implement Real LLM Gateway Integration | Integrate Gemini/Claude/GPT; timeout, token, cost controls, output validation. | TASK-003 | Platform Team | Real provider calls succeed. |
| TASK-030 Implement Risk Classification worker | Classification via real LLM with citation guardrails. | TASK-028, TASK-029 | Legal Team | ClassificationResult persisted. |
| TASK-031 Implement Gap Analysis worker | Generate gap analysis results from classification. | TASK-030 | Reporting Team | GapAnalysis output. |
| TASK-032 Implement Document Generation worker | Generate document using real LLM and store in real S3 storage. | TASK-030, TASK-031 | Reporting Team | GeneratedDocument saved in S3. |
| TASK-033 Run A-to-Z Happy Path Acceptance | Validate 18-step happy path using real infrastructure and golden fixtures. | TASK-011..TASK-032 | Platform/QA | Successful end-to-end run audit record. |
| TASK-034 Run Negative-Path Acceptance Tests | Validate all 14 negative-path scenarios and verify fail-closed behaviors. | TASK-033 | Platform/QA | Bounded failure and fallback behavior verified. |
