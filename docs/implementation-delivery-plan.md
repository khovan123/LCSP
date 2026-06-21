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

### Wave 3: Scanner Foundation

Includes:

- Snapshot.
- ScanJob.
- ParserRegistry.
- LanguageMapper.
- AST extraction.
- TechnicalEvidenceReport.

Exit Criteria:

- RepositorySnapshot metadata is persisted.
- ScanJob can be requested idempotently.
- ParserRegistry, LanguageMapper and TreeSitterAstExtractor pass scanner foundation tests.
- TechnicalEvidenceReport is created with evidence refs and no raw source persistence.
- `event.scan.completed.v1` or `event.scan.failed.v1` is emitted through outbox.

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

### Wave 5: Legal Layer

Includes:

- Legal Matching.
- Classification.

Exit Criteria:

- Legal matching consumes VerifiedProfile only.
- LegalRuleMatch records include citation coverage.
- Classification consumes legal matching completed event, not verified-profile-ready directly.
- Missing citation, provider-only evidence, unknown critical usage or unresolved conflict blocks/degrades classification.

### Wave 6: Reporting Layer

Includes:

- Gap Analysis.
- Document Generation.

Exit Criteria:

- Gap analysis is generated only from valid/degraded classification basis.
- Final document generation blocks on missing citation or unresolved conflict.
- GeneratedDocument metadata includes artifact ref/hash when generated.
- Readiness-only output contains no risk level.

### Wave 7: Hardening

Includes:

- NFR verification.
- Observability.
- Security review.
- Audit review.

Exit Criteria:

- NFR-001..NFR-030 have implementation evidence or explicit release blockers.
- Queue DLQ/retry behavior is verified.
- Secret/source/prompt redaction is verified.
- Audit export is redacted and traceable.
- End-to-end smoke path passes from assessment creation to document blocked/generated state.

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
| TASK-017 Implement ParserRegistry | Register scanner parser adapters. | None | Scanner Team | ParserRegistry unit tests pass. |
| TASK-018 Implement LanguageMapper | Map file metadata to language/support level. | None | Scanner Team | LanguageMapper unit tests pass. |
| TASK-019 Implement TreeSitterAstExtractor | Extract parsed facts without raw source persistence. | TASK-017, TASK-018 | Scanner Team | AST extractor unit tests pass. |
| TASK-020 Implement scanner evidence ref factory | Create metadata-only evidence refs. | TASK-019 | Scanner Team | Evidence refs generated from parsed facts. |
| TASK-021 Implement scan worker handler | Consume scan command and orchestrate scan. | TASK-016, TASK-017..TASK-020 | Scanner Team | Scan worker creates report or failed event. |
| TASK-022 Implement TechnicalEvidenceReport persistence | Persist report, findings and coverage. | TASK-021 | Scanner Team | TechnicalEvidenceReport stored. |
| TASK-023 Implement TechnicalProfile worker | Aggregate accepted evidence into profile. | TASK-022 | Intelligence Team | `event.technical-profile.completed.v1`. |
| TASK-024 Implement AIUsageFlow worker | Generate evidence-backed usage claims. | TASK-023 | Intelligence Team | AIUsageFlow + claims persisted. |
| TASK-025 Implement Reconciliation worker | Create conflict or VerifiedProfile. | TASK-024 | Intelligence Team | Conflict or VerifiedProfile output. |
| TASK-026 Implement Manager conflict resolution API | Resolve open conflicts with audit trail. | TASK-025, TASK-008 | Intelligence Team | Conflict resolution and reconciliation resume. |
| TASK-027 Implement Legal Matching worker | Match VerifiedProfile to citation-backed rules. | TASK-025 | Legal Team | LegalRuleMatch records and completed/failed event. |
| TASK-028 Implement Classification worker | Produce completed or blocked classification. | TASK-027 | Legal Team | ClassificationResult persisted. |
| TASK-029 Implement Gap Analysis worker | Generate gap result from classification basis. | TASK-028 | Reporting Team | GapAnalysis output. |
| TASK-030 Implement Document Generation worker | Generate or block final/readiness document. | TASK-028, TASK-029 | Reporting Team | GeneratedDocument metadata and event. |
