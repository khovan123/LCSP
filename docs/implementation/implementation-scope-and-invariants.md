# LCSP Implementation Scope and Invariants

## Purpose

Tài liệu này định nghĩa phạm vi và các invariant kỹ thuật không được phá vỡ cho nhánh `LCSP - Conditional Implementation Documentation Branch`. Đây là tài liệu architecture implementation guidance, không phải backlog hoặc implementation plan.

## Scope of the Implementation Documentation Branch

Branch này chỉ được tạo tài liệu:

- canonical implementation contract;
- architecture implementation guidance;
- technical implementation documentation;
- test design and quality documentation;
- project context and documentation index;
- readiness review.

Branch này không được tạo code, epics, stories, sprint, sprint backlog hoặc implementation task.

## MVP Scope

MVP workflow canonical:

```text
Manager signs in using Password Login or OAuth/OIDC Login
-> LCSP enforces TOTP MFA when enabled
-> Manager creates assessment
-> Manager completes WizardProfile
-> Manager connects GitHub Repository
-> Manager runs Repository Scan
-> Scanner creates TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> Manager Conflict Resolution if needed
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
-> Gap Analysis
-> Document Generation
```

MVP active evidence path is only GitHub Repository Scan.

## Explicit Non-goals

- No source code generation.
- No Prisma schema or physical database schema.
- No controller, route handler, worker implementation or frontend component code.
- No backlog, epic, story, sprint or implementation task.
- No sprint planning or implementation sequencing that assumes backlog is unblocked.
- No readiness status change.
- No assumption that A1, A2, A2-b or A3 validation has passed.

## Future / Enterprise Scope

The following are not in the MVP main flow:

- Upload Local/CI Scanner Report.
- Manual Technical Evidence JSON.
- Generic manual evidence submission.
- CLI evidence submission.
- CI/CD evidence submission.
- API probing.
- Pull request / push-time enforcement.
- Enterprise SSO.
- SAML federation.
- SCIM provisioning.
- Directory federation.
- Domain-restricted organization login.
- Advanced organization identity policy.
- Legal corpus admin workflow.
- Rule authoring/maintenance workflow.
- Legal update monitoring.
- Automatic reassessment after legal update.

## Manager Super-role Invariant

Manager has all active MVP permissions and can complete the full MVP assessment workflow without Developer assignment.

Manager can:

- create assessment;
- complete WizardProfile;
- connect GitHub repository;
- run Repository Scan;
- view TechnicalEvidenceReport and findings;
- review AIUsageFlow;
- resolve all conflicts;
- build or approve VerifiedProfile;
- trigger Risk Classification;
- view Gap Analysis;
- request Document Generation;
- view Audit Trail.

## Optional Developer Invariant

Developer is optional. Developer is not a prerequisite for any MVP workflow transition.

Post-MVP, Manager may delegate scoped technical permissions to Developer, but delegation never removes Manager permissions and never gives Developer final compliance authority by default.

## OAuth/OIDC and GitHub App Separation Invariant

| Capability | Purpose |
| --- | --- |
| OAuth/OIDC Login | Authenticate LCSP user identity and create LCSP session under session/MFA/RBAC policy |
| TOTP MFA | Additional LCSP authentication assurance |
| GitHub App Connection | Grant read-only repository access for scan |
| Repository Scan | Create `TechnicalEvidenceReport` from selected repository/branch/commit |

OAuth/OIDC Login does not grant repository access, does not install GitHub App and does not grant scan permission. GitHub App Connection does not authenticate LCSP user identity.

## Repository Scan-only Evidence Invariant

Active MVP evidence must be scanner-generated from GitHub Repository Scan:

```text
source_type = GITHUB_REPOSITORY_SCAN
```

Manual, Local/CI, CLI, CI/CD and API probing evidence paths are Future/Enterprise only.

## Static-Analysis Scanner Invariant

MVP repository scan is static-analysis only. The scanner may read a shallow clone of the selected repository at the pinned commit, parse source/config/manifest/schema files, build AST/call/data/control/evidence graphs and persist structured findings, hashes, metadata, graph paths and coverage limits.

The scanner must not:

