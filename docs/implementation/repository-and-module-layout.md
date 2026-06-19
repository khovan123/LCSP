# LCSP Repository and Module Layout

## Purpose

Tài liệu này mô tả logical repository/module layout cho LCSP ở mức implementation architecture. Nó không tạo source tree, package, code hoặc backlog.

## Layout Principles

- Modular boundaries must follow product/architecture invariants.
- Web does not call Worker directly.
- API does not execute long-running scans or classifications inline.
- API enqueues jobs.
- Worker consumes jobs.
- Worker runs the Orchestrator.
- Orchestrator invokes bounded nodes.
- LLM calls go only through LLM Gateway.
- Scanner uses an isolated ephemeral repository workspace.
- Raw source is cleaned after scan according to privacy policy.

## Suggested Areas and Ownership

| Area | Suggested Module or Service | Responsibility | Main Dependencies | Data Ownership |
| --- | --- | --- | --- | --- |
| `apps/web` | Next.js Web Application | Manager Workspace, optional Developer Workspace, auth UI, assessment UX, evidence/reconciliation/classification/report views | API, OAuth redirect/callback UX, UI package | UI state only; no authoritative compliance state |
| `apps/api` | NestJS API | Auth/RBAC, assessment state, Wizard, repository connection, job creation, conflict task APIs, result retrieval | PostgreSQL, Queue, OAuth/OIDC provider, GitHub App, Object Storage | Assessment, user/session metadata, state transitions, API-facing contracts |
| `apps/worker` | Python Worker | Scanner jobs, evidence normalization, LangGraph Orchestrator, AIUsageFlow, Legal RAG, classification/document jobs | Queue, PostgreSQL, Object Storage, Vector Store, LLM Gateway, GitHub App access token via API/job context | Temporary job state; generated technical and agent outputs |
| `apps/worker/scanner` | Static Analysis Scanner Subsystem | Repository fetch/workspace lifecycle, inventory, parsing/analyzer orchestration, detector pipeline, evidence graph, findings/report generation and cleanup | Queue job refs, GitHub App scan access context, `scanner-rulesets`, PostgreSQL refs, redaction rules | Temporary scan-local workspace/graph; persisted findings metadata only |
| `apps/worker/ts-analyzer` | TypeScript Semantic Analyzer Sidecar | TS/JS import/symbol/call analysis using TypeScript Compiler API | Worker scanner, TypeScript Compiler API | Temporary semantic graph fragments only |
| `packages/contracts` | Shared contracts | DTO/schema contracts for API, events, evidence report, AIUsageFlow, audit metadata | API, Web, Worker | Contract definitions only |
| `packages/config` | Configuration contracts | Environment, feature flags, provider config, validation constraints | API, Worker, Web, infra | Config schemas; no secrets |
| `packages/shared` | Shared domain vocabulary | Status names, enums, role/permission constants, audit event names | API, Worker, tests | Shared constants/contracts |
| `packages/rules` | Rule metadata contracts | Legal rule/citation schema, rule matching metadata, hard guardrail definitions | Worker, API, legal corpus | Rule contract definitions; not full corpus lifecycle |
| `packages/ui` | Shared UI primitives | Common components for LCSP UI | Web | UI-only components |
| `infrastructure` | Deployment design artifacts | Environment topology, queue/storage/db/vector dependencies, secret boundaries | API, Worker, Web | IaC design docs only in this branch |
| `test-fixtures` | Design-level fixtures | Validation fixtures for OAuth, Repository Scan, AIUsageFlow, legal matching, gates | QA docs, future tests | Fixture descriptions only |
| `legal-corpus` | Versioned legal corpus artifact area | Legal documents/rules/citations for retrieval and traceability | Worker/RAG, Legal Rule Matching | Legal documents, rule metadata, citation versions |
| `scanner-rulesets` | Scanner rule metadata area | Static analysis rules, signal taxonomy mapping, scanner versions | Worker/scanner, evidence contract | Scanner ruleset metadata |

## Phase 1 Recommended Logical Layout

This table is the canonical Phase 1 module dependency view. It describes logical areas only; it does not create source code, package manifests or repository folders.

