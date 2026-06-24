# Sprint Change Proposal: Phase 5.2L — PBAC, Python Worker Platform, Automatic Scan Initiation, and Scanner Toolchain Correction

**Project:** LCSP — Legal Compliance Support Platform  
**Repository:** `khovan123/LCSP`  
**Canonical branch:** `main`  
**Resolved `main` HEAD:** `73f47560a075fe7991ba2611a87f52abbe2e0496`  
**Expected baseline:** `73f47560a075fe7991ba2611a87f52abbe2e0496`  
**Inspected PR/branch:** `docs/add-vietnamese-condensed-guide` / PR #2 documentation branch  
**Date:** 2026-06-24  
**Workflow:** `bmad-correct-course`  
**Change classification:** `MAJOR_PRODUCT_SCOPE_AND_ARCHITECTURE_CORRECTION`  
**Approval scope requested:** documentation and planning remediation only  
**Not authorized by this proposal:** application code, tests, CI/CD, Docker, deployment files, UX, epics, stories, sprint status mutation, implementation tasks, archive rewrite, or sprint execution.

## 1. Change Classification and Rationale

This is a major scope and architecture correction because Project Owner decisions invalidate active product, requirements, architecture, ADR, implementation, queue, code-map, planning, and Vietnamese condensed documentation assumptions.

The current active baseline still contains these conflicting assumptions:

- RBAC/role permission language is treated as the authorization authority.
- Structured attestation remains an active optional MVP feature.
- `FR-050` remains Local/CI scanner report upload and `FR-051` remains future manual evidence JSON upload.
- Node.js downstream workers own TechnicalProfile, AIUsageFlow, reconciliation, legal ingestion/index, legal matching, classification, gap analysis, and document generation.
- The scanner pipeline is centered on `ast`, `libcst`, and `ts-morph` without the required Syft, Knip, deptry, Semgrep custom rules, and tree-sitter/custom parser stages.

The PR #2 branch adds `docs/planning-artifacts/phase-5-2l-project-owner-scope-runtime-correction.md` and `docs-vn/11-phase-5-2l.md`, which correctly record the new directive and explicitly state that active documents are not remediated yet.

## 2. Checklist Result

| Checklist area             | Status        | Result                                                                                      |
| -------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| Trigger and context        | Done          | Project Owner directive recorded in Phase 5.2L branch artifact.                             |
| Epic impact                | Done          | Canonical epics/stories are still missing; delivery waves and task candidates are impacted. |
| Artifact conflict analysis | Done          | Active non-archive docs across `docs/` and `docs-vn/` contain conflicts.                    |
| Path forward               | Done          | Hybrid major replan: approve documentation remediation before any implementation planning.  |
| Sprint Change Proposal     | Done          | This artifact is the proposal.                                                              |
| Final approval             | Action-needed | Requires explicit Project Owner approval before remediation starts.                         |

## 3. Supersession and Removal Register