- execute customer source code;
- run package installs, build commands, test commands, Docker commands, shell scripts, CI workflows or repository scripts;
- probe customer API endpoints;
- persist raw source, full AST bodies, full prompts or secrets;
- send raw source, full prompts or secrets to LLM Gateway or LLM provider.

Scanner technology boundaries:

| Concern | Required Boundary |
| --- | --- |
| Generic parse | Tree-sitter for generic parsing and fallback structure |
| TypeScript/JavaScript semantic analysis | Restricted Node.js analyzer sidecar/process using TypeScript Compiler API |
| Python semantic analysis | Python `ast` plus custom import/module resolver |
| Graph assembly | NetworkX in-memory, scan-local only |
| Graph persistence | PostgreSQL persists normalized graph nodes, edges, evidence refs, hashes and paths only |
| Detection rules | Versioned YAML/JSON scanner rulesets |
| CodeQL | Future evaluation option only, not an MVP runtime dependency |

## AIUsageFlow-before-rule-matching Invariant

`AIUsageFlow` must be generated after `TechnicalProfile` and before Reconciliation and Legal Rule Matching.

```text
TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
```

Provider/model/framework detection alone cannot determine legal risk.

## VerifiedProfile-before-classification Invariant

Risk Classification must not run before `VerifiedProfile` exists and is approved/ready.

`VerifiedProfile` requires:

- WizardProfile submitted;
- TechnicalEvidenceReport accepted;
- Schema Gate passed;
- Quality Gate passed;
- TechnicalProfile available;
- AIUsageFlow available or uncertainty resolved;
- no unresolved conflict;
- Manager resolution recorded for any previous conflict.

## Conflict Blocks Classification Invariant

MVP conflict routing is binary:

```text
Conflict exists -> Manager conflict-resolution task -> classification locked
No conflict -> VerifiedProfile can be built
```

Any unresolved conflict blocks Risk Classification and final compliance document.

## Citation Guardrail Invariant

Legal conclusion requires legal rule/citation trace. Missing critical legal citation blocks or degrades output.

Risk Classification must use:

- VerifiedProfile;
- AIUsageFlow;
- retrieved legal rules/citations;
- legal corpus version.

It must not invent legal rules or cite outside the approved corpus.

## Raw Source / Prompt / Secret Privacy Invariant

- Raw source code must not be sent to LLM.
- Raw source code must not be stored long-term.
- Full system prompt must not be stored by default.
- Secret values must be redacted before persistence, logs, evidence output or LLM calls.
- Audit logs must not contain raw source, full prompt content, secrets or raw OAuth provider tokens.

## Auditability Invariant

Critical transitions must create audit events:

- auth/OAuth/MFA session events;
- assessment and Wizard lifecycle;
- GitHub repository connection;
- Repository Scan requested/started/completed/failed;
- evidence gate results;
- AIUsageFlow generated/unclear/conflict-created;
- reconciliation/conflict/no-conflict;
- Manager conflict resolution;
- VerifiedProfile approval;
- legal retrieval/corpus version;
- classification blocked/degraded/completed;
- document generation blocked/completed;
- permission grant/revocation for post-MVP delegation.

This is the audit-critical-transition invariant for Phase 1 architecture. Critical transitions must not be considered complete unless their audit event is recorded or the system has entered an explicit fail-closed recovery state.

## Implementation Invariants That Must Not Be Broken

- Manager can complete MVP without Developer assignment.
- OAuth/OIDC login does not grant GitHub repository access.
- GitHub App connection does not act as user identity login.
- Repository Scan is the only active MVP technical evidence path.
- Repository Scan is static-analysis only and must not execute customer code or probe APIs.
- Provider/model/framework detection alone does not determine legal risk.
- AIUsageFlow must precede Reconciliation and legal rule matching.
- AIUsageFlow claims used for legal rule matching require claim-level `value`, `confidence`, `evidence_refs[]`, `source_type` and uncertainty reason when applicable.
- Classification requires VerifiedProfile.
- Unresolved conflict blocks classification and final output.
- Missing critical legal citation blocks or degrades legal output.
- Raw source code, full system prompts and secrets must not enter LLM calls or audit logs.
- Every critical workflow transition must be auditable before it is treated as complete.