| Area | Suggested Location | Responsibility | Allowed Dependencies | Forbidden Dependencies |
| --- | --- | --- | --- | --- |
| Web frontend | `apps/web` | Next.js UI for Login, OAuth/OIDC callback, TOTP challenge, Manager Workspace, optional Developer collaborator views, assessment workflow, report/audit views | `apps/api` HTTP API, `packages/contracts`, `packages/ui`, `packages/config` public config | Direct Worker, Queue, PostgreSQL, Vector Store, LLM Provider, raw GitHub App token, raw repository source |
| API backend | `apps/api` | NestJS API for auth/session/RBAC, OAuth/OIDC, MFA, assessment state, GitHub App connection, job creation, task/result APIs and audit-facing state transitions | PostgreSQL, Queue, Object Storage metadata, OAuth/OIDC provider, GitHub App integration, `packages/contracts`, `packages/shared`, `packages/config` | Scanner parsing logic, LangGraph workflow execution, long-running classification/document generation inline, direct LLM provider SDK usage outside LLM Gateway |
| Worker runtime | `apps/worker` | Python Worker for queue jobs, scanner execution, LangGraph Orchestrator, evidence gates, AIUsageFlow, reconciliation, legal RAG, classification, document generation and audit node writes | Queue, PostgreSQL refs, Object Storage, GitHub scan access context, Vector Store, LLM Gateway adapter, `packages/contracts`, `packages/rules`, `scanner-rulesets` | UI/authentication controller logic, browser session handling, OAuth callback controller ownership, organization membership management UI |
| Static scanner subsystem | `apps/worker/scanner` | Static-only repository scan pipeline, workspace manager, inventory analyzer, manifest/config analyzer, Tree-sitter generic parser, Python semantic analyzer, detector pipeline, NetworkX evidence graph, findings/report generator, redaction and cleanup controller | Worker job context, temporary workspace, `scanner-rulesets`, Tree-sitter, Python `ast`, NetworkX, PostgreSQL metadata adapter | Customer code execution, package install/build/test execution, Docker/CI/script execution, API probing, legal classification, direct LLM provider calls |
| TypeScript semantic analyzer | `apps/worker/ts-analyzer` | Restricted Node.js analyzer process or sidecar using TypeScript Compiler API for TS/JS semantic resolution | Static scanner subsystem, TypeScript Compiler API, file refs from temporary workspace | Running project scripts, installing dependencies, starting app services, persisting raw source or full AST bodies |
| Shared contracts | `packages/contracts` | API DTOs, async event envelopes, TechnicalEvidenceReport, AIUsageFlow, audit metadata and result contracts | Consumed by Web/API/Worker/tests | Provider SDK implementations, runtime business services, raw secrets |
| Shared utilities | `packages/shared` | Shared vocabulary, enums, status names, role/permission constants, audit event names | Web/API/Worker/tests | Domain persistence ownership, provider-specific clients |
| Configuration contracts | `packages/config` | Environment variable schema, feature/config key contracts and provider configuration shape | Web/API/Worker/infra | Secret values, provider tokens, deployment-specific secret material |
| Deterministic rules | `packages/rules` | Schema/quality gate interfaces, rule metadata contracts, legal-rule matching interfaces, deterministic guardrail definitions | Worker, API validation, legal-corpus metadata | LLM free-form reasoning, UI components, provider secrets |
| UI components | `packages/ui` | Shared LCSP UI primitives and view components | `apps/web`, public design tokens | API state ownership, worker/runtime calls |
| Infrastructure design | `infra` | Deployment topology design, network zones, queues, DB/vector/object storage definitions, secret boundary docs | Architecture docs, deployment docs in later phases | Executable IaC in this Phase 1 branch, application source code |
| Legal corpus artifacts | `legal-corpus` | Versioned legal corpus, rule metadata and citation source artifacts | RAG/Legal Retrieval, `packages/rules` | Runtime user data, raw repository source |
| Scanner rulesets | `scanner-rulesets` | Static scanner rules, AI signal taxonomy mappings and scanner version metadata | Worker/scanner, evidence contracts | Legal conclusions, LLM prompts, UI code |
| Test fixtures | `test-fixtures` | Design-level fixtures for OAuth, scan, AIUsageFlow, legal matching and gate scenarios | QA docs and future tests | Executable test framework source in Phase 1 |
| Documentation | `docs` | Product, architecture, specs, design, QA, security and implementation guidance | Source-of-truth docs | Code, backlog, sprint artifacts |

