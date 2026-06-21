# Phase 5.5 Implementation Blocking Decision Fixes Report

## Scope

Resolved only the implementation blockers preventing the first real implementation task: `ParserRegistry`, `LanguageMapper`, and `TreeSitterAstExtractor`.

No PRD, story, backlog, validation document, new playbook, new blueprint, new manual, application code, test source, CI/CD, Docker, infrastructure artifact, or architecture redesign was created.

## Decisions Fixed

| Decision | Resolution | Active Source Updated |
|---|---|---|
| Canonical scanner stack | Controlled MVP scanner is TypeScript-first: Node.js/TypeScript worker, npm workspaces, Tree-sitter, `ts-morph`, `graphology`, PostgreSQL metadata persistence. Python worker and NetworkX are historical only for scanner. | `docs/specs/scanner-spec.md`, `docs/implementation/scanner-implementation.md`, `docs/code-map/scanner-code-map.md` |
| RabbitMQ naming | Locked exchanges, queues, DLQs, command routing keys and event routing keys. Commands use `command.*`; facts use `event.*`. | `docs/implementation/queue-implementation.md`, `docs/implementation/backend-implementation.md`, `docs/code-map/api-code-map.md`, `docs/code-map/worker-code-map.md`, `docs/README.md` |
| Prisma schema source | `docs/implementation/persistence-implementation.md` is the only authoritative physical Prisma schema source. Complete enum/model fragments were added. | `docs/implementation/persistence-implementation.md`, `docs/README.md` |
| Outbox implementation | Outbox is no longer deferred. Service transaction rule and publisher locking/retry behavior are canonical. | `docs/implementation/backend-implementation.md`, `docs/implementation/queue-implementation.md`, `docs/implementation/persistence-implementation.md` |
| AIUsageFlow rule engine | Canonical interfaces, execution order and AUF-001 through AUF-035 rule catalog were added. | `docs/specs/assessment-lifecycle-spec.md` |
| Parser foundation contracts | Canonical TypeScript contracts and behavior for `ParserRegistry`, `LanguageMapper`, `AstExtractor`, `TreeSitterAstExtractorResult`, `ParsedFile`, facts, parse issues and coverage limitations were added. | `docs/specs/scanner-spec.md`, `docs/implementation/scanner-implementation.md`, `docs/code-map/scanner-code-map.md` |
| TechnicalProfile contract | Canonical fields and aggregation rules were added. | `docs/specs/assessment-lifecycle-spec.md` |
| Classification trigger | Legal matching runs after VerifiedProfile; classification runs only after legal matching completes. | `docs/specs/legal-classification-spec.md`, `docs/implementation/queue-implementation.md`, `docs/code-map/worker-code-map.md` |
| API routes | Final controlled MVP route names were added. | `docs/implementation/backend-implementation.md`, `docs/code-map/api-code-map.md` |
| Local command contract | Required local commands and smoke scan expected behavior were added. | `docs/README.md`, `docs/implementation/backend-implementation.md` |

## Files Updated

- `docs/specs/scanner-spec.md`
- `docs/specs/assessment-lifecycle-spec.md`
- `docs/specs/legal-classification-spec.md`
- `docs/implementation/scanner-implementation.md`
- `docs/implementation/queue-implementation.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/backend-implementation.md`
- `docs/code-map/scanner-code-map.md`
- `docs/code-map/api-code-map.md`
- `docs/code-map/worker-code-map.md`
- `docs/README.md`

## Adversarial Recheck Summary

Scope checked: the active Phase 5.5 implementation-blocker docs listed above.

| Check | Result | Evidence |
|---|---|---|
| Scanner stack conflict | Resolved | Active scanner stack now consistently names Node.js/TypeScript, Tree-sitter, `ts-morph`, `graphology`, PostgreSQL metadata persistence. |
| RabbitMQ event naming conflict | Resolved | Canonical exchanges, queues, DLQs and routing keys are listed; scan command/event names use required prefixes. |
| Missing authoritative Prisma schema | Resolved | `persistence-implementation.md` includes canonical Prisma fragments for all required enums and models. |
| Deferred outbox implementation | Resolved | Backend and queue docs define transaction rule, `OutboxEvent` fields, locking, retry and failure handling. |
| Missing AIUsageFlow rule engine contract | Resolved | `assessment-lifecycle-spec.md` defines interfaces, execution order and AUF-001 through AUF-035. |
| Missing ParserRegistry / LanguageMapper / ParsedFile contracts | Resolved | `scanner-spec.md` defines required interfaces and behavior; scanner implementation and code map point to those contracts. |

## Remaining Questions

| Category | Count | Notes |
|---|---:|---|
| Critical questions | 0 | No critical blocker remains for implementing `ParserRegistry`, `LanguageMapper`, or `TreeSitterAstExtractor`. |
| High questions for ParserRegistry / LanguageMapper / TreeSitterAstExtractor | 0 | Interfaces, behavior, language mapping, thresholds, parse errors, coverage limitations and output object are specified. |

## Explicit Non-Changes

- No application source code created.
- No test source created.
- No CI/CD, Docker or infrastructure artifact created.
- No new story, backlog, PRD, validation doc, playbook, blueprint or manual created.
- No readiness status changed.
- No production readiness, formal legal reliability, compliance certification, runtime scanner accuracy or A2-b2 completion was claimed.

## Final Decision

IMPLEMENTATION_BLOCKERS_RESOLVED_FOR_SCANNER_FOUNDATION

CANONICAL_SCANNER_STACK_LOCKED

CANONICAL_RABBITMQ_CONTRACTS_LOCKED

CANONICAL_PRISMA_SCHEMA_LOCKED

CANONICAL_OUTBOX_PATTERN_LOCKED

PARSER_REGISTRY_LANGUAGE_MAPPER_AST_CONTRACTS_READY_FOR_IMPLEMENTATION

NO_APPLICATION_CODE_CREATED