| Item                                                     | Current active treatment                                                                                                | New classification          | Required remediation                                                                                                                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RBAC as authorization source of truth                    | Role/RBAC policy language in PRD, NFR, traceability, backend, delivery, code maps, `docs-vn`                            | `SUPERSEDED_FOR_ACTIVE_MVP` | Replace with PBAC as final authorization authority. Roles may remain only as subject attributes, grouping labels, or policy templates.                                           |
| Structured attestation                                   | Active optional MVP via `FR-045`, `FR-046`, `UC-018`, `AC-013`, business rules, domain model, task flows, delivery plan | `SUPERSEDED_FOR_ACTIVE_MVP` | Remove from active MVP use cases, FRs, ACs, BRs, task flows, entities, routes, DTOs, commands/events, audit/report dependencies, Manager/Developer UX, delivery tasks.           |
| Developer workflow retained solely for attestation       | Optional collaboration includes attestation task path                                                                   | `SUPERSEDED_FOR_ACTIVE_MVP` | Keep Developer collaboration only where independently valuable: repository assistance, scoped findings review, technical correction input that does not reintroduce attestation. |
| Compliance certification                                 | Appears as non-claim/out-of-scope wording in several docs                                                               | `REMOVED_FROM_PRODUCT`      | Remove from active scope, roadmap, future scope, requirements, UX, APIs, entities, stories, delivery plans. Historical/change-control docs may retain evidence.                  |
| Formal legal opinion                                     | Product boundary says LCSP is not legal advice/opinion                                                                  | `REMOVED_FROM_PRODUCT`      | Remove as product concept, including future/out-of-scope framing. Keep only historical evidence where needed.                                                                    |
| Direct regulator submission                              | Listed as out of MVP/future-like exclusion                                                                              | `REMOVED_FROM_PRODUCT`      | Remove from active/future product surfaces; do not retain as roadmap item.                                                                                                       |
| `FR-051` manual technical evidence JSON upload           | Deferred future FR                                                                                                      | `REMOVED_FROM_PRODUCT`      | Remove FR/UC/BR/AC/traceability/API/entity/task references from active product docs; historical records remain.                                                                  |
| `FR-050` Local/CI scanner report upload                  | Deferred future FR                                                                                                      | `SUPERSEDED_FOR_ACTIVE_MVP` | Replace with `AUTOMATIC_TRUSTED_SCAN_INITIATION`; no manual scanner report upload UI/API.                                                                                        |
| Node.js downstream domain workers                        | Active ADR/queue/code-map ownership                                                                                     | `SUPERSEDED_FOR_ACTIVE_MVP` | Replace with bounded Python Worker Platform consumers/modules.                                                                                                                   |
| Scanner toolchain limited to `ast`, `libcst`, `ts-morph` | Active scanner spec and implementation docs                                                                             | `SUPERSEDED_FOR_ACTIVE_MVP` | Add Syft, Knip, deptry, Semgrep custom rules, tree-sitter/custom parser, contracts, guardrails, and failure semantics.                                                           |

## 4. Canonical Replacement UC/FR/AC Proposal

### Use Case Replacement

Replace the existing `UC-016 Re-run Assessment Evidence` dependency on deferred upload semantics with:

**UC-016 — Automatic Trusted Scan Initiation and Resume**

Goal: LCSP creates or resumes a pending scan workflow from trusted integration context without manual scanner report upload.

Primary actors/sources:

- GitHub App webhook.
- Scheduled integration trigger.
- Backend-issued trigger.
- Authorized Manager action where the action produces trusted context, not uploaded report content.

Required trusted context:

- organization ID;
- account ID where applicable;
- GitHub App installation ID;
- repository connection ID;
- repository ID;
- assessment ID where known;
- configured branch;
- commit SHA;
- trigger source;
- correlation ID.

### Functional Requirement Replacement

Replace `FR-050` with:

**FR-050 — Automatic Trusted Scan Initiation**

The system must create, resume, or safely block a pending repository scan workflow from trusted integration context. It must be tenant-scoped, PBAC-authorized, idempotent, auditable, safe under duplicate delivery, safe under out-of-order events, and safe under missing or ambiguous repository/account/assessment mapping.

Missing or ambiguous mapping must produce one of:

- `PENDING_MAPPING`;
- `BLOCKED_MAPPING`;
- `WAITING_FOR_CONTEXT`.

It must never scan the wrong repository, organization, account, or assessment.

### Acceptance Criteria Replacement

Add or replace acceptance coverage with:

