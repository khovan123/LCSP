# LCSP Documentation Consolidation Plan

## Purpose

LCSP has reached documentation explosion: core concepts are repeated across architecture docs, specs, build specs, playbooks, construction manuals, story artifacts, developer blueprints, execution blueprints, and workflow reports. The problem is no longer missing documentation. The problem is fragmented knowledge ownership.

This plan defines a five-layer documentation model and a non-destructive archive strategy. It does not delete files, move files, rewrite architecture, or change product scope by itself.

## Current Problem

A developer trying to implement one module, such as Repository Scan, currently has to inspect many documents:

| Current Layer | Example Files |
|---|---|
| Architecture | `docs/architecture/architecture.md`, `docs/architecture/multi-agent-system-architecture.md` |
| Spec | `docs/specs/scanner-signal-taxonomy.md`, `docs/specs/static-analysis-scanner-contract.md` |
| Build Spec | `docs/build-specs/01-scanner-build-spec.md` |
| Playbook | `docs/implementation-playbooks/04-scanner-playbook.md` |
| Construction Manual | `docs/engineering-manuals/07-scanner-construction-manual.md` |
| Execution Blueprint | `docs/developer-execution-blueprints/02-repository-scan-blueprint.md` |
| Story | `docs/implementation-artifacts/STORY-*` |
| Dev Blueprint | `docs/developer-blueprints/stories/DEV-BLUEPRINT-*` |
| Workflow Report | `docs/workflows/phase-1b-*` |

This makes the developer ask: which one is canonical?

## Target Five-Layer Model

```text
docs/
  product/
  specs/
  architecture/
  developer-execution-blueprints/
  implementation/
  archive/
```

## Layer 1 — WHY

Canonical folder:

```text
docs/product/
```

Purpose:

- Product intent.
- Business rules.
- Validation intent and owner risk acceptance.

Keep active:

| Document | Role |
|---|---|
| `docs/product/prd.md` | Product requirements and MVP intent. |
| `docs/design/business-rules.md` or migrated `docs/product/business-rules.md` | Business rules. |
| `docs/product/validation-plan.md` | Validation intent. |
| `docs/validation/owner-risk-acceptance-controlled-mvp-prototype.md` | Prototype risk acceptance. |

Archive after consolidation:

- Brainstorming notes.
- Intermediate validation reports.
- Old decision drafts superseded by PRD/spec/architecture.

## Layer 2 — WHAT

Canonical folder:

```text
docs/specs/
```

Purpose:

- Domain behavior contracts.
- Canonical DTO/event/state/data contracts where they define what must exist, not how to implement it.

Target domain specs:

| Canonical Spec | Merge From |
|---|---|
| `scanner-spec.md` | `static-analysis-scanner-contract.md`, `scanner-signal-taxonomy.md`, scanner portions of evidence/report specs. |
| `ai-usage-flow-spec.md` | `ai-usage-flow-analysis-spec.md`, `ai-usage-rule-mapping-spec.md`, AIUsageFlow contracts. |
| `reconciliation-spec.md` | `reconciliation-policy.md`, conflict state docs. |
| `verified-profile-spec.md` | VerifiedProfile rules from implementation contract, state machine, reconciliation. |
| `legal-matching-spec.md` | `legal-rule-citation-contract.md`, evidence catalog and citation guardrails. |
| `classification-spec.md` | `scoring-model.md`, classification guardrails. |
| `document-generation-spec.md` | Evidence report and output guardrail rules. |
| `state-machine-spec.md` | `state-machine.md`, execution blueprint states, implementation state-machine refinements. |

Rule:

One domain, one spec. Taxonomy, contract, mapping, rules, and edge cases live inside that domain spec unless they are truly cross-cutting.

## Layer 3 — SYSTEM

Canonical folder:

```text
docs/architecture/
```

Purpose:

- System architecture.
- Multi-agent architecture.
- ADRs.
- Technology and deployment decisions.

Keep active:

| Document | Role |
|---|---|
| `architecture.md` | System architecture source. |
| `multi-agent-system-architecture.md` | Agent/workflow architecture source. |
| `architecture-decision-records.md` or `adr/` | Canonical decisions. |

Archive after consolidation:

- Architecture exploration drafts.
- Architecture checkpoint reports once decisions are merged into ADRs/architecture.

## Layer 4 — HOW IT RUNS

Canonical folder:

```text
docs/developer-execution-blueprints/
```

Purpose:

- Developer-first execution trace.
- User action -> API -> service -> DB -> queue -> worker -> output object.
- Object lifecycle.
- Domain walkthroughs.
- Sequence diagrams.

Keep active:

