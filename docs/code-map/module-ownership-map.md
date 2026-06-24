# Module Ownership Map

## Purpose

Define top-level engineering ownership for the A-to-Z runnable MVP. This map is authoritative for planned module boundaries before code is created.

## API Modules

| Module | Purpose | Dependencies | Owned DTOs | Owned Tables | Owned Queues | Owned APIs | Authoritative Docs |
|---|---|---|---|---|---|---|---|
| `auth` | OAuth/OIDC, password/MFA session, and PBAC enforcement boundary. | OIDC provider, session, audit, policy evaluator. | Auth/session DTOs, authorization decision refs | `User`, `OrganizationMembership`, `AuthorizationDecision`, `AuditEvent` | None | `/api/v1/auth/*` | `implementation/backend-implementation.md` |
| `assessments` | Assessment lifecycle and state preconditions. | auth, audit, workflow state. | Assessment DTOs | `Assessment`, `AuditEvent` | None | `/api/v1/assessments/*` | `specs/assessment-lifecycle-spec.md` |
| `wizard` | Manager business declarations. | assessments, audit. | Wizard DTOs | `WizardProfile`, `AuditEvent` | None | `/api/v1/assessments/:assessmentId/wizard-profile` | `specs/user-task-flows.md` |
| `github` | GitHub App installation, repository selection, commit snapshot. | GitHub API, assessment, audit. | Repository DTOs | `RepositoryConnection`, `RepositorySnapshot` | None | repository connection/snapshot routes | `implementation/backend-implementation.md` |
| `scans` | Create trusted scan triggers/jobs and expose status. | assessment, repository connection, PBAC, outbox, audit. | Scan DTOs | `TrustedScanTrigger`, `ScanMappingResolution`, `RepositoryScanJob`, `OutboxEvent`, `AuditEvent` | produces `command.scan-trigger.resolve-context.v1`, `command.scan.requested.v1` | scan routes | `specs/scanner-spec.md` |
| `reconciliation` | Conflict query/resolution and VerifiedProfile query. | profiles, audit. | Conflict/VerifiedProfile DTOs | `ReconciliationConflict`, `VerifiedProfile`, `AuditEvent` | produces reconciliation command after resolution | reconciliation routes | `specs/assessment-lifecycle-spec.md` |
| `classification` | Classification status/result endpoints. | verified profile, legal matching, audit. | Classification DTOs | `RiskClassification`, `LegalRuleMatch`, `AuditEvent` | None | classification routes | `specs/legal-classification-spec.md` |
| `gap-analysis` | Gap result access. | classification, legal matches. | Gap DTOs | `GapAnalysis` | None | gap-analysis routes | `specs/document-generation-spec.md` |
| `documents` | Document request/status/download. | gap analysis, object storage, audit. | Document DTOs | `GeneratedDocument`, `OutboxEvent`, `AuditEvent` | produces `command.document.requested.v1` | document routes | `specs/document-generation-spec.md` |
| `audit` | Immutable audit query/export. | all modules. | Audit DTOs | `AuditEvent` | None | audit routes | `implementation/backend-implementation.md` |
| `platform-config` | LLM provider configuration references and budget policy. | secret manager, LLM Gateway. | Provider config DTOs | `ModelRunMetadata` | None | internal/admin configuration boundary | `implementation/llm-gateway-implementation.md` |

## Shared Packages

| Package | Purpose | Dependencies | Owned Contracts | Owned Tables | Queues | Authoritative Docs |
|---|---|---|---|---|---|---|
| `packages/contracts` | Shared DTOs, events, enums, schemas. | None | Cross-service contracts | None | Event envelopes | `code-map/shared-contracts-code-map.md` |
| `packages/ai-usage-flow` | Shared deterministic AIUsageFlow contracts/rules. | contracts, profile/finding contracts. | Flow/rule DTOs | None directly | AI usage commands/events | `specs/ai-usage-flow-domain-spec.md` |
| `packages/legal-rag` | Shared legal matching contracts. | contracts, persistence, LLM Gateway. | Retrieval/match DTOs | None directly | legal matching commands/events | `implementation/chromadb-vectorless-legal-retriever-implementation.md` |

`packages/scanner` is no longer the lifecycle-owning scanner package. The active scanner runtime is the standalone Python package below. A bounded Node.js TS/JS analyzer remains an adapter invoked by Python Worker.

## Python Worker Platform