| AC proposal | Acceptance outcome                                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-050A     | A trusted trigger with complete mapping creates or resumes one scan workflow for the correct tenant, repository, assessment, branch, and commit.           |
| AC-050B     | Duplicate delivery with the same idempotency key returns the existing workflow/job without duplicate artifacts.                                            |
| AC-050C     | Out-of-order trigger events wait for required mapping/context or safely no-op when superseded.                                                             |
| AC-050D     | Missing repository/account/assessment mapping creates `PENDING_MAPPING`, `BLOCKED_MAPPING`, or `WAITING_FOR_CONTEXT`; no scan starts.                      |
| AC-050E     | Ambiguous assessment mapping blocks and exposes a Manager-visible safe state with recovery action.                                                         |
| AC-050F     | Every decision records actor/service identity, organization, resource, action, policy ID, policy version, decision, safe context refs, and correlation ID. |

### Impact on Existing IDs

The remediation may keep the identifier `FR-050` only if it is fully redefined as `AUTOMATIC_TRUSTED_SCAN_INITIATION`. Any Local/CI scanner report upload semantics must be removed from active product authority.

## 5. PBAC Policy Model

PBAC is `PROJECT_OWNER_LOCKED`.

Authorization must evaluate:

- subject;
- organization;
- resource;
- action;
- request/runtime context;
- policy;
- policy version.

Required enforcement:

- deny-by-default;
- tenant-scoped;
- server-side enforced;
- versioned;
- auditable.

Required coverage:

- customer APIs;
- internal APIs;
- worker service identities;
- repository access;
- automatic scan triggers;
- assessment transitions;
- legal operations;
- document downloads;
- audit exports;
- administrative operations.

Every authorization decision must be traceable to:

- actor or service identity;
- organization;
- resource;
- action;
- policy ID;
- policy version;
- decision;
- safe context references;
- correlation ID.

Roles may remain only as:

- subject attributes;
- grouping labels;
- policy templates.

Roles must not be the final authorization source of truth.

## 6. Unresolved PBAC Engine Decision

The concrete PBAC engine, policy storage, cache, invalidation, evaluation topology, and failure behavior are `TECHNICAL_DECISION_REQUIRED`.

Do not assume OPA, Casbin, database-backed custom policy evaluation, in-process policy evaluation, sidecar evaluation, or external policy service until a technical decision is approved.

Minimum decision record required:

- policy language/model;
- policy persistence and migration/versioning;
- policy assignment lifecycle;
- evaluation location for API and workers;
- cache strategy and invalidation;
- fail-closed behavior during policy-store or evaluator outage;
- audit event schema;
- service identity model;
- local development/test mode.

## 7. Automatic Scan Trigger Lifecycle

### Trigger Catalog

| Trigger                              | Trusted source identity                                       | Expected behavior                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GitHub push webhook                  | GitHub App installation and verified webhook signature        | Resolve repository connection, configured branch, commit SHA, tenant, assessment mapping; create/resume pending scan. |
| GitHub installation/repository event | GitHub App installation and verified webhook signature        | Update connection context; resume waiting scan only when mapping is complete.                                         |
| Scheduled integration trigger        | LCSP scheduler service identity                               | Check configured repository connections and branch/commit state; create/resume scan when PBAC permits.                |
| Backend-issued trigger               | LCSP API/service identity after authorized user/system action | Create/resume scan from persisted connection/snapshot context.                                                        |
| Manager scan request                 | Authenticated LCSP subject                                    | May remain as a product action, but it must create trusted trigger context; it must not upload a report.              |

### Pending and Resume Semantics

```text
TRIGGER_RECEIVED
-> CONTEXT_VALIDATING
-> PENDING_MAPPING | BLOCKED_MAPPING | WAITING_FOR_CONTEXT | READY_TO_SNAPSHOT
-> SNAPSHOT_PENDING
-> SCAN_PENDING
-> SCAN_RUNNING
-> SCAN_COMPLETED | SCAN_FAILED
```

Resume rules:

- Same tenant, repository, assessment, branch, commit, scanner version, ruleset/config versions, and trigger source can resume or return existing workflow.
- Superseded commit/branch context must not mutate completed history.
- Ambiguous assessment mapping requires Manager-visible recovery, not best-effort selection.
- Missing repository/account mapping waits or blocks according to documented failure code.

### Idempotency Key

