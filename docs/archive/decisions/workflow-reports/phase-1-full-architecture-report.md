# Phase 1 Full Architecture Report

## Scope

Phase 1 completed source-aligned implementation architecture design for the `LCSP - Conditional Implementation Documentation Branch`.

Operating mode:

```text
FULL_ARCHITECTURE_DESIGN_ONLY
```

This phase updated architecture guidance and implementation architecture contracts only. It did not create code, database schema code, backlog, epic, story, sprint, task or Phase 2 implementation documentation pack.

## Source Documents Used

- `docs/workflows/lcsp-conditional-implementation-documentation-branch.md`
- `docs/workflows/phase-0-checkpoint-review.md`
- `docs/workflows/phase-0-checkpoint-rerun-report.md`
- `docs/workflows/phase-1a-source-alignment-report.md`
- `docs/specs/implementation-contract.md`
- `docs/project/project-overview.md`
- `docs/product/prd.md`
- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/specs/state-machine.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/evidence-report-contract.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/legal-rule-citation-contract.md`
- `docs/security/source-code-privacy-policy.md`
- `docs/security/threat-model.md`
- `docs/implementation-readiness.md`

## Files Created

- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/repository-and-module-layout.md`
- `docs/workflows/phase-1-full-architecture-report.md`

## Files Updated

- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/architecture/architecture-decision-records.md`

## Runtime Architecture Decisions

| Decision | Result |
| --- | --- |
| Web/API/Worker boundary | Next.js Web calls NestJS API only; Web does not call Worker directly |
| Async workflow | API enqueues long-running work; Python Worker consumes Queue jobs |
| Orchestration | LangGraph Orchestrator owns workflow transitions, gate ordering, pause/resume and fail-closed behavior |
| OAuth/OIDC | Active MVP identity login boundary, separate from GitHub App repository access |
| GitHub App | Active MVP repository connection boundary for read-only Repository Scan |
| Evidence path | GitHub Repository Scan is the only active MVP technical evidence path |
| AIUsageFlow | Mandatory after TechnicalProfile and before Reconciliation and Legal Rule Matching |
| LLM calls | External model calls go only through LLM Gateway |
| Source privacy | Raw source workspace is isolated, temporary and excluded from LLM/audit logs |
| Auditability | Critical state transitions and node outcomes require audit events |

## Component Boundaries

- `apps/web` owns UI only and cannot call Worker, Queue, DB, Vector Store or LLM Provider directly.
- `apps/api` owns auth, RBAC, session, assessment state, repository connection, job creation and task/result APIs.
- `apps/worker` owns scanner execution, LangGraph workflow, evidence gates, AIUsageFlow, reconciliation, legal retrieval, classification, gap analysis and document generation jobs.
- `packages/contracts` owns shared API/event/evidence/AIUsageFlow/audit contracts.
- `packages/rules` owns deterministic gate and legal-rule matching interfaces.
- LLM provider SDK usage is isolated behind an LLM Gateway adapter.
- Raw repository source must not be persisted in application repositories, PostgreSQL, object storage long-term, LLM calls or ordinary audit logs.

## Manager-Owned MVP Flow Verification

Verified MVP flow:

```text
Manager signs in
-> Manager creates Assessment and WizardProfile
-> Manager connects GitHub Repository
-> Manager requests Repository Scan
-> TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> Manager Conflict Resolution Task if conflict exists
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
-> Citation Guardrail
-> Gap Analysis
-> Document Generation
-> Output Guardrail
-> Final Compliance Output
```

Developer is optional in MVP and does not block repository connection, scan, conflict resolution, VerifiedProfile creation, classification or document generation.

## OAuth/OIDC and GitHub App Separation

| Boundary | Purpose | Constraint |
| --- | --- | --- |
| OAuth/OIDC Login | Authenticate LCSP user identity and create LCSP session | Does not install GitHub App, does not grant repository access and does not grant scan permission |
| TOTP MFA | Additional LCSP authentication factor | Applies according to LCSP MFA policy after password/OAuth identity |
| GitHub App Connection | Grant selected read-only repository access for scan | Does not authenticate LCSP user identity |
| Repository Scan | Create TechnicalEvidenceReport from selected repo/branch/commit | Requires GitHub App connection and Manager authorization |

Enterprise SSO, SAML, SCIM, directory federation and domain-restricted organization login remain Future/Enterprise.

## Repository Scan Evidence Model

Active MVP technical evidence source:

```text
source_type = GITHUB_REPOSITORY_SCAN
```

Deferred/Future/Enterprise evidence paths:

- manual evidence submission;
- manual technical evidence JSON;
- Local/CI scanner report upload;
- CLI evidence submission;
- CI/CD evidence submission;
- API probing.

These paths are not part of the MVP main flow.

## AI Usage Flow Placement

Canonical placement:

```text
TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
```

AIUsageFlow must be evidence-backed and include purpose, input/output types, downstream action, affected subjects, human review, automation level, potential harm categories, evidence refs, confidence and uncertainty reasons.

Provider/model/framework detection alone cannot create legal risk classification. If usage purpose is unclear, final classification remains blocked or must route to traceable clarification/conflict resolution.

## LLM and Source Privacy Boundary

- Raw source code must not be sent to LLM.
- Raw source code must not be stored long-term.
- Full system prompts must not be stored by default.
- Secrets must be redacted before persistence, logs, evidence output or LLM calls.
- LLM calls go only through LLM Gateway.
- LLM Gateway records model/provider/version, prompt version, input ref and output hash, not raw source.
- Deterministic gates and citation guardrails override LLM output.

## ADRs Added or Updated

Updated:

- `ADR-003 - Manager-led workflow with optional Developer participation`
- `ADR-007 - Binary Conflict Routing with Scores as Supporting Signals`
- `ADR-010 - Simplify MVP Evidence Collection to Repository Scan Only`
- `ADR-011 - OAuth/OIDC Login as an Active MVP Authentication Capability`
- `ADR-012 - Manager as the MVP Super-Role and Final Conflict Resolver`
- `ADR-013 - Post-MVP Scoped Developer Permission Delegation`

Added:

- `ADR-014 - AI Usage Flow Analysis as Mandatory Bridge Before Legal Rule Matching`
- `ADR-015 - LLM Gateway as the Only External Model Invocation Boundary`
- `ADR-016 - Temporary Isolated Scanner Workspace and No Raw Source Retention`
- `ADR-017 - Queue-Based Orchestrator for Long-Running Compliance Workflows`
- `ADR-018 - VerifiedProfile Required Before Classification and Document Generation`

## Open Decisions

| Decision Required | Recommended Default | Impact if Unresolved |
| --- | --- | --- |
| Exact OAuth/OIDC provider | Provider-neutral OAuth/OIDC contract with one configured provider before release | Provider metadata and security fixtures remain conditional |
| Queue deployment topology | RabbitMQ-compatible job queue abstraction | Retry/dead-letter/scaling details remain conditional |
| Vector database production configuration | ChromaDB/vector-store abstraction with legal corpus version metadata | Retrieval tuning and failover remain conditional |
| Object-storage provider | S3-compatible object storage contract | Retention, encryption and backup details remain provider-specific |
| LLM provider selection | External provider behind LLM Gateway | Model limits, retry and cost controls remain conditional |
| Hosting/container deployment target | Provider-neutral container/runtime design | Network/security zones remain conditional |
| Scan sandbox technology | Isolated ephemeral scanner workspace | Concrete isolation and cleanup controls remain conditional |
| Legal-corpus ingestion/update approval process | Human-approved versioned corpus with citation metadata | Corpus poisoning and outdated-law controls remain conditional |

These are decisions required before implementation execution or detailed Phase 2 handoff, not blockers for Phase 1 architecture documentation.

## Architecture Quality Check Results

| ID | Check | Result |
| --- | --- | --- |
| P1-AQ-01 | OAuth/OIDC login and GitHub App connection are distinct boundaries | PASS |
| P1-AQ-02 | Manager alone completes the full MVP path | PASS |
| P1-AQ-03 | Developer is not in any MVP-required sequence | PASS |
| P1-AQ-04 | Developer delegation is only Post-MVP | PASS |
| P1-AQ-05 | Repository Scan is the only active MVP technical evidence source | PASS |
| P1-AQ-06 | API Probing is not inserted into MVP flow | PASS |
| P1-AQ-07 | AIUsageFlow is after TechnicalProfile and before Reconciliation | PASS |
| P1-AQ-08 | Classification cannot start before VerifiedProfile | PASS |
| P1-AQ-09 | Missing citation, insufficient evidence, unclear usage purpose and unresolved conflict block appropriate outputs | PASS |
| P1-AQ-10 | Worker is asynchronous and API remains responsive | PASS |
| P1-AQ-11 | Long-running tasks use queue/job semantics | PASS |
| P1-AQ-12 | Raw source is isolated, temporary and excluded from LLM/audit logs | PASS |
| P1-AQ-13 | LLM invocation exists only behind LLM Gateway | PASS |
| P1-AQ-14 | Critical path transitions have audit requirements | PASS |
| P1-AQ-15 | No implementation code, backlog, story, sprint or task created | PASS |
| P1-AQ-16 | Readiness remains unchanged | PASS |

## Explicitly Blocked Activities

The following remain blocked:

- implementation backlog creation;
- epic/story creation;
- sprint planning;
- source code generation;
- database schema code generation;
- API implementation code generation;
- Dockerfile or CI/CD YAML generation;
- Phase 2 technical documentation pack;
- readiness status change.

## Decision

```text
PHASE_1_FULL_ARCHITECTURE_COMPLETED_WITH_DECISIONS_REQUIRED
```

Phase 1 architecture outputs are complete at design/spec level. Open technical decisions are documented and do not authorize implementation planning or backlog creation.

Next allowed action:

```text
bmad-checkpoint-preview
```

for Phase 1 architecture review only.

# Phase 1 Architecture Checkpoint Review

## Review Scope

Reviewed Phase 1 architecture outputs and source-of-truth documents:

- `docs/workflows/lcsp-conditional-implementation-documentation-branch.md`
- `docs/workflows/phase-0-checkpoint-rerun-report.md`
- `docs/workflows/phase-1-full-architecture-report.md`
- `docs/specs/implementation-contract.md`
- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/repository-and-module-layout.md`
- `docs/specs/state-machine.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/legal-rule-citation-contract.md`
- `docs/security/source-code-privacy-policy.md`
- `docs/security/threat-model.md`
- `docs/implementation-readiness.md`

