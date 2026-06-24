# Scanner Code Map

## Purpose

Define planned code ownership for the A-to-Z runnable scanner before implementation. Python Scanner Worker owns Repository Scan lifecycle and the full scanner toolchain. TypeScript/JavaScript semantic analysis is a bounded Node.js CLI adapter.

## Repository Layout

```text
lcsp-scanner-worker/
  pyproject.toml
  src/lcsp_scanner/
    main.py
    config.py
    workspace/
      workspace_manager.py
      snapshot_materializer.py
      cleanup_verifier.py
    inventory/
      file_enumerator.py
      language_mapper.py
      ignore_policy.py
    tools/
      syft_runner.py
      knip_runner.py
      deptry_runner.py
      semgrep_runner.py
      tree_sitter_runner.py
    dependencies/
      dependency_fact_normalizer.py
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
    queue/
      consumer.py
      retry_policy.py
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

## Python Worker Ownership

| Component | Purpose | Dependencies | Owned DTOs | Owned Tables | Queues |
|---|---|---|---|---|---|
| `workspace` | Materialize commit-pinned snapshot inside restricted workspace and verify deletion. | GitHub snapshot metadata, filesystem policy. | `WorkspaceRef`, `CleanupResult` | `RepositoryScanJob`, `AuditEvent` | None |
| `inventory` | Enumerate files, enforce bounds, classify language/support. | workspace. | `SourceFileRef`, `LanguageMappingResult` | `SourceFile` | None |
| `tools` | Invoke Syft, Knip, deptry, Semgrep custom rules and tree-sitter/custom parser with pinned versions, limits and redaction. | workspace, manifests, rulesets. | `ToolRunResult`, `CoverageLimitation` | staged tool provenance | None |
| `dependencies` | Normalize SBOM/dependency output and usage states. | tool outputs, manifests, imports. | `PackageDependency`, `SBOMComponent`, `DependencyUsageFact` | dependency metadata tables | None |
| `parsers` | Extract Python AST/CST facts and basic manifest signals. | stdlib `ast`, `libcst`. | `ParsedFile`, `ImportFact`, `CallFact`, `ClassFact`, `FunctionFact` | metadata only | None |
| `analyzers` | Resolve bounded Python imports/flows and detect AI/data/decision/review signals. | parsed facts, rulesets. | `DetectionResult`, `CoverageLimitation` | staged `TechnicalFinding` | None |
| `ts_js_bridge` | Invoke Node analyzer and validate normalized JSON protocol. | Node.js, `ts-morph`. | `TsJsAnalyzerRequest`, `TsJsAnalyzerResult` | None directly | None |
| `graph` | Build scan-local evidence/dependency graph. | normalized facts. | `CodeGraphNode`, `CodeGraphEdge` | graph metadata tables | None |
| `evidence` | Create redacted evidence refs and hashes. | locations, hashes, redaction policy. | `EvidenceRef` | `EvidenceReference` | None |
| `reports` | Build and gate TechnicalEvidenceReport. | findings, graph, limitations. | `TechnicalEvidenceReport` | `TechnicalEvidenceReport`, `TechnicalFinding` | stages terminal scan event |
| `persistence` | Persist metadata and outbox events transactionally. | PostgreSQL. | persistence records | scanner tables, `OutboxEvent` | None |
| `queue` | Consume scan commands and apply idempotent retry policy. | RabbitMQ. | `ScanRequestedPayload` | `RepositoryScanJob` | consumes `lcsp.scan-worker.v1` |
| `audit` | Record state, security, and failure events. | persistence. | `AuditEventInput` | `AuditEvent` | None |

## TS/JS Analyzer Ownership

| Component | Purpose | Output |
|---|---|---|
| `cli.ts` | Accept workspace/path request from Python Worker and emit JSON to stdout. | protocol envelope |
| `project-loader.ts` | Load TSConfig/project files without installing dependencies or executing repository code. | project metadata |
| `semantic-analyzer.ts` | Resolve imports, symbols, calls, and bounded flow using `ts-morph`. | normalized facts |
| `detector-adapter.ts` | Convert TS/JS facts to scanner finding candidates. | detection results |
| `output-schema.ts` | Validate stable cross-runtime protocol. | schema-validated JSON |

The analyzer does not consume RabbitMQ, update ScanJob state, persist findings directly, or publish events.

## Runtime Flow

```text
command.scan.requested.v1
-> Python queue consumer
-> workspace materialization
-> inventory/language mapping
-> Syft SBOM/dependency inventory
-> Knip/deptry dependency usage analysis
-> Python AST/CST analysis
-> TS/JS subprocess analysis when needed
-> tree-sitter/custom parser structural augmentation
-> Semgrep custom AI rules
-> normalized graph and findings
-> report schema/quality/privacy gates
-> workspace cleanup verification
-> transactional ScanJob terminal state + OutboxEvent
```

## Persistence Boundary

Persist only:

- repository/snapshot/file metadata;
- path, symbol, and line references;
- content/evidence/report hashes;
- normalized graph nodes/edges;
- redacted findings and coverage limitations;
- scanner/tool/ruleset/config/schema versions;
- cleanup verification and audit metadata.

Never persist raw source body, full AST body, secrets, full prompts, repository archives, or subprocess stdout before validation/redaction.

## Queue Ownership

| Queue/Event | Owner |
|---|---|
| `command.scan.requested.v1` / `lcsp.scan-worker.v1` | Python Worker sole consumer |
| `event.scan.completed.v1` | Python Worker outbox after report gates and cleanup verification |
| `event.scan.failed.v1` | Python Worker outbox after terminal failure transaction |

## Authoritative Sources

| Concern | Source |
|---|---|
| Scanner behavior and taxonomy | `docs/specs/scanner-spec.md` |
| Python/TS/JS analysis behavior | `docs/specs/scanner-spec.md` |
| Runtime object journey | `docs/developer-execution-blueprints/scanner-data-journey.md` |
| Build/package detail | `docs/implementation/scanner-implementation.md`, `docs/implementation/scanner-worker-implementation.md`, `docs/implementation/python-worker-platform-implementation.md` |
| Persistence | `docs/implementation/persistence-implementation.md` |
| Queue topology | `docs/implementation/queue-implementation.md` |

## Guardrails

- Python Worker is first-class active MVP behavior, not syntax-only support.
- No Node.js scanner worker may consume the scan command.
- No dependency install, build, test, Docker, CI, repository script, or customer code execution occurs during a scan.
- Dynamic/unsupported flows produce uncertainty and coverage limitations, not invented certainty.
- Cleanup failure is terminal and blocks downstream processing.
