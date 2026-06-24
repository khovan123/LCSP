# Scanner Data Journey

## Purpose

Show how a commit-pinned repository snapshot becomes canonical scanner metadata, evidence refs, findings, TechnicalEvidenceReport, terminal ScanJob state, and queue events under the Python Worker-owned runtime.

## Runtime Ownership

| Concern | Owner |
|---|---|
| Trusted scan trigger/API, PBAC, idempotent job creation | NestJS API |
| `command.scan.requested.v1` consumption | Standalone Python Worker |
| SBOM/dependency inventory | Python Worker invoking Syft |
| JS/TS dependency usage | Python Worker invoking Knip |
| Python dependency usage | Python Worker invoking deptry |
| Python static analysis | Python Worker using `ast` + `libcst` |
| TypeScript/JavaScript semantic analysis | Node.js `ts-morph` subprocess invoked by Python Worker |
| Structural augmentation | tree-sitter/custom parser |
| AI custom rules | Semgrep custom rules |
| Scan-local graph/report assembly | Python Worker |
| Terminal status, audit, and outbox event | Python Worker transaction |

No Node.js scanner worker owns the Repository Scan lifecycle.

## Concrete Python Input Example

Source file:

```text
app/loan_service.py
```

Documentation-only shape:

```python
response = client.responses.create(model="gpt-4.1", input=messages)
score = float(response.output_text)
if score > 0.7:
    reject_loan(application.id)
```

The scanner reads this file only inside the ephemeral workspace. It does not execute the code, install dependencies, or persist the source body.

## Seven-Question Trace Summary

| Question | Answer |
|---|---|
| Trigger | Verified webhook, scheduled trigger, backend trigger, or authorized Manager action creates trusted context. |
| Request | Trigger/API creates `command.scan-trigger.resolve-context.v1`; ready mapping creates `command.scan.requested.v1`. |
| API behavior | Create idempotent `TrustedScanTrigger`, mapping state, `RepositoryScanJob` when ready, `AuditEvent`, and OutboxEvent. |
| Worker | Python Worker consumes `lcsp.scan-worker.v1`. |
| DB reads/writes | Reads job/snapshot; writes SourceFile, graph metadata, EvidenceReference, TechnicalFinding, TechnicalEvidenceReport, audit, outbox. |
| Terminal events | `event.scan.completed.v1` or `event.scan.failed.v1`. |
| Final object | Accepted `TechnicalEvidenceReport` or explicit failure/coverage state. |

## Canonical Queue Choreography

| Step | Exchange | Routing Key | Queue | Owner |
|---|---|---|---|---|
| Resolve trigger | `lcsp.commands.v1` | `command.scan-trigger.resolve-context.v1` | `lcsp.scan-trigger-worker.v1` | NestJS API/webhook/scheduler outbox -> Python Scan Trigger Worker |
| Request scan | `lcsp.commands.v1` | `command.scan.requested.v1` | `lcsp.scan-worker.v1` | NestJS API outbox -> Python Worker |
| Scan completed | `lcsp.events.v1` | `event.scan.completed.v1` | downstream bindings | Python Worker outbox |
| Scan failed | `lcsp.events.v1` | `event.scan.failed.v1` | downstream/audit bindings | Python Worker outbox |

## End-to-End Data Journey

```text
TrustedScanTrigger
-> ScanMappingResolution READY
-> RepositorySnapshot(commit SHA)
-> restricted workspace
-> SourceFileRef[]
-> LanguageMappingResult[]
-> Syft SBOM/dependency facts
-> Knip/deptry dependency usage facts
-> Python AST/CST facts
-> TS/JS subprocess facts (when present)
-> tree-sitter/custom parser facts
-> Semgrep custom AI rule facts
-> normalized ParsedFile/fact model
-> CodeGraphNode[] / CodeGraphEdge[]
-> DetectionResult[]
-> EvidenceReference[]
-> TechnicalFinding[]
-> TechnicalEvidenceReport DRAFT
-> schema/privacy/quality gates
-> workspace cleanup verification
-> ScanJob COMPLETED + event.scan.completed.v1
   or ScanJob FAILED + event.scan.failed.v1
```

## Object Transformation Table

| Stage | Python/Node Component | Input | Output | Persistent Write |
|---|---|---|---|---|
| Job lock | `queue.consumer.handle_scan_requested` | `ScanRequestedPayload` | locked ScanJob | ScanJob RUNNING + audit |
| Workspace | `workspace.snapshot_materializer` | RepositorySnapshot | `WorkspaceRef` | none |
| Inventory | `inventory.file_enumerator` | WorkspaceRef | `SourceFileRef[]` | SourceFile metadata |
| Syft | `tools.syft_runner` | WorkspaceRef/manifests | SBOMComponent[] | staged dependency metadata |
| Knip/deptry | `tools.knip_runner`, `tools.deptry_runner` | WorkspaceRef/manifests/imports | DependencyUsageFact[] | staged dependency metadata |
| Language mapping | `inventory.language_mapper` | SourceFileRef | `LanguageMappingResult` | support metadata |
| Python parse | `parsers.python_ast_extractor` + `python_cst_extractor` | `.py` file | Python facts | none |
| Python semantic pass | `analyzers.python_import_resolver`, bounded flow analyzers | Python facts | enriched facts/limitations | none |
| TS/JS subprocess | `ts_js_bridge.subprocess_bridge` -> Node CLI | workspace/path request | validated JSON facts | none |
| tree-sitter/custom parser | `tools.tree_sitter_runner` | supported files | structural facts/limitations | none |
| Semgrep custom rules | `tools.semgrep_runner` | bounded source metadata | AI pattern facts/limitations | none |
| Manifest/basic signals | `parsers.manifest_extractor` | manifest/config | dependency/config facts | none |
| Graph build | `graph.graph_builder` | normalized facts | graph nodes/edges | metadata-only graph rows |
| Detection | detector/analyzer set | facts + graph | DetectionResult[] | staged findings |
| Evidence refs | `evidence.evidence_ref_factory` | locations, symbols, hashes | EvidenceReference[] | EvidenceReference rows |
| Report build | `reports.report_builder` | findings, graph, limitations | TechnicalEvidenceReport DRAFT | report/findings rows |
| Gates | schema, privacy, quality gates | report | accepted/insufficient/failed | report status + audit |
| Cleanup | `workspace.cleanup_verifier` | WorkspaceRef | CleanupResult | cleanup audit metadata |
| Terminal transaction | scanner repository/outbox | accepted report + cleanup | terminal job/event | ScanJob, AuditEvent, OutboxEvent |

