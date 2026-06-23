# Scanner Implementation

## Status

AUTHORITATIVE BUILD DOCUMENT — A-TO-Z RUNNABLE MVP

> Phase 5.2J update. The previous Phase 5.2I scanner implementation document (TypeScript-first Node.js worker, commit c33b137) is preserved as historical evidence in git history. This document defines the A-to-Z runnable MVP scanner build boundary per SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23) and ADR-023.

## Purpose

Single build source for implementing the A-to-Z runnable MVP scanner. Python Worker owns the Repository Scan lifecycle per ADR-023.

Domain behavior: `docs/specs/scanner-spec.md`, `docs/specs/python-scanner-spec.md`. Persistence: `docs/implementation/persistence-implementation.md`. Queue: `docs/implementation/queue-implementation.md`.

## Build Boundary

- Static analysis only.
- No customer source execution.
- No scanner-initiated npm install, build, test, Docker, CI, package script execution or API probing.
- No raw source, full prompts, secrets, provider tokens, repository credentials, full repository archives or full AST bodies in long-term persistence, queue payloads, audit logs or LLM inputs.
- Python receives first-class static analysis per ADR-023. See `docs/specs/python-scanner-spec.md`.

## Runtime Ownership

| Concern | A-to-Z MVP Decision |
|---|---|
| Service name | Python Scanner Worker |
| Package | `lcsp-scanner-worker` (Python package) |
| Runtime | Python 3.11+ |
| Queue consumer | `command.scan.requested.v1` (sole consumer) |
| Queue publisher | `event.scan.completed.v1`, `event.scan.failed.v1` (via outbox) |
| Python AST stack | `ast` (stdlib) + `libcst`; `astroid` evaluated post-spike — `TECHNICAL_DECISION_REQUIRED` |
| TS/JS analyzer | Subprocess or HTTP service — `TECHNICAL_DECISION_REQUIRED` |
| Graph runtime | graphology in memory |
| Persistence | PostgreSQL metadata only |
| Workspace | Ephemeral restricted (ADR-016 policy) |

NestJS API (`apps/api`) retains: RBAC, scan job creation, event consumption for TechnicalProfile trigger. NestJS worker no longer owns `command.scan.requested.v1`.

## Python Worker Folder Structure

```text
lcsp-scanner-worker/
  pyproject.toml
  src/
    lcsp_scanner/
      main.py                   Queue consumer entry point
      config.py                 Environment configuration
      workspace/                Workspace lifecycle management
      parsers/                  Python AST extractors
        python_ast_extractor.py
        manifest_extractor.py
      analyzers/                AI provider/framework/invocation detectors
        ai_invocation_detector.py
        human_review_detector.py
        data_flow_analyzer.py
      ts_js_bridge/             TypeScript/JavaScript analyzer integration
        subprocess_bridge.py    Option A: subprocess
        http_bridge.py          Option B: HTTP service
      evidence/                 Evidence reference and metadata factory
        evidence_ref_factory.py
      reports/                  TechnicalEvidenceReport builder and validation
        report_builder.py
      persistence/              PostgreSQL persistence boundary
        scanner_repository.py
      queue/                    RabbitMQ consumer and outbox writer
        consumer.py
        outbox.py
      audit/                    Audit event writer
        audit_writer.py
```

## Configuration

| Key | Secret? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `RABBITMQ_URL` | Yes | RabbitMQ broker |
| `LCSP_ENV` | No | Environment label |
| `LCSP_LOG_LEVEL` | No | Structured logging level |
| `LCSP_SCANNER_WORKSPACE_ROOT` | No | Temporary workspace; fallback `.lcsp/tmp/scanner-workspaces` |
| `SCANNER_MAX_FILES` | No | Repository file-count limit |
| `SCANNER_RULESET_VERSION` | No | Detector ruleset version |
| `TS_ANALYZER_MODE` | No | `subprocess` (Option A) or `http` (Option B) — `TECHNICAL_DECISION_REQUIRED` |
| `TS_ANALYZER_HTTP_URL` | No | URL for HTTP service mode; required when `TS_ANALYZER_MODE=http` |

## Scanner Workspace

| Item | Decision |
|---|---|
| Workspace root | `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}` |
| Workspace naming | `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}` |
| Allowed contents | Temporary materialized files for the selected commit-pinned snapshot only |
| Cleanup | Immediately after scan completion or terminal failure |
| Cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; security-sensitive audit; downstream blocked |
| Persisted data | Paths, hashes, sizes, language/support metadata, evidence refs, graph node/edge metadata, findings, reports and redacted failure codes only |

## Queue Contract

| Exchange | Queue | Routing Key | Producer | Consumer | Retry/DLQ |
|---|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | NestJS API outbox | Python Worker | 3 attempts (30s, 120s, 600s), then DLQ |
| `lcsp.events.v1` | orchestration binding | `event.scan.completed.v1` | Python Worker outbox | TechnicalProfile trigger | Reference-only payload |
| `lcsp.events.v1` | orchestration binding | `event.scan.failed.v1` | Python Worker outbox | Assessment projection / audit | Reference-only payload |

No worker publishes directly to RabbitMQ inside the domain transaction. Python Worker writes `OutboxEvent`; outbox publisher publishes later.

## Core Processing Algorithm