## Decision Required Before Later Phases

| Decision Required | Recommended Default | Reason | Impact if Unresolved | Owner | Required Before Which Phase |
| --- | --- | --- | --- | --- | --- |
| Exact OAuth/OIDC provider | Provider-neutral OAuth/OIDC contract with one configured provider before release | OAuth/OIDC is active MVP, but provider selection is deployment/configuration specific | Cannot finalize provider metadata, issuer/audience config or acceptance fixtures | Product + Security + Architecture | Phase 2 detailed auth docs; implementation execution |
| Queue deployment topology | RabbitMQ-compatible job queue abstraction | Existing docs reference RabbitMQ/queue; topology can differ by environment | Retry/dead-letter and scaling details remain conditional | Architecture + DevOps | Phase 2 queue/runbook docs |
| Vector database production configuration | ChromaDB/vector-store abstraction with legal corpus version metadata | Legal RAG needs retrieval/citation trace but production tuning depends on A2 | Retrieval thresholds and failover remain conditional | Architecture + Legal/RAG owner | Phase 2 Legal RAG docs; A2 validation |
| Object-storage provider | S3-compatible object storage contract | Generated docs and allowed artifacts need stable refs/hashes without choosing vendor now | Retention, encryption and backup details remain provider-specific | Architecture + DevOps + Security | Phase 2 persistence/deployment docs |
| LLM provider selection | External provider behind LLM Gateway | LCSP owns workflow, rules, prompts, schemas and audit; provider remains replaceable | Model limits, retry policy and cost controls remain conditional | Architecture + Security | Phase 2 LLM Gateway docs; A2/A2-b validation |
| Hosting/container deployment target | Provider-neutral container/runtime design | Source docs do not lock cloud/vendor topology | Network/security zones cannot be finalized | Architecture + DevOps | Deployment design before implementation |
| Scan sandbox technology | Isolated ephemeral scanner workspace | Security invariant requires no raw source retention and no source-to-LLM path | Concrete isolation controls and cleanup guarantees remain conditional | Security + Architecture | Phase 2 scanning/security docs |
| Legal-corpus ingestion/update approval process | Human-approved versioned corpus with citation metadata | Legal conclusions require approved rule/citation trace | Corpus poisoning and outdated-law controls remain conditional | Legal/Product + Architecture | A2 validation; Phase 2 Legal RAG docs |

## Decision Required

| Area | Decision Required | Dependency |
| --- | --- | --- |
| OAuth/OIDC provider | Which provider(s) are configured for MVP release | Configuration/security review |
| Queue technology | RabbitMQ or equivalent final choice | Architecture/runtime decision |
| Vector store | ChromaDB/vector store final choice | Legal RAG evaluation |
| Object storage | MinIO/S3-compatible final choice | Deployment target |
| AIUsageFlow confidence threshold | Final threshold and unresolved uncertainty behavior | A2-b validation |
| Legal corpus inventory | MVP legal rule coverage and citation schema | A2 validation |
| Attestation unlock path | Whether any attestation can supplement insufficient evidence | A3 validation |

## Traceability References

| Concern | Reference |
| --- | --- |
| Canonical contract | `docs/specs/implementation-contract.md` |
| Phase 0 checkpoint | `docs/workflows/phase-0-checkpoint-review.md` |
| Product scope | `docs/product/prd.md` |
| ADRs | `docs/architecture/architecture-decision-records.md` |
| Architecture | `docs/architecture/architecture.md` |
| Multi-agent architecture | `docs/architecture/multi-agent-system-architecture.md` |
| AIUsageFlow | `docs/specs/ai-usage-flow-analysis-spec.md` |
| Reconciliation | `docs/specs/reconciliation-policy.md` |
| Legal citation | `docs/specs/legal-rule-citation-contract.md` |
| Source privacy | `docs/security/source-code-privacy-policy.md` |
| Threat model | `docs/security/threat-model.md` |
| Readiness | `docs/implementation-readiness.md` |

## Readiness

This document does not change readiness:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
