# ADR-023 - Python Worker as Scanner Runtime Owner

## Status

Accepted for A-to-Z Runnable MVP (Phase 5.2J)

## Decision Context

```text
SUPERSEDES_ADR_022_SCANNER_WORKER_RUNTIME_DECISION
PROJECT_OWNER_LOCKED
```

Approved as part of SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23). Phase 5.2I preserved as historical evidence.

## Decision

```text
PYTHON_WORKER_OWNS_REPOSITORY_SCAN_LIFECYCLE
```

LCSP uses a standalone Python Worker process as the sole consumer of `command.scan.requested.v1`. The Python Worker owns all Repository Scan lifecycle steps:

1. Consume `command.scan.requested.v1` from RabbitMQ.
2. Materialize commit-pinned repository snapshot into an ephemeral restricted workspace.
3. Run Python AST/static-analysis stack (first-class Python analysis).
4. Run TypeScript/JavaScript analyzer (subprocess or microservice — TECHNICAL_DECISION_REQUIRED).
5. Generate `TechnicalEvidenceReport`.
6. Persist metadata to PostgreSQL.
7. Clean up workspace.
8. Publish `event.scan.completed.v1` or `event.scan.failed.v1` via outbox.

NestJS API retains: RBAC, job creation, event consumption for downstream triggers.

## Scan Lifecycle Flow

```text
NestJS API
  → command.scan.requested.v1 → RabbitMQ
  → Python Worker (sole consumer)
      → materialize snapshot workspace
      → run Python AST/static-analysis stack
      → run TypeScript/JavaScript analyzer (subprocess or HTTP microservice)
      → generate TechnicalEvidenceReport
      → persist metadata to PostgreSQL
      → cleanup workspace
      → publish event.scan.completed.v1 or event.scan.failed.v1 (via outbox)
  → NestJS API (event consumer: TechnicalProfile trigger)
```

## Python Worker Process Boundary

| Concern | Decision |
|---|---|
| Package name | `lcsp-scanner-worker` (Python package) |
| Runtime | Python 3.11+ |
| Queue consumer | `command.scan.requested.v1` (sole consumer) |
| Outbox publisher | `event.scan.completed.v1`, `event.scan.failed.v1` |
| Dependency manager | `TECHNICAL_DECISION_REQUIRED` (pyproject.toml / Poetry / pip) |
| Workspace policy | ADR-016 policy (ephemeral, restricted, cleanup-verified) |

## TypeScript/JavaScript Analyzer Integration

`TECHNICAL_DECISION_REQUIRED`

| Option | Description | Status |
|---|---|---|
| A | Python Worker spawns `node ts-analyzer-cli` subprocess; JSON stdio protocol | Recommended for MVP |
| B | Separate `ts-analyzer` microservice; Python Worker calls via HTTP/REST | Alternative |
| C | Python reimplementation of TS/JS analysis | Post-MVP only |

## Python First-Class Scanner

| Capability | Level |
|---|---|
| Imports and package usage | L0 |
| Module relationships (call graph) | L2-L3 bounded |
| Functions, classes, methods | L1 |
| AI provider/model invocation detection | L1 |
| Input/output tracking | L1-L2 |
| Cross-module flow | L2-L3 bounded |
| Human-review paths | L1-L2 |
| Evidence references (metadata-only) | All |
| Unsupported dynamic boundaries | L4 → UNSUPPORTED_DYNAMIC_FLOW |

## Python AST/Static Analysis Stack

`TECHNICAL_DECISION_REQUIRED`

Recommendation: `ast` (stdlib) + `libcst` for primary extraction; `astroid` evaluated for cross-module resolution post-spike.

## Workspace Lifecycle

Identical to ADR-016:

| Concern | Value |
|---|---|
| Workspace root | `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}` |
| Workspace naming | `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}` |
| Cleanup | Immediately after completion or terminal failure |
| Cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED` → security audit → downstream blocked |

## Failure and Retry Behavior

| Failure Mode | Behavior |
|---|---|
| Repository access failure | `REPOSITORY_ACCESS_FAILED`; audit; `event.scan.failed.v1` |
| Parser failure (single file) | `SCANNER_PARSE_FAILED`; coverage limitation; bounded continuation |
| Workspace cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; security audit; downstream blocked |
| Unsupported dynamic Python flow | `UNSUPPORTED_DYNAMIC_FLOW`; coverage limitation; do not infer |
| Provider/package-only finding | `AI_PROVIDER_USAGE` with abstention on invocation/decision claims |
| Idempotency | `scanJobId` used for deduplication |
| Retry | 3 attempts (30s, 120s, 600s backoff) before DLQ |

## Queue Contract

| Exchange | Queue | Routing Key | Producer | Consumer |
|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | NestJS API outbox | Python Worker |
| `lcsp.events.v1` | orchestration binding | `event.scan.completed.v1` | Python Worker outbox | TechnicalProfile trigger |
| `lcsp.events.v1` | orchestration binding | `event.scan.failed.v1` | Python Worker outbox | Assessment projection / audit |

## Privacy Invariants (ADR-006 Retained)

- No raw source code to LLM.
- No secrets to LLM.
- No full AST bodies to LLM.
- No long-term raw source persistence.
- Workspace cleanup is mandatory and failure-blocking.

## Rationale

- Python-language repositories are the dominant class for AI/ML systems subject to Vietnamese AI regulation.
- First-class Python analysis requires a Python runtime with native access to Python AST tooling.
- A standalone Python Worker provides native access to the Python AST ecosystem.
- TypeScript/JavaScript analysis is retained via subprocess/microservice integration.

## Consequences

- Node.js worker no longer owns `command.scan.requested.v1`.
- Python Worker is a new deployment unit requiring Python 3.11+ runtime.
- Team must acquire Python async worker, Python AST analysis, and pgvector pipeline capability.
- All other ADR-022 boundaries (NestJS API, Next.js web, non-scanner packages) remain active.

## ADR Relationships

| ADR | Relationship |
|---|---|
| ADR-002 | PARTIALLY_SUPERSEDED — scanner worker superseded; NestJS API and other workers retained |
| ADR-006 | RETAINED — Python Worker must enforce same boundary |
| ADR-009 | RETAINED — Python Worker participates in orchestrator-controlled workflow |
| ADR-010 | RETAINED — Python Worker implements the GitHub repository scan |
| ADR-016 | RETAINED — workspace policy applies to Python Worker |
| ADR-017 | RETAINED — Python Worker participates in RabbitMQ queue topology |
| ADR-021 | RETAINED — L0-L4 analysis scope limits apply to Python Worker |
| ADR-022 | PARTIALLY_SUPERSEDED — scanner worker only; NestJS API + non-scanner packages retained |

## Non-Claims

- This ADR does not authorize production deployment.
- The specific Python AST library stack is `TECHNICAL_DECISION_REQUIRED`.
- The TS/JS analyzer integration pattern is `TECHNICAL_DECISION_REQUIRED`.
- A2-b2 runtime scanner accuracy acceptance is required post-implementation.