## Criteria Results

| ID | Result | Evidence | Required Fix |
|---|---|---|---|
| P1-01 | PASS | `docs/implementation/system-runtime-and-component-contracts.md:8` defines Manager -> Web -> API -> Queue -> Worker -> Orchestrator topology. | None |
| P1-02 | PASS | `docs/implementation/repository-and-module-layout.md:10` says API does not execute long-running scans/classifications inline; `docs/implementation/system-runtime-and-component-contracts.md:114` repeats the async boundary. | None |
| P1-03 | PASS | `docs/implementation/implementation-scope-and-invariants.md:96` separates OAuth/OIDC login, TOTP MFA, GitHub App connection and Repository Scan. | None |
| P1-04 | PASS | `docs/implementation/implementation-scope-and-invariants.md:76` states Manager can complete full MVP without Developer assignment. | None |
| P1-05 | PASS | `docs/implementation/implementation-scope-and-invariants.md:91` states Developer is optional; `docs/architecture/architecture-decision-records.md:752` confirms MVP does not require Developer delegation. | None |
| P1-06 | PASS | `docs/implementation/implementation-scope-and-invariants.md:114` states active MVP evidence must be scanner-generated from GitHub Repository Scan. | None |
| P1-07 | PASS | `docs/implementation/implementation-scope-and-invariants.md:128` defines `TechnicalProfile -> AI Usage Flow Analysis -> Reconciliation -> VerifiedProfile`. | None |
| P1-08 | PASS | `docs/implementation/system-runtime-and-component-contracts.md:80` assigns next-state decision, pause/resume and blocking reason to LangGraph Orchestrator. | None |
| P1-09 | PASS | `docs/implementation/implementation-scope-and-invariants.md:141` says Risk Classification must not run before VerifiedProfile. | None |
| P1-10 | PASS | `docs/implementation/system-runtime-and-component-contracts.md:185` lists insufficient evidence, unclear AIUsageFlow, unresolved conflict and missing citation blocking/degraded outcomes. | None |
| P1-11 | PASS | `docs/implementation/system-runtime-and-component-contracts.md:109` makes LLM Gateway the sole model boundary; `docs/implementation/implementation-scope-and-invariants.md:182` excludes raw source, full prompts and secrets. | None |
| P1-12 | PASS | `docs/implementation/system-runtime-and-component-contracts.md:72` says scanner owns temporary raw workspace only; `docs/implementation/repository-and-module-layout.md:132` says scanner uses isolated ephemeral workspace. | None |
| P1-13 | PASS | ADR coverage includes `ADR-010`, `ADR-014`, `ADR-015`, `ADR-016`, `ADR-017` and `ADR-018` for evidence path, AIUsageFlow, LLM Gateway, scanner workspace, queue orchestration and VerifiedProfile gate. | None |
| P1-14 | PASS | `docs/implementation/implementation-scope-and-invariants.md:216` provides recommendation, impact, owner and timing for unresolved decisions. | None |
| P1-15 | PASS | `docs/workflows/phase-1-full-architecture-report.md:219` explicitly blocks code, backlog, story, sprint, Dockerfile and CI/CD YAML generation; file scan found only the three allowed implementation architecture docs. | None |
| P1-16 | PASS | `docs/implementation-readiness.md:6` retains the required readiness statuses; Phase 1 outputs do not unlock backlog. | None |