## Canonical SourceFile Metadata

```json
{
  "sourceFileId": "uuidv7",
  "repositorySnapshotId": "uuidv7",
  "relativePath": "app/loan_service.py",
  "extension": ".py",
  "language": "PYTHON",
  "supportLevel": "BOUNDED_STATIC_L0_L3",
  "sizeBytes": 348,
  "contentHash": "sha256:...",
  "coverageLimitations": []
}
```

Raw source body is never part of the persistent object.

## Canonical Python Facts

```json
{
  "language": "PYTHON",
  "module": "app.loan_service",
  "imports": [{"module": "openai", "evidenceRef": "ev:...:IMPORT:1"}],
  "calls": [{"callee": "client.responses.create", "evidenceRef": "ev:...:CALL:1"}],
  "functions": [],
  "classes": [],
  "decisionPoints": [{"kind": "THRESHOLD_BRANCH", "evidenceRef": "ev:...:DECISION:3"}],
  "dataFields": [{"name": "application", "categoryHint": "FINANCIAL"}],
  "coverageLimitations": []
}
```

## TS/JS Subprocess Protocol

Python Worker invokes a fixed executable and argument list without shell interpolation:

```text
node dist/tools/ts-js-analyzer/cli.js --workspace <workspace> --request <request-json>
```

The subprocess returns a versioned JSON envelope on stdout:

```json
{
  "schemaVersion": "1.0",
  "status": "COMPLETED",
  "files": [],
  "facts": [],
  "coverageLimitations": []
}
```

Rules:

- stdout is schema-validated before use;
- stderr is redacted and bounded;
- timeout/exit-code failure yields `TS_JS_ANALYZER_FAILED` and affected-file coverage limitation;
- subprocess cannot persist DB rows or publish events;
- repository dependency installation and source execution are forbidden.

## Evidence Reference

```json
{
  "evidenceRefId": "uuidv7",
  "sourceType": "STATIC_SCAN",
  "sourceFileId": "uuidv7",
  "relativePath": "app/loan_service.py",
  "location": {"startLine": 1, "endLine": 4, "symbolRef": "evaluate_loan"},
  "evidenceHash": "sha256:normalized-metadata-only",
  "redactionStatus": "NO_SOURCE_STORED"
}
```

## Findings Example

```json
[
  {
    "findingType": "AI_MODEL_INVOCATION",
    "confidence": 0.9,
    "evidenceRefs": ["ev:...:IMPORT:1", "ev:...:CALL:1"],
    "description": "Model invocation detected through import and call evidence."
  },
  {
    "findingType": "AI_DECISION_FLOW_SIGNAL",
    "confidence": 0.75,
    "evidenceRefs": ["ev:...:CALL:1", "ev:...:DECISION:3", "ev:...:CALL:4"],
    "description": "Model output feeds a threshold branch and status-changing action."
  }
]
```

Descriptions are generated from normalized metadata and must not reproduce source text.

## Persistence Timing

1. Lock ScanJob and mark RUNNING idempotently.
2. Create restricted workspace and materialize selected snapshot.
3. Persist SourceFile metadata after inventory.
4. Build facts, graph, evidence refs, findings, and report draft.
5. Persist staged report/finding metadata and run gates.
6. Attempt workspace deletion for every success or terminal failure path.
7. Verify cleanup.
8. On accepted report plus verified cleanup, transactionally mark COMPLETED and create completed OutboxEvent.
9. On fatal failure or cleanup failure, transactionally mark FAILED, record safe reason, and create failed OutboxEvent.

`event.scan.completed.v1` must never be staged before cleanup verification.

## Failure and Coverage Behavior

| Condition | Result |
|---|---|
| Repository unavailable | `REPOSITORY_ACCESS_FAILED`; terminal failed event |
| Single-file syntax error | `SCANNER_PARSE_FAILED` limitation; bounded continuation |
| Dynamic import/reflection/runtime-only path | `UNSUPPORTED_DYNAMIC_FLOW`; no inferred certainty |
| TS/JS subprocess timeout/error | `TS_JS_ANALYZER_FAILED`; affected-file limitation |
| Secret redaction or privacy gate failure | fail closed before accepted report |
| Schema/quality gate failure | rejected/insufficient report; downstream blocked |
| Workspace cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; security audit; terminal failure |
| Duplicate command | idempotent no-op or resume according to job state |

## Downstream Handoff

Only a `QUALITY_VALID` report linked to a `COMPLETED` ScanJob with verified cleanup can trigger `command.technical-profile.requested.v1`.

## Developer Rule

When a stage cannot produce the next canonical object, it must emit a coverage limitation or explicit failure. It must not invent a stronger finding or legal conclusion.