## Phase 1 Dependency Rules

- `apps/web` must not call Worker directly.
- `apps/api` must not contain scanner parsing logic.
- `apps/worker` must not contain UI/authentication controller logic.
- `apps/worker/scanner` must be static-analysis only and must not execute customer code, install dependencies, run builds/tests, run Docker/CI workflows or probe APIs.
- `apps/worker/ts-analyzer` may use the TypeScript Compiler API for parsing/symbol/call analysis only; it must not execute project code or package scripts.
- `packages/contracts` owns shared API/event contracts.
- `packages/rules` owns deterministic gates and legal-rule matching interfaces.
- LLM provider SDK usage must be isolated behind an LLM Gateway adapter.
- Raw repository source workspace must not be persisted inside application repositories or PostgreSQL.
- NetworkX evidence graph exists only in the scan process; persisted graph data is normalized metadata, refs, hashes and paths.
- API enqueues jobs for scans, classification, gap analysis and document generation; Worker consumes them asynchronously.
- Scanner uses an isolated ephemeral workspace and persists only permitted report metadata, evidence refs, hashes and scanner output artifacts.
- OAuth/OIDC login modules and GitHub App repository integration modules remain separate boundaries.

## Logical Modules

| Logical Module | Primary Area | Responsibility |
| --- | --- | --- |
| Auth | `apps/api` | Password/OAuth session authentication and account lifecycle |
| OAuth/OIDC | `apps/api` | Provider login initiation, callback validation, safe identity linking |
| MFA | `apps/api` | TOTP setup, verification, reset policy and audit |
| Session | `apps/api` | LCSP session lifecycle, revocation and lockout |
| Profile | `apps/api`, `apps/web` | User profile and security settings |
| Organization | `apps/api` | Organization membership and Manager ownership context |
| Assessment | `apps/api` | Assessment creation, status and ownership |
| Wizard | `apps/api`, `apps/web` | WizardProfile collection and readiness-only state |
| GitHub App Integration | `apps/api` | Repository connection, read-only GitHub App installation boundary |
| Repository Scan | `apps/api`, `apps/worker` | Scan job creation and scanner execution |
| Repository Fetcher and Workspace Manager | `apps/worker/scanner` | Shallow clone selected repository at pinned commit and cleanup temporary workspace |
| Repository Inventory Analyzer | `apps/worker/scanner` | L0 language/manifest/config/route/schema inventory and coverage limits |
| Manifest and Config Analyzer | `apps/worker/scanner` | Static dependency/config/schema signal extraction |
| Tree-sitter Generic Parser | `apps/worker/scanner` | Generic syntax parsing and fallback structure |
| TypeScript Semantic Analyzer Sidecar | `apps/worker/ts-analyzer` | TS/JS import/symbol/call analysis with TypeScript Compiler API |
| Python Semantic Analyzer | `apps/worker/scanner` | Python `ast` plus import/module resolver |
| AI Invocation Detector | `apps/worker/scanner` | Provider/framework/model invocation signal detection |
| Input Flow Analyzer | `apps/worker/scanner` | Input category flow evidence fusion |
| Output and Decision Flow Analyzer | `apps/worker/scanner` | AI output and downstream action tracing |
| Human Review Detector | `apps/worker/scanner` | Human review signal detection and bounded absent-review evidence |
| Domain Context Fusion Engine | `apps/worker/scanner` | Business/domain signal fusion for AIUsageFlow inputs |
| Evidence Graph Builder | `apps/worker/scanner` | Scan-local NetworkX graph assembly and graph path refs |
| Evidence | `apps/worker`, `apps/api` | TechnicalEvidenceReport, findings, evidence metadata |
| AIUsageFlow | `apps/worker` | Usage-purpose analysis from TechnicalProfile and scanner signals |
| Reconciliation | `apps/api`, `apps/worker` | Conflict detection, Manager conflict task, VerifiedProfile readiness |
| VerifiedProfile | `apps/api`, `apps/worker` | Canonical profile for classification |
| Legal Corpus | `legal-corpus`, `packages/rules` | Versioned legal rules and citations |
| Legal Retrieval | `apps/worker` | RAG/vector retrieval of legal rules/citations |
| Risk Classification | `apps/worker` | Rule/citation-backed classification after VerifiedProfile |
| Citation Guardrail | `apps/worker` | Validate classification/gap/document legal claims have trace |
| Gap Analysis | `apps/worker` | Derive compliance gaps from classification and obligations |
| Document Generation | `apps/worker` | Generate report/readiness export when gates allow |
| Audit | `apps/api`, `apps/worker` | Append-oriented audit metadata for all critical transitions |
| Workflow Jobs | `apps/api`, `apps/worker` | Queue job lifecycle, retry/idempotency and status |
| Future Permission Delegation | `apps/api` | Scoped Developer `PermissionGrant` post-MVP design |