| Document | Role |
|---|---|
| `01-end-to-end-system-execution.md` | First developer read. |
| `02-repository-scan-blueprint.md` | Repository Scan execution trace. |
| `03-technical-profile-blueprint.md` | TechnicalProfile execution trace. |
| `04-ai-usage-flow-blueprint.md` | AIUsageFlow execution trace. |
| `05-reconciliation-blueprint.md` | Reconciliation execution trace. |
| `06-verified-profile-blueprint.md` | VerifiedProfile execution trace. |
| `07-legal-matching-blueprint.md` | Legal matching execution trace. |
| `08-risk-classification-blueprint.md` | Risk classification execution trace. |
| `09-document-generation-blueprint.md` | Document generation execution trace. |

Rule:

If a developer asks, “what happens after this button/event?”, the answer belongs here, not in architecture or story artifacts.

## Layer 5 — BUILD

Canonical folder:

```text
docs/implementation/
```

Purpose:

- Concrete implementation pack.
- Technology choices.
- NestJS/Next.js/Python worker/RabbitMQ/PostgreSQL/LLM Gateway/security/operations implementation guidance.
- Local runbooks.

Keep active:

| Document Type | Role |
|---|---|
| `system-runtime-and-component-contracts.md` | Runtime component contracts. |
| `repository-and-module-layout.md` | Repository layout. |
| `github-app-repository-scan-implementation.md` | GitHub App and scan implementation. |
| `ai-usage-flow-implementation.md` | AIUsageFlow implementation. |
| `api-and-async-event-contracts.md` | API/event contracts. |
| `queue-jobs-retry-idempotency.md` | Queue behavior. |
| `data-persistence-and-migration-plan.md` | Persistence/migration. |
| `security-privacy-implementation.md` | Security/privacy. |
| `local-development-runbook.md` | Local setup and verification. |

Rule:

If a developer asks, “which package/class/module/file do I create?”, the answer belongs here or in the execution blueprint when it is part of a runtime trace.

## Archive Candidates

These should be archived after their canonical content is merged into the five active layers.

| Folder / File Pattern | Reason | Merge Target |
|---|---|---|
| `docs/workflows/phase-1b-*` | Process/checkpoint artifacts, not product knowledge. | `architecture/`, `specs/` if decisions remain relevant. |
| `docs/build-specs/*` | Overlaps with implementation and execution blueprints. | `docs/implementation/`, `docs/developer-execution-blueprints/`. |
| `docs/implementation-playbooks/*` | Overlaps with implementation docs. | `docs/implementation/`. |
| `docs/engineering-manuals/*` | Overlaps with build specs/playbooks/implementation. | `docs/implementation/` and `docs/specs/`. |
| `docs/implementation-artifacts/STORY-*` | Planning/implementation artifact, not durable knowledge. | Archive after implementation tracking moves elsewhere. |
| `docs/developer-blueprints/stories/*` | Story-level dev docs duplicate execution blueprints. | Archive after active implementation story is complete. |
| `docs/planning/*` | Backlog planning artifacts, not canonical knowledge. | Archive after scope is stable. |
| `docs/brainstorming/*` | Discovery artifacts. | Archive after PRD/spec updates. |

## Scanner Consolidation Example

Target read path for Scanner:

```text
WHY: docs/product/prd.md
WHAT: docs/specs/scanner-spec.md
SYSTEM: docs/architecture/architecture.md
HOW IT RUNS: docs/developer-execution-blueprints/02-repository-scan-blueprint.md
BUILD: docs/implementation/github-app-repository-scan-implementation.md
```

Everything else about Scanner should either be merged into one of those five files or archived.

## Canonical Ownership Rules

| Question | Canonical Layer |
|---|---|
| Why does this capability exist? | Product |
| What must the domain behavior be? | Specs |
| What system/technology decision governs it? | Architecture |
| What happens at runtime? | Developer Execution Blueprints |
| How do we build/configure/operate it? | Implementation |
| Why was this decision made historically? | Archive or ADR if still active. |

## Migration Strategy

1. Create archive manifest before moving any file.
2. For each domain, pick one canonical target spec and merge duplicated content.
3. Add “Merged From” metadata to canonical docs.
4. Add “Archived Because” metadata to archived docs.
5. Update links in active docs.
6. Only then move old process artifacts to `docs/archive/`.
7. Do not delete historical docs until at least one review pass confirms all canonical content survived.

## Decision

```text
DOCUMENTATION_EXPLOSION_ACKNOWLEDGED
FIVE_LAYER_DOCUMENTATION_MODEL_DEFINED
NON_DESTRUCTIVE_ARCHIVE_STRATEGY_REQUIRED_BEFORE_FILE_MOVES
```