Recommended canonical key:

```text
organizationId
+ repositoryConnectionId
+ repositoryId
+ assessmentId or pendingMappingId
+ configuredBranch
+ commitSha
+ scannerVersion
+ scannerToolchainVersion
+ scannerConfigHash
+ rulesetVersion
+ triggerSource
+ triggerSourceDeliveryId
```

`TECHNICAL_DECISION_REQUIRED`: final idempotency key field set and persistence constraint.

### Correlation Model

Each trigger creates or propagates:

- `correlationId`;
- `causationId`;
- `triggerSource`;
- `triggerDeliveryId`;
- source service or actor identity;
- organization ID;
- resource refs;
- policy ID/version used for authorization.

### Retry and DLQ Behavior

Retryable:

- transient provider/webhook processing failure;
- transient repository provider access failure;
- queue/broker delivery interruption.

Non-retryable safe states:

- missing mapping;
- ambiguous mapping;
- PBAC denied;
- invalid webhook signature;
- revoked repository connection;
- tenant mismatch.

`TECHNICAL_DECISION_REQUIRED`: final retry budget, DLQ topology, replay authority, and operator recovery flow for automatic trigger workflows.

### Failure Codes

Minimum codes:

- `TRIGGER_SIGNATURE_INVALID`;
- `TRIGGER_SOURCE_UNTRUSTED`;
- `PBAC_DENIED`;
- `TENANT_CONTEXT_MISSING`;
- `REPOSITORY_CONNECTION_MISSING`;
- `REPOSITORY_CONNECTION_REVOKED`;
- `ASSESSMENT_MAPPING_MISSING`;
- `ASSESSMENT_MAPPING_AMBIGUOUS`;
- `BRANCH_NOT_CONFIGURED`;
- `COMMIT_UNAVAILABLE`;
- `IDEMPOTENCY_CONFLICT`;
- `OUT_OF_ORDER_TRIGGER_WAITING`;
- `TRIGGER_DLQ_EXHAUSTED`.

### Manager-Visible UX States

UX remediation must later define Manager-visible language for:

- waiting for repository/account mapping;
- blocked by ambiguous assessment mapping;
- blocked by revoked repository connection;
- trigger received and scan queued;
- duplicate trigger ignored/resumed;
- scan failed with safe reason;
- recovery actions without exposing secrets or raw webhook payload.

This proposal does not authorize UX creation.

## 8. Python Worker Platform Target Architecture

The target architecture is:

```text
NestJS API = synchronous control plane
Web application = customer-facing UI
Python Worker Platform = all asynchronous domain workloads
Node.js CLI = bounded TypeScript/JavaScript analyzer adapter only
```

Python Worker Platform must not be one monolithic Python process. It must define bounded consumers/modules with separate queue ownership, resource limits, shared contracts, shared persistence adapters, PBAC-aware service identity, idempotency, retry/DLQ, structured logging, metrics/tracing, and independent scaling/deployment where required.

Required bounded Python consumers/modules:

| Consumer/module                      | Owns                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Python Scan Worker                   | Repository Scan, scanner toolchain, TechnicalEvidenceReport terminal events. |
| Python TechnicalProfile Worker       | TechnicalProfile from accepted evidence.                                     |
| Python AIUsageFlow Worker            | AIUsageFlow and claim uncertainty.                                           |
| Python Reconciliation Worker         | ReconciliationConflict and VerifiedProfile generation.                       |
| Python Legal Source Ingestion Worker | Legal source fetch, snapshot, hash, normalization staging.                   |
| Python Corpus Index Worker           | Corpus index build and verification.                                         |
| Python Legal Matching Worker         | LegalRuleMatch and retrieval audit.                                          |
| Python Classification Worker         | Citation-gated classification orchestration through LLM Gateway contracts.   |
| Python Gap Analysis Worker           | GapAnalysis generation.                                                      |
| Python Document Worker               | Document generation orchestration and artifact metadata.                     |
| Python Audit/Export Worker           | Asynchronous audit/export work where applicable.                             |

