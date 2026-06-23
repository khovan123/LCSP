# Scanner Implementation

## Status

AUTHORITATIVE BUILD DOCUMENT — A-TO-Z RUNNABLE MVP

## Purpose

Define the build boundary for Repository Scan. Python Worker owns the lifecycle per ADR-023. NestJS API owns job creation/query and downstream orchestration projections.

## Active References

- `docs/architecture/adr/adr-023-python-worker-scanner-runtime.md`
- `docs/specs/scanner-spec.md`
- `docs/specs/python-scanner-spec.md`
- `docs/developer-execution-blueprints/scanner-data-journey.md`
- `docs/implementation/python-worker-implementation.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`

## Build Boundary

- Static analysis only.
- No customer source execution.
- No scanner-initiated package install, build, test, Docker, CI, shell, or endpoint probing.
- No raw source, full prompt, secret, provider token, repository credential, archive, or full AST in long-term persistence, queues, audit, or LLM input.
- Python receives first-class bounded analysis.
- TS/JS analysis runs through a fixed Node.js subprocess under Python Worker control.

## Locked Runtime Decisions

| Concern | MVP Decision |
|---|---|
| Service | Python Scanner Worker |
| Package | `lcsp-scanner-worker` |
| Runtime | Python 3.11+ |
| Dependency manager | Poetry / `pyproject.toml` |
| Queue consumer | `command.scan.requested.v1` sole consumer |
| Python parser stack | stdlib `ast` + `libcst` |
| TS/JS analyzer | Node.js CLI subprocess, versioned JSON stdio protocol |
| Graph runtime | Python-native scan-local adjacency/node-edge model |
| Persistence | PostgreSQL metadata only |
| Workspace | restricted ephemeral workspace |
| Optional `astroid` | Post-MVP evaluation only |
| HTTP analyzer service | Post-MVP scaling alternative only |

## Repository Layout

```text
lcsp-scanner-worker/
  pyproject.toml
  src/lcsp_scanner/
    main.py
    config.py
    queue/
      consumer.py
      retry_policy.py
    workspace/
      snapshot_materializer.py
      workspace_manager.py
      cleanup_verifier.py
    inventory/
      file_enumerator.py
      language_mapper.py
      ignore_policy.py
    parsers/
      python_ast_extractor.py
      python_cst_extractor.py
      manifest_extractor.py
      unsupported_adapter.py
    analyzers/
      python_import_resolver.py
      ai_invocation_detector.py
      input_output_flow_analyzer.py
      human_review_detector.py
      domain_signal_detector.py
    ts_js_bridge/
      subprocess_bridge.py
      protocol.py
    graph/
      graph_builder.py
      node_key_factory.py
      edge_key_factory.py
    evidence/
      evidence_ref_factory.py
      secret_redactor.py
    reports/
      report_builder.py
      schema_gate.py
      quality_gate.py
    persistence/
      scanner_repository.py
      outbox_repository.py
    audit/
      audit_writer.py

tools/ts-js-analyzer/
  package.json
  src/
    cli.ts
    project-loader.ts
    semantic-analyzer.ts
    detector-adapter.ts
    output-schema.ts
```

## Configuration

| Key | Secret | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL |
| `RABBITMQ_URL` | Yes | RabbitMQ |
| `LCSP_ENV` | No | Environment label |
| `LCSP_LOG_LEVEL` | No | Structured log level |
| `LCSP_SCANNER_WORKSPACE_ROOT` | No | Restricted workspace root |
| `SCANNER_MAX_FILES` | No | File-count bound |
| `SCANNER_MAX_FILE_BYTES` | No | Per-file bound |
| `SCANNER_TIMEOUT_SECONDS` | No | Job analysis bound |
| `SCANNER_RULESET_VERSION` | No | Detection ruleset version |
| `TS_ANALYZER_EXECUTABLE` | No | Fixed Node CLI path |
| `TS_ANALYZER_TIMEOUT_SECONDS` | No | Subprocess timeout |

No active `TS_ANALYZER_MODE=http` switch is required for MVP.

## Queue Contract

| Exchange | Queue | Routing Key | Producer | Consumer |
|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | NestJS API outbox | Python Worker |
| `lcsp.events.v1` | downstream bindings | `event.scan.completed.v1` | Python Worker outbox | TechnicalProfile projection |
| `lcsp.events.v1` | downstream bindings | `event.scan.failed.v1` | Python Worker outbox | assessment/audit projections |

The worker writes OutboxEvent in the same transaction as terminal ScanJob state. It does not publish RabbitMQ messages directly inside the domain transaction.

## Core Algorithm