```text
handle_scan_requested(payload):
  job = lock_job(payload.scan_job_id)
  snapshot = load_repository_snapshot(payload.repository_snapshot_id)
  workspace = materialize_snapshot(snapshot)
  source_files = enumerate_source_files(snapshot)
  parsed_files = []

  for source_file in source_files:
    mapping = language_mapper.map(source_file)
    if mapping.language == PYTHON:
      parsed_file = python_ast_extractor.extract(source_file, workspace)
    elif mapping.language in (TYPESCRIPT, JAVASCRIPT):
      parsed_file = ts_js_bridge.analyze(source_file, workspace)
    elif mapping.support_level == BASIC_SIGNAL_ONLY:
      parsed_file = manifest_extractor.extract(source_file)
    else:
      parsed_file = unsupported_adapter.parse(source_file)
    parsed_files.append(parsed_file)

  graph = graph_builder.build(parsed_files)
  findings = detector_engine.run_all(graph, parsed_files)
  evidence = evidence_ref_factory.attach_refs(findings)
  report = report_builder.generate(evidence, graph)

  transaction:
    save SourceFile metadata
    save CodeGraphNode/CodeGraphEdge metadata
    save EvidenceReference rows
    save TechnicalFinding rows
    save TechnicalEvidenceReport
    write AuditEvent

  cleanup_workspace(workspace)

  if cleanup_failed:
    transaction:
      mark ScanJob FAILED with SCANNER_WORKSPACE_CLEANUP_FAILED
      write security-sensitive AuditEvent
      write OutboxEvent event.scan.failed.v1
    stop

  transaction:
    mark ScanJob COMPLETED
    write AuditEvent
    write OutboxEvent event.scan.completed.v1
```

## Failure Behavior

| Failure Mode | Behavior |
|---|---|
| Repository access failure | `REPOSITORY_ACCESS_FAILED`; audit; `event.scan.failed.v1` |
| Parser failure (single file) | `SCANNER_PARSE_FAILED`; coverage limitation; bounded continuation |
| Workspace cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; security audit; downstream blocked |
| Unsupported dynamic Python flow | `UNSUPPORTED_DYNAMIC_FLOW`; coverage limitation; do not infer |
| Provider/package-only finding | `AI_PROVIDER_USAGE` with abstention on invocation/decision claims |
| Secret redaction failure | Fail closed before persistence |
| TS/JS analyzer failure | `TS_JS_ANALYZER_FAILED`; coverage limitation for affected files; bounded continuation |

## Language Mapping

| Condition | Language | Support Level |
|---|---|---|
| `.py` | `PYTHON` | `FULL_STATIC` — Python Worker |
| `.ts`, `.tsx` | `TYPESCRIPT` | `FULL_STATIC` — TS/JS analyzer |
| `.js`, `.jsx`, `.mjs`, `.cjs` | `JAVASCRIPT` | `FULL_STATIC` — TS/JS analyzer |
| `.java`, `.kt`, `.go`, `.cs`, `.rs` | matching language | `BASIC_SIGNAL_ONLY` — manifest extractor |
| binary, generated, minified, oversized, unknown | `UNKNOWN` | `UNSUPPORTED` |

## Persistence Ownership

Use the canonical Prisma schema in `docs/implementation/persistence-implementation.md`.

| Model | Scanner Usage |
|---|---|
| `RepositoryScanJob` | Scan lifecycle, idempotency, terminal status, failure code. Add: `workerRuntime: PYTHON` |
| `SourceFile` | Snapshot file metadata, language/support level, size, hash, coverage limitations |
| `CodeGraphNode` | Metadata-only graph nodes |
| `CodeGraphEdge` | Metadata-only graph edges |
| `EvidenceReference` | File/symbol/location/hash references |
| `TechnicalFinding` | Normalized finding metadata |
| `TechnicalEvidenceReport` | Immutable report metadata and coverage summary |

`ScannerEvidencePath` is not a separate table. Store as structured JSON in `TechnicalFinding.metadata.evidencePath`.

## Python Scanner Acceptance Criteria

- Given Python source files, Python Worker performs first-class static analysis: imports, packages, modules, functions, classes, AI provider invocation, input/output tracking, cross-module flow (L2-L3), and human-review paths.
- Given AI library imports without invocation evidence, Python Worker emits `AI_PROVIDER_USAGE` or `AI_FRAMEWORK_USAGE` and does not claim active model use.
- Given AI model invocation plus output/branch/action evidence, Python Worker creates evidence-backed `TechnicalFinding` records.
- Given dynamic imports or runtime reflection, Python Worker emits `UNSUPPORTED_DYNAMIC_FLOW` and coverage limitation; does not infer.
- Given Python source, no raw source text is persisted.

## Full A-to-Z MVP Acceptance Criteria

- Given a commit-pinned repository snapshot, Python Worker materializes only the selected snapshot and deletes workspace after completion or terminal failure.
- Given TypeScript/JavaScript files, TS/JS analyzer produces facts normalized to `TechnicalFinding` schema.
- Given any scan outcome, Python Worker writes audit evidence and emits the canonical outbox event.
- Given workspace cleanup failure, scan is marked failed, security audit is written, downstream is blocked.
- Given unsupported/generated/minified/oversized files, coverage limitations are recorded; no unsupported certainty inferred.

## Verification

| Command | Expected Output | Success Criteria |
|---|---|---|
| `cd lcsp-scanner-worker && python -m pytest` | Python scanner unit tests pass | Python AST extraction, AI detection, evidence ref factory tests green |
| `python -m lcsp_scanner.smoke_scan --fixture golden-path-python` | Scan fixture creates report or explicit blocked reason | No raw source persisted; scan emits event through outbox |

## Explicit Non-Claims

- This document does not claim production readiness.
- It does not complete A2-b2 runtime scanner accuracy acceptance.
- It does not create legal conclusions.
- It does not authorize source execution or customer deployment.
- The Python AST library stack is `TECHNICAL_DECISION_REQUIRED`.
- The TS/JS analyzer integration pattern is `TECHNICAL_DECISION_REQUIRED`.
