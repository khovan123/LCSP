# ADR-023 — Python Worker as Scanner Runtime Owner

## Status

Accepted and technically closed for A-to-Z Runnable MVP (Phase 5.2J/5.2K)

## Decision Context

```text
SUPERSEDES_ADR_022_SCANNER_WORKER_RUNTIME_DECISION
PROJECT_OWNER_LOCKED
TECHNICAL_DECISIONS_CLOSED_FOR_MVP
```

Approved by the Phase 5.2J scope pivot. Phase 5.2I remains historical evidence.

## Decision

```text
PYTHON_WORKER_OWNS_REPOSITORY_SCAN_LIFECYCLE
PYTHON_AST_STACK_AST_PLUS_LIBCST
TS_JS_INTEGRATION_NODE_SUBPROCESS_JSON_STDIO
PYTHON_PACKAGING_PYPROJECT_POETRY
```

A standalone Python Worker is the sole consumer of `command.scan.requested.v1` and owns:

1. job lock and RUNNING transition;
2. restricted workspace creation;
3. commit-pinned snapshot materialization;
4. Python AST/CST and bounded semantic analysis;
5. TypeScript/JavaScript subprocess analysis;
6. normalized graph, evidence, findings, and TechnicalEvidenceReport;
7. metadata-only persistence and audit;
8. workspace deletion and cleanup verification;
9. terminal ScanJob transaction and completed/failed OutboxEvent.

NestJS API retains authentication, RBAC, ScanJob creation/query, and downstream orchestration projections.

## Process Boundary

| Concern | Decision |
|---|---|
| Package | `lcsp-scanner-worker` |
| Runtime | Python 3.11+ |
| Packaging/dependencies | `pyproject.toml` managed by Poetry |
| Queue consumer | `command.scan.requested.v1` / `lcsp.scan-worker.v1` |
| Outbox events | `event.scan.completed.v1`, `event.scan.failed.v1` |
| Python parser stack | stdlib `ast` + `libcst` |
| Optional AST libraries | `astroid` is not an MVP dependency; evaluate Post-MVP only if a measured gap justifies it |
| TS/JS integration | Option A: fixed Node.js CLI subprocess with versioned JSON stdio protocol |
| Graph runtime | Python-native scan-local graph model; no graph database and no Node `graphology` runtime dependency |
| Persistence | PostgreSQL metadata only |
| Workspace | restricted ephemeral directory under ADR-016 policy |

## TS/JS Analyzer Integration

Python Worker invokes a fixed Node executable through `asyncio.create_subprocess_exec` without shell interpolation.

```text
node dist/tools/ts-js-analyzer/cli.js --workspace <workspace> --request <request-json>
```

Contract:

- input and output use a versioned JSON schema;
- stdout is bounded and schema-validated;
- stderr is redacted and bounded;
- timeout/non-zero exit yields `TS_JS_ANALYZER_FAILED` and coverage limitations for affected files;
- the subprocess does not consume RabbitMQ, persist scanner rows, or publish events;
- repository dependency installation and source execution are prohibited.

A separate HTTP analyzer service is Post-MVP unless operational evidence requires independent scaling.

## Python First-Class Analysis

| Capability | MVP Level |
|---|---|
| Imports, packages, modules | L0-L2 |
| Functions, classes, methods, decorators | L1-L2 |
| AI provider/model invocation detection | L1-L2 |
| Input/output tracking | L1-L2 |
| Controlled cross-module flow | L2-L3 bounded |
| Human-review and downstream action paths | L1-L3 bounded |
| Dynamic/reflection/runtime-only boundaries | L4 -> explicit uncertainty |
| Evidence references | metadata-only for all supported levels |

The scanner does not claim complete analysis of arbitrary dynamic Python.

## Workspace Lifecycle

| Concern | Value |
|---|---|
| Root | `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}` |
| Naming | `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}` |
| Contents | selected commit-pinned snapshot only |
| Cleanup | after success or every terminal failure path |
| Completion gate | cleanup verification required before completed event |
| Cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`, security audit, downstream blocked |

## Failure and Retry

| Failure | Behavior |
|---|---|
| Repository access | `REPOSITORY_ACCESS_FAILED`; bounded retry; failed event |
| Single-file parser error | `SCANNER_PARSE_FAILED`; coverage limitation; continue when safe |
| TS/JS analyzer error | `TS_JS_ANALYZER_FAILED`; affected-file limitation |
| Dynamic Python flow | `UNSUPPORTED_DYNAMIC_FLOW`; do not infer |
| Privacy/redaction/schema failure | fail closed |
| Cleanup failure | terminal failure, no completed event |
| Duplicate delivery | idempotent no-op/resume according to ScanJob state |

Queue retry budget remains 3 attempts with 30s, 120s, and 600s backoff before DLQ for retryable job failures.

## Privacy Invariants

- No raw source, secrets, full prompts, or full AST bodies to LLM.
- No long-term raw source persistence.
- Queue payloads are reference-only.
- Subprocess output is validated/redacted before persistence.
- Workspace cleanup is mandatory and failure-blocking.

## Consequences

- Node.js worker no longer owns the scan command.
- Python Worker is a separate runtime/deployment unit.
- TS/JS semantic logic remains in Node but is subordinate to Python lifecycle ownership.
- Code maps, local commands, scanner blueprint, and stories must reflect this split.
- Scanner accuracy remains subject to post-implementation fixture acceptance.

## ADR Relationships

| ADR | Relationship |
|---|---|
| ADR-002 | Partially superseded for scanner worker; NestJS API and downstream workers retained |
| ADR-006 | Retained privacy boundary |
| ADR-009 | Retained orchestrated workflow |
| ADR-010 | Retained GitHub repository evidence path |
| ADR-016 | Retained workspace policy |
| ADR-017 | Retained RabbitMQ/outbox topology |
| ADR-021 | Retained L0-L4 bounded analysis |
| ADR-022 | Partially superseded: scanner runtime ownership only |

## Non-Claims

- This ADR does not authorize production deployment.
- It does not guarantee perfect analysis of dynamic code.
- It does not authorize source execution or dependency installation.
- It does not certify A2-b2 scanner accuracy before implementation testing.