```text
handle_scan_requested(payload):
  acquire idempotent job lock
  mark job RUNNING and audit
  materialize selected snapshot in restricted workspace
  enumerate bounded source files

  for each file:
    map language/support level
    Python -> ast/libcst extractors + bounded analyzers
    TS/JS -> fixed node subprocess + schema validation
    other supported -> manifest/basic signal extractor
    unsupported -> coverage limitation

  normalize facts
  build scan-local graph
  run deterministic detectors
  create redacted evidence refs
  build findings and TechnicalEvidenceReport
  persist staged metadata
  run schema/privacy/quality gates

  delete workspace and verify cleanup

  if fatal failure or cleanup failure:
    transactionally mark FAILED, audit, and stage event.scan.failed.v1
  else:
    transactionally mark COMPLETED, audit, and stage event.scan.completed.v1
```

## Python Analysis

Required capabilities:

- packages, modules, imports, aliases, decorators;
- functions, classes, methods, async calls;
- common AI/ML libraries and API invocation patterns;
- FastAPI/Flask/Django/Celery/Pydantic patterns where rules cover them;
- model input/output and local/same-module/bounded cross-module paths;
- branch, ranking, recommendation, status update, approval/rejection signals;
- human-review queue/approval paths;
- explicit limitations for dynamic import, reflection, runtime config, external calls, or incomplete paths.

## TS/JS Subprocess

Command shape:

```text
node dist/tools/ts-js-analyzer/cli.js --workspace <workspace> --request <request-json>
```

Requirements:

- use `asyncio.create_subprocess_exec`, never shell interpolation;
- cap runtime, stdout, and stderr;
- validate versioned JSON response;
- redact failure output;
- do not install repository dependencies or execute repository code;
- on failure, record `TS_JS_ANALYZER_FAILED` and affected-file coverage limitations;
- analyzer does not access RabbitMQ or persist scanner rows directly.

## Graph and Evidence

Python Worker creates a scan-local graph using Python-native node/edge structures. PostgreSQL stores normalized graph metadata only. Evidence paths are stored in `TechnicalFinding.metadata.evidencePath`; no separate graph database or Node `graphology` runtime is used.

Persisted evidence includes path/symbol/line refs, hashes, versions, confidence, and redacted metadata. Source bodies and full ASTs are excluded.

## Workspace

| Item | Decision |
|---|---|
| Root | `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}` |
| Naming | `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}` |
| Contents | selected snapshot only |
| Cleanup | every success and terminal failure path |
| Cleanup verification | mandatory before COMPLETED |
| Cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`, security audit, downstream blocked |

## Persistence Ownership

| Model | Usage |
|---|---|
| `RepositoryScanJob` | lifecycle, idempotency, runtime, terminal status, cleanup verification |
| `SourceFile` | file metadata/support/limitations |
| `CodeGraphNode`, `CodeGraphEdge` | metadata-only graph |
| `EvidenceReference` | path/symbol/line/hash refs |
| `TechnicalFinding` | normalized findings and evidence path metadata |
| `TechnicalEvidenceReport` | immutable report metadata and coverage summary |
| `AuditEvent`, `OutboxEvent` | state/security trace and queue handoff |

## Failure Behavior

| Failure | Behavior |
|---|---|
| Repository access | retryable `REPOSITORY_ACCESS_FAILED`; terminal failed event after budget |
| Single-file parser | coverage limitation and continue when safe |
| Dynamic flow | `UNSUPPORTED_DYNAMIC_FLOW`; no inference |
| TS/JS analyzer | `TS_JS_ANALYZER_FAILED`; bounded continuation |
| Redaction/privacy/schema | fail closed |
| Cleanup | terminal `SCANNER_WORKSPACE_CLEANUP_FAILED` |
| Duplicate delivery | idempotent no-op/resume according to stored state |

## Acceptance

- Python repository produces evidence-backed imports, invocations, inputs/outputs, bounded downstream actions, and human-review signals.
- Provider import without invocation never becomes confirmed use.
- Dynamic Python paths emit uncertainty.
- TS/JS repository is analyzed through subprocess and normalized into the same finding schema.
- No raw source is stored long term or sent to LLM.
- Completed event is staged only after quality-valid report and cleanup verification.
- Failure states expose redacted code, correlation ID, and actionable recovery.

## Verification Commands

```text
cd lcsp-scanner-worker
poetry install
poetry run pytest
poetry run python -m lcsp_scanner.smoke_scan --fixture golden-path-python

cd ../tools/ts-js-analyzer
npm install
npm run build
npm test
```

Integrated smoke uses real PostgreSQL and RabbitMQ; A-to-Z acceptance additionally requires approved corpus, real LLM provider, and S3-compatible storage.

## Non-Claims

- Not production deployment authorization.
- Not perfect dynamic-code analysis.
- Not legal classification logic.
- Not A2-b2 accuracy certification before implementation fixtures run.