## Open Decision Classification

| Decision | Classification | Recommended Default | Owner | Required Before |
|---|---|---|---|---|
| Exact OAuth/OIDC provider | CONFIGURATION_DECISION | Provider-neutral OAuth/OIDC contract with one configured provider before release | Product + Security + Architecture | Implementation execution / release configuration |
| Queue deployment topology | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | RabbitMQ-compatible job queue abstraction | Architecture + DevOps | Implementation execution |
| Vector database production configuration | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | ChromaDB/vector-store abstraction with legal corpus version metadata | Architecture + Legal/RAG owner | Implementation execution after A2 direction |
| Object-storage provider | CONFIGURATION_DECISION | S3-compatible object storage contract | Architecture + DevOps + Security | Implementation execution / deployment configuration |
| LLM provider selection | CONFIGURATION_DECISION | External provider behind LLM Gateway | Architecture + Security | Implementation execution / provider configuration |
| Hosting/container deployment target | CONFIGURATION_DECISION | Provider-neutral container/runtime design | Architecture + DevOps | Deployment planning before implementation execution |
| Scan sandbox technology | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Isolated ephemeral scanner workspace | Security + Architecture | Implementation execution |
| Legal-corpus ingestion/update approval process | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Human-approved versioned corpus with citation metadata | Legal/Product + Architecture | Implementation execution after A2 validation direction |

No open decision blocks Phase 2 technical documentation because each has an adapter/configuration boundary or can be documented as an implementation-time decision without inventing a vendor/platform.

## Remaining Architecture Risks

- A1, A2, A2-b and A3 validation remain required before implementation backlog can open.
- AIUsageFlow confidence thresholds remain dependent on A2-b validation.
- Legal corpus coverage, citation schema and ingestion governance remain dependent on A2 validation.
- Scanner sandbox technology must be selected before implementation execution to prove source privacy invariants.
- Queue retry/idempotency, LLM provider configuration and deployment topology need Phase 2-level documentation but do not block Phase 2.

## Decision

```text
PHASE_1_ARCHITECTURE_PASS_WITH_DECISIONS_REQUIRED
```

```text
PHASE_2_TECHNICAL_IMPLEMENTATION_DOCUMENTATION_ALLOWED
```

This permits only `bmad-agent-tech-writer` for Phase 2 documentation work. It does not permit implementation backlog creation, epic/story creation, sprint planning, code generation or development execution.
