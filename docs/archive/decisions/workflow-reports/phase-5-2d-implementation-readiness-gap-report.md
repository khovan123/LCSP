# Phase 5.2D Implementation Readiness Gap Report

## Scope

Reviewed `docs/specs/`, `docs/architecture/`, `docs/implementation/`, `docs/developer-blueprints/`, `docs/implementation-artifacts/`, and existing build specs for implementation execution readiness. This is implementation-specification work only. No PRD, architecture, ADR, epic, story, backlog, validation plan, code, test source, CI/CD, Docker, or infrastructure artifact was created.

## Readiness Summary

Architecture, stories, developer blueprints, and construction guide were present, but developers still needed implementation playbooks and runtime build specifications with exact service ownership, packages, folders, DTOs, Prisma model ownership, queue payloads, algorithms, state transitions, failure behavior, and local verification steps.

## Gap Register

| Missing Item | Severity | Impact | Recommendation | Resolution |
|---|---|---|---|---|
| DTO contracts centralized by subsystem | High | Teams could create incompatible API/internal/event DTOs. | Add DTO examples in every playbook and build spec. | `docs/implementation-playbooks/`, `docs/build-specs/09-api-contract-build-spec.md` |
| Event contracts and queue payloads per component | High | Wrong routing keys, mutable payloads, or non-idempotent consumers. | Define exchanges, queues, routing keys, envelope, retry, DLQ, idempotency. | `03-rabbitmq-playbook.md`, `07-rabbitmq-build-spec.md` |
| Prisma model ownership and migration order | High | Missing FKs, indexes, outbox/audit immutability, or raw-source exclusion. | Define canonical model groups, constraints, migration order, retention. | `13-postgresql-playbook.md`, `08-postgresql-build-spec.md` |
| GitHub App implementation boundary | High | OAuth/OIDC login could be conflated with repository authorization. | Define GitHub App APIs, token handling, repository/commit validation. | `01-github-app-playbook.md` |
| Repository snapshot runtime flow | Medium | Workspace cleanup and source retention could be inconsistent. | Separate snapshot manifest, file hashes, workspace cleanup, and metadata persistence. | `02-repository-snapshot-playbook.md` |
| Scanner algorithm details | Critical | Scanner could overclaim runtime behavior or violate static-only safety. | Define Tree-sitter, ts-morph, graphology, detectors, findings, persistence, cleanup. | `04-scanner-playbook.md`, `01-scanner-build-spec.md` |
| TypeScript semantic-analysis decision | High | Wrapper/import/type resolution could diverge by team. | Use `ts-morph` over TypeScript Compiler API for prototype. | `05-typescript-semantic-analysis-playbook.md` |
| AIUsageFlow rules and confidence | Critical | Legal rule matching could use unsupported material claims. | Define claim ingestion, evidence-ref validation, deterministic rules, scoring, abstention. | `06-ai-usage-flow-playbook.md`, `02-ai-usage-flow-build-spec.md` |
| TechnicalProfile build path | High | Teams could skip schema/quality gates. | Define evidence gates, aggregation, and AIUsageFlow trigger. | `07-technical-profile-playbook.md` |
| Reconciliation and conflict immutability | Critical | Manager resolution could overwrite scanner evidence or bypass conflict. | Define ConflictRecord, ConflictResolution, VerifiedProfile, and blocked transitions. | `08-reconciliation-playbook.md` |
| Legal RAG citation boundary | High | Uncited or formal legal claims could be produced. | Define corpus metadata, retrieval, Citation Guardrail, non-claims. | `09-legal-rag-playbook.md` |
| Classification preconditions | Critical | Classification could run without VerifiedProfile or citations. | Define VerifiedProfile gate, conflict/evidence/citation blocks, event outputs. | `10-classification-playbook.md` |
| Document output guardrail | High | Documents could include uncited conclusions or production claims. | Define template/output guardrail/object-storage metadata/blocked behavior. | `11-document-generation-playbook.md` |
| Audit implementation boundary | High | Critical transitions could miss immutable audit. | Define audit DTO, redaction, append-only repository, and read API. | `12-audit-playbook.md` |
| API guard and transaction pattern | High | Controllers could bypass authz/state/outbox/audit requirements. | Define guard chain, error DTO, sync/async boundary, transaction pattern. | `14-api-gateway-playbook.md` |
| Local verification path | Medium | New developers may not run system consistently. | Define local services, env categories, startup order, and smoke path. | `15-local-development-playbook.md` |
| Manager end-to-end runtime | Critical | Teams could skip DB, queue, worker, audit, or UI transitions. | Define no-skipped-step golden path and permission matrix. | `16-manager-golden-path-playbook.md`, `10-manager-runtime-build-spec.md` |

## Preserved Constraints

- OAuth/OIDC login remains separate from GitHub App repository authorization.
- Manager remains the MVP super-role; Developer absence cannot block active MVP transitions.
- GitHub Repository Scan remains the only active MVP technical-evidence path.
- Scanner remains static-analysis only and never executes customer code.
- Classification requires VerifiedProfile.
- Unresolved conflict, insufficient evidence, unknown critical usage, or missing citation blocks/degrades output.
- Raw source, full prompts, secrets, and full AST bodies are excluded from LLM, ordinary audit logs, queues, and long-term persistence.

## Decision

IMPLEMENTATION_READINESS_GAPS_DOCUMENTED_FOR_PHASE_5_2D