Node.js remains valid only for:

- NestJS API;
- web frontend/tooling;
- bounded `ts-morph` analyzer CLI invoked by Python Scanner Worker.

## 9. Migration Impact from Node Workers to Python Workers

Active documents that currently state or imply Node.js downstream ownership include:

- `docs/README.md`;
- `docs/architecture/adr/architecture-decision-records.md`;
- `docs/architecture/adr/adr-022-typescript-first-npm-only-controlled-prototype.md`;
- `docs/implementation/queue-implementation.md`;
- `docs/implementation/persistence-implementation.md`;
- `docs/implementation/legal-corpus-ingestion-implementation.md`;
- `docs/implementation/hybrid-retriever-implementation.md`;
- `docs/code-map/module-ownership-map.md`;
- `docs/code-map/worker-code-map.md`;
- `docs/code-map/README.md`;
- `docs/specs/event-catalog.md`;
- `docs/specs/domain-state-machines.md`;
- `docs/change-control/sprint-change-proposal-2026-06-23.md`;
- `docs/planning-artifacts/phase-5-2k-b-pre-ux-active-doc-closure-report-2026-06-23.md`;
- `docs-vn/04-kien-truc-he-thong.md`;
- `docs-vn/07-du-lieu-su-kien-va-bao-mat.md`.

Required migration analysis:

- queue names may remain domain-oriented but consumers/runtime ownership must change to Python;
- shared contracts must not depend on TypeScript-only runtime ownership;
- persistence adapter ownership must be explicit for Python workers;
- service identities must be PBAC-aware;
- LLM Gateway access from Python workers must preserve sanitized structured inputs;
- outbox publisher/runtime decision must be revisited;
- code maps must remove `apps/worker` as downstream domain worker authority.

## 10. Scanner Toolchain Pipeline

Required deterministic pipeline:

```text
RepositorySnapshot
-> inventory and bounds
-> Syft SBOM/dependency inventory
-> Knip and deptry dependency usage analysis
-> ast/libcst Python semantic analysis
-> ts-morph TS/JS semantic analysis
-> tree-sitter/custom parser structural augmentation
-> Semgrep custom AI rules
-> import/call/data-flow graph fusion
-> normalized dependency facts
-> EvidenceReference
-> TechnicalFinding
-> coverage limitations
-> TechnicalEvidenceReport gates
-> cleanup verification
-> terminal ScanJob event
```

Tool purposes:

- Syft: SBOM, packages/dependencies, ecosystems/versions, dependency provenance.
- Knip: JS/TS unused dependencies, exports, files where safe, declared-versus-evidenced usage.
- deptry: Python unused dependencies, missing declarations, transitive usage, uncertain resolution.
- Semgrep custom rules: AI providers/frameworks/model calls/prompt and data flow/downstream decisions/ranking/recommendation/human review/risky AI patterns.
- tree-sitter/custom parser: supplemental import/call/structural facts, cross-language evidence, coverage limitations.
- `ast` + `libcst`: first-class Python static semantics.
- `ts-morph`: bounded TypeScript/JavaScript analyzer CLI only.

## 11. Evidence and Dependency Contracts

Scanner output must normalize into common contracts:

- `SourceFile`;
- `PackageDependency`;
- `SBOMComponent`;
- `DependencyUsageFact`;
- `ImportGraphNode`;
- `ImportGraphEdge`;
- `CallGraphNode`;
- `CallGraphEdge`;
- `EvidenceReference`;
- `TechnicalFinding`;
- `CoverageLimitation`;
- `TechnicalEvidenceReport`.

Dependency states must distinguish:

- declared;
- discovered;
- used or reachable;
- unused;
- missing;
- transitive;
- uncertain.

No tool result may independently become:

- legal truth;
- classification truth;
- proof of active AI use;
- proof of automated decision-making.