| Module | Purpose | Dependencies | Owned Contracts | Owned Tables | Owned Queues | Authoritative Docs |
|---|---|---|---|---|---|---|
| `lcsp-scan-trigger-worker` | Resolve trusted trigger context, mapping states, idempotency and safe scan initiation. | Python 3.11+, RabbitMQ, PostgreSQL, PBAC service identity. | Trigger/mapping contracts | `TrustedScanTrigger`, `ScanMappingResolution`, `AuthorizationDecision` | consumes `command.scan-trigger.resolve-context.v1`; emits scan-trigger events | `specs/domain-state-machines.md`, `implementation/queue-implementation.md` |
| `lcsp-scanner-worker` | Own Repository Scan lifecycle, scanner toolchain, evidence graph/report, cleanup, and scan outbox events. | Python 3.11+, Syft, Knip, deptry, `ast`, `libcst`, Semgrep, tree-sitter/custom parser, RabbitMQ, PostgreSQL, Node analyzer CLI. | Scanner internal DTOs and normalized finding/dependency protocol | `SourceFile`, `PackageDependency`, `SBOMComponent`, `DependencyUsageFact`, `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding`, `TechnicalEvidenceReport`, `RepositoryScanJob` | consumes `command.scan.requested.v1`; emits scan completed/failed | `implementation/scanner-worker-implementation.md`, `implementation/scanner-implementation.md` |
| `ts-js-analyzer-cli` | Analyze TypeScript/JavaScript and emit normalized JSON facts to Python Worker. | Node.js, `ts-morph`. | TS/JS analyzer input/output schema | None directly | None | `implementation/scanner-implementation.md` |

## Worker Modules

| Worker | Runtime | Purpose | Owned Tables | Queue | Authoritative Docs |
|---|---|---|---|---|---|
| `scanner-worker` | Python | Repository scan lifecycle. | scanner evidence tables | `lcsp.scan-worker.v1` | `implementation/scanner-worker-implementation.md` |
| `technical-profile-worker` | Python | Build TechnicalProfile. | `TechnicalProfile` | `lcsp.technical-profile-worker.v1` | `developer-execution-blueprints/technical-profile-blueprint.md` |
| `ai-usage-flow-worker` | Python | Build AIUsageFlow. | `AIUsageFlow`, `AIUsageFlowClaim` | `lcsp.ai-usage-flow-worker.v1` | `specs/ai-usage-flow-domain-spec.md` |
| `reconciliation-worker` | Python | Create conflicts or VerifiedProfile. | `ReconciliationConflict`, `VerifiedProfile` | `lcsp.reconciliation-worker.v1` | `developer-execution-blueprints/reconciliation-blueprint.md` |
| `legal-ingestion-worker` | Python | Fetch, hash, normalize, and stage legal sources. | `LegalSource`, `LegalDocument`, `LegalCorpusItem` | `lcsp.legal-source-ingest.v1` | `implementation/legal-corpus-ingestion-implementation.md` |
| `legal-index-worker` | Python | Build ChromaDB structure-first vectorless legal index for approved corpus. | `LegalDocumentChunk`, `RetrievalAuditLog` metadata | `lcsp.legal-index-build.v1` | `implementation/chromadb-vectorless-legal-retriever-implementation.md` |
| `legal-matching-worker` | Python | Retrieve and persist LegalRuleMatch. | `LegalRuleMatch`, `RetrievalAuditLog` | `lcsp.legal-matching-worker.v1` | `implementation/chromadb-vectorless-legal-retriever-implementation.md` |
| `classification-worker` | Python | Citation-gated classification. | `RiskClassification`, `ModelRunMetadata` | `lcsp.classification-worker.v1` | `specs/legal-classification-spec.md` |
| `gap-analysis-worker` | Python | Generate gap analysis. | `GapAnalysis` | `lcsp.gap-analysis-worker.v1` | `specs/document-generation-spec.md` |
| `document-worker` | Python | Generate and store documents. | `GeneratedDocument`, `ModelRunMetadata` | `lcsp.document-worker.v1` | `specs/document-generation-spec.md` |

## Ownership Rules

- Python Scanner Worker is the sole consumer of `command.scan.requested.v1`.
- Python Worker Platform owns all asynchronous domain workload consumers.
- NestJS API owns job/trigger creation, PBAC enforcement boundary, query surfaces, and orchestration projections; it does not execute repository scans or other long-running domain workloads.
- Internal Legal Operator actions are internal API/CLI operations for MVP, not Manager/Developer product modules.
- Outbox writes occur in the same transaction as state-changing domain writes.
- No module may call an external LLM provider outside the LLM Gateway.
- If a planned module is absent from this map, update this map before creating it.