## Boundary Rules

### Web Boundary

- Web calls API only.
- Web does not call Worker, Queue, Vector Store, LLM Provider or GitHub App directly.
- Web must not store raw source, raw provider tokens or secrets.
- Web must show OAuth/OIDC Login as LCSP identity auth, not GitHub repository authorization.

### API Boundary

- API owns authenticated user/session/RBAC checks.
- API creates scan/classification/document jobs and records state.
- API must not run long-running scan/classification/document work inline.
- API must enforce Manager super-role and optional Developer delegated scope.
- API must not treat OAuth/OIDC identity as repository authorization.

### Worker Boundary

- Worker consumes queue jobs.
- Worker runs LangGraph Orchestrator.
- Worker invokes scanner, evidence gates, AIUsageFlow, RAG, classification, document generation and audit nodes through bounded contracts.
- Worker handles temporary repository workspace cleanup.

### LLM Boundary

- LLM calls go only through LLM Gateway.
- LLM Gateway receives sanitized structured data only.
- Raw source, full prompts and secrets do not enter LLM calls.
- LLM outputs are schema-validated and can be blocked/degraded by deterministic guardrails.

### Scanner Boundary

- Scanner uses isolated ephemeral repository workspace.
- Scanner creates a scan-local NetworkX evidence graph and persists only graph metadata, refs, hashes and paths.
- Scanner creates `TechnicalEvidenceReport`.
- Scanner does not make legal conclusions.
- Scanner does not execute customer code, installs, builds, tests, Docker, shell scripts, CI workflows or API probes.
- Scanner does not persist raw source long-term.
- Scanner output contains evidence refs, hashes, metadata and redacted findings.

## MVP Flow Ownership

| Step | Owner Module | Actor / Runtime |
| --- | --- | --- |
| Sign in | Auth/OAuth/MFA | Manager via Web/API |
| Create assessment | Assessment | Manager |
| Complete WizardProfile | Wizard | Manager |
| Connect GitHub repository | GitHub App Integration | Manager |
| Run Repository Scan | Repository Scan / Jobs | Manager -> API -> Queue -> Worker |
| Create TechnicalEvidenceReport | Scanner | Worker |
| Schema/Quality Gates | Evidence | Worker/API status |
| Build TechnicalProfile | Evidence | Worker |
| Generate AIUsageFlow | AIUsageFlow | Worker |
| Reconciliation | Reconciliation | Worker/API |
| Resolve conflict | Reconciliation | Manager |
| Build/approve VerifiedProfile | VerifiedProfile | Worker/API + Manager |
| Retrieve legal rules | Legal Retrieval | Worker |
| Classify risk | Risk Classification | Worker |
| Generate gap/report | Gap/Document | Worker |
| Audit | Audit | API/Worker |

## Future / Enterprise Modules

These modules may be represented in docs but are not active MVP main flow:

- Local/CI evidence upload.
- Manual technical evidence JSON upload.
- CLI/CI evidence submission.
- API probing.
- Enterprise SSO/SAML/SCIM/directory federation.
- Legal corpus authoring/admin workflow.
- Automated reassessment after legal updates.

## Traceability

| Concern | Reference |
| --- | --- |
| Canonical contract | `docs/specs/implementation-contract.md` |
| API contract | `docs/specs/api-contract-draft.md` |
| Domain/data model | `docs/specs/domain-model.md`, `docs/specs/data-model-draft.md` |
| Evidence contract | `docs/specs/evidence-report-contract.md` |
| AIUsageFlow | `docs/specs/ai-usage-flow-analysis-spec.md` |
| Reconciliation | `docs/specs/reconciliation-policy.md` |
| Security/privacy | `docs/security/source-code-privacy-policy.md` |