## 12. Tool Guardrails and Failure Behavior

All scanner tools must:

- have pinned versions;
- have configuration hashes;
- have ruleset versions;
- run inside the restricted scanner workspace;
- use bounded CPU, memory, time, file, and output limits;
- not install repository dependencies;
- not run customer application code;
- validate and redact stdout/stderr;
- emit normalized structured output;
- record failure and coverage state;
- preserve tool/version/config provenance.

Tool failure classification:

| Failure                                            | Behavior                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Single-file parser/tool limitation                 | Coverage limitation when safe.                                      |
| Tool unavailable due to configuration error        | Terminal scan failure unless explicitly optional by severity table. |
| Tool timeout/resource exhaustion on bounded subset | Coverage limitation or terminal failure according to severity.      |
| Privacy/redaction/schema failure                   | Terminal scan failure.                                              |
| Cleanup failure                                    | Terminal scan failure and security audit.                           |

`TECHNICAL_DECISION_REQUIRED`: severity table deciding when Syft, Knip, deptry, Semgrep, tree-sitter, `ast/libcst`, and `ts-morph` failure is coverage limitation versus terminal scan failure.

## 13. Cross-Document Impact Matrix

| Area/document                                                                                                                         | Impact                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/product/prd.md`                                                                                                                 | Replace RBAC role authority with PBAC, remove structured attestation from MVP, remove product concepts, replace FR-050 semantics, remove FR-051, update scan/toolchain/runtime wording. |
| `docs/product/business-rules.md`                                                                                                      | Rewrite role/permission and attestation rules; remove BRs created only for attestation/manual uploads; add PBAC and automatic trigger rules.                                            |
| `docs/product/system-context.md`                                                                                                      | Update product boundary, actor authorization model, and removed concepts.                                                                                                               |
| `docs/product/validation-plan.md`                                                                                                     | Remove A3 attestation validation as active MVP; add PBAC/automatic trigger/scanner toolchain validation risks.                                                                          |
| `docs/specs/use-cases.md`                                                                                                             | Remove `UC-018` attestation; redefine scan initiation and Developer collaboration boundaries.                                                                                           |
| `docs/specs/user-task-flows.md`                                                                                                       | Remove structured attestation task flow; replace manual run/upload assumptions with automatic trusted trigger states.                                                                   |
| `docs/specs/functional-requirements.md`                                                                                               | Redefine `FR-050`; remove `FR-051`; remove/supersede `FR-045/046` active attestation semantics; update PBAC requirements.                                                               |
| `docs/specs/non-functional-requirements.md`                                                                                           | Replace RBAC NFR wording with PBAC; add policy traceability and automatic trigger safety.                                                                                               |
| `docs/specs/acceptance-criteria-catalog.md`                                                                                           | Remove `AC-013` attestation; add automatic trusted scan initiation ACs and PBAC audit ACs.                                                                                              |
| `docs/specs/requirements-baseline.md`                                                                                                 | Mark old attestation/upload/role decisions with required markers; preserve history.                                                                                                     |
| `docs/specs/requirements-traceability-matrix.md` and summary                                                                          | Update FR/UC/AC/NFR mappings; remove attestation/manual JSON/upload active rows.                                                                                                        |
| `docs/specs/domain-model.md`                                                                                                          | Remove `StructuredTechnicalAttestation`; add PBAC policy/audit concepts and automatic trigger/pending mapping objects.                                                                  |
| `docs/specs/domain-state-machines.md`                                                                                                 | Add trigger/pending mapping states; remove attestation state machine; update worker runtime language.                                                                                   |
| `docs/specs/event-catalog.md`                                                                                                         | Remove attestation events; add trigger commands/events; update Python consumer ownership.                                                                                               |
| `docs/specs/scanner-spec.md` and `python-scanner-spec.md`                                                                             | Add expanded toolchain, dependency/SBOM contracts, guardrails, failure severity.                                                                                                        |
| `docs/specs/ai-usage-flow-domain-spec.md`                                                                                             | Ensure tool outputs are evidence only, not truth; remove attestation dependencies.                                                                                                      |
| `docs/specs/legal-*`, classification, matching, document generation specs                                                             | Remove attestation as evidence/disclosure dependency; ensure Python worker ownership where async.                                                                                       |
| `docs/architecture/architecture.md`                                                                                                   | Replace async runtime architecture and PBAC authorization model; add automatic trigger lifecycle.                                                                                       |
| `docs/architecture/adr/architecture-decision-records.md`                                                                              | Add/supersede ADRs for PBAC, FR-050 replacement, Python Worker Platform, scanner toolchain; supersede ADR-008 active attestation wording.                                               |
| `docs/architecture/adr/adr-022*.md` and `adr-023*.md`                                                                                 | Supersede Node downstream and scanner toolchain limits where conflicting.                                                                                                               |
| `docs/implementation/backend-implementation.md`                                                                                       | Replace RBAC implementation with PBAC requirements; replace Manager-triggered scan-only contract with trusted trigger creation/resume; no code tasks yet.                               |
| `docs/implementation/persistence-implementation.md`                                                                                   | Remove attestation entity; add policy/version/audit and trigger mapping persistence requirements; update Python worker ownership assumptions.                                           |
| `docs/implementation/queue-implementation.md`                                                                                         | Update consumers to Python Worker Platform; add trigger events, retry/DLQ decisions.                                                                                                    |
| `docs/implementation/scanner-implementation.md` and `python-worker-implementation.md`                                                 | Expand toolchain and platform scope.                                                                                                                                                    |
| `docs/implementation/legal-corpus-ingestion-implementation.md`, `hybrid-retriever-implementation.md`, `llm-gateway-implementation.md` | Update runtime ownership to Python workers where async; preserve gateway boundaries.                                                                                                    |
| `docs/developer-execution-blueprints/*`                                                                                               | Update runtime traces, remove attestation flow, add automatic scan trigger journey.                                                                                                     |
| `docs/code-map/*`                                                                                                                     | Replace `apps/worker` downstream Node ownership with bounded Python modules; retain Node CLI only for TS/JS analyzer.                                                                   |
| `docs/implementation-delivery-plan.md`                                                                                                | Remove attestation task; replace RBAC and Node worker tasks; add remediation-only note before any implementation tasks.                                                                 |
| `docs/implementation-readiness-certification.md`                                                                                      | Revoke normalized/readiness claims affected by Phase 5.2L until remediation and recheck.                                                                                                |
| `docs/planning-artifacts/*.md`                                                                                                        | Mark prior plans as superseded where they preserve optional attestation, RBAC, Node downstream workers, or old FR-050/FR-051. Do not rewrite archive/history.                           |
| `docs/change-control/sprint-change-proposal-2026-06-23.md`                                                                            | Historical/change-control record; add supersession marker only if remediation is approved.                                                                                              |
| `docs-vn/*`                                                                                                                           | Synchronize condensed Vietnamese docs after English canonical remediation. `docs-vn/11-phase-5-2l.md` is directive evidence, not completed remediation.                                 |

## 14. ADRs to Add, Update, or Supersede

Add:

- ADR: PBAC authorization source of truth.
- ADR: Automatic trusted scan initiation replaces Local/CI scanner report upload.
- ADR: Python Worker Platform owns all asynchronous domain workloads.
- ADR: Expanded scanner toolchain and evidence contracts.

Update/supersede:

- ADR-002: async worker runtime boundary.
- ADR-003: Developer optional collaboration boundary, without attestation.
- ADR-005: evidence path and FR-050 replacement.
- ADR-008: structured attestation removed from active MVP.
- ADR-022: Node.js downstream worker ownership superseded.
- ADR-023: scanner runtime expanded beyond current `ast/libcst` + `ts-morph` baseline.
- ADR index: status table and supersession rules.

## 15. Documentation Remediation Waves

No remediation may begin before explicit Project Owner approval.

After approval, recommended waves:

1. Governance markers: add supersession/removal markers and revoke affected readiness claims.
2. Product and requirements: PRD, FR/NFR, UC, AC, BR, traceability.
3. Domain contracts: model, state machines, event catalog, scanner contracts, evidence contracts.
4. Architecture and ADRs: PBAC, Python Worker Platform, scanner toolchain, automatic scan initiation.
5. Implementation specs and code maps: backend, persistence, queue, worker ownership, scanner implementation.
6. Planning artifacts and delivery plan: remove obsolete tasks, preserve history, block implementation.
7. Vietnamese docs: synchronize condensed docs from remediated canonical English docs.
8. Readiness recheck: run implementation-readiness workflow only after remediation is complete.

## 16. Dependencies and Owner Decisions

| Decision                                                         | Classification                                                                                                | Required owner                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| PBAC engine/storage/cache/invalidation/topology/failure behavior | `TECHNICAL_DECISION_REQUIRED`                                                                                 | Architect/technical owner with PO acceptance. |
| Automatic trigger retry/DLQ/replay behavior                      | `TECHNICAL_DECISION_REQUIRED`                                                                                 | Architect/platform owner.                     |
| Automatic trigger idempotency key and persistence constraints    | `TECHNICAL_DECISION_REQUIRED`                                                                                 | Architect/backend owner.                      |
| Scanner tool failure severity table                              | `TECHNICAL_DECISION_REQUIRED`                                                                                 | Architect/scanner owner.                      |
| Tool versions/config hash/ruleset version policy                 | `TECHNICAL_DECISION_REQUIRED`                                                                                 | Scanner/platform owner.                       |
| GitHub App credentials and webhook secret handling               | `COST_OR_CREDENTIAL_DECISION_REQUIRED`                                                                        | Project Owner/platform owner.                 |
| Legal source allowlist and authority validation                  | `SOURCE_VALIDATION_REQUIRED`                                                                                  | Legal/domain owner.                           |
| Python Worker Platform team capability                           | `TEAM_CAPABILITY_REQUIRED`                                                                                    | Project Owner/delivery owner.                 |
| Whether any Developer collaboration remains without attestation  | `PROJECT_OWNER_LOCKED` for attestation removal; exact retained scope needs PO confirmation during remediation | Project Owner.                                |

## 17. Go/No-Go Conditions

Go for documentation remediation only when:

- Project Owner explicitly approves this Sprint Change Proposal.
- Approval states it authorizes documentation/planning remediation only.
- No code/tests/CI/CD/Docker/deployment/UX/epics/stories/sprint status work is included.
- Remediation uses explicit markers: `SUPERSEDED_FOR_ACTIVE_MVP`, `REMOVED_FROM_PRODUCT`, `HISTORICAL_ONLY`, `DEFERRED_POST_MVP` where appropriate.
- Active non-archive docs are updated before any readiness or implementation claim is restored.

No-Go if:

- PBAC is implemented or documented as a concrete engine without technical decision.
- Structured attestation remains active in MVP.
- FR-050 keeps Local/CI upload semantics.
- FR-051 remains roadmap/future product scope.
- Node.js downstream domain worker ownership remains active.
- Scanner toolchain lacks required tools/contracts/guardrails.

## 18. Project Owner Approval Section

Project Owner decision:

```text
APPROVED_FOR_DOCUMENTATION_AND_PLANNING_REMEDIATION_ONLY: yes
APPROVED_BY: Minh
DATE: 24/06/2026
CONDITIONS: Update rag: chorma database (vector less)
```

Approval authorizes only documentation and planning remediation. It does not authorize implementation, sprint execution, code, tests, CI/CD, Docker, deployment, UX, epics, stories, sprint status changes, or archive/history rewrite.

CHANGE_PROPOSAL_READY_FOR_PROJECT_OWNER_APPROVAL
