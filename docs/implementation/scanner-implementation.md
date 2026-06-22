# Scanner Implementation

## Status

AUTHORITATIVE BUILD DOCUMENT

## Purpose

Single build source for implementing the controlled MVP static-analysis scanner.

Domain behavior lives in `docs/specs/scanner-spec.md`. Runtime flow lives in `docs/developer-execution-blueprints/scanner-data-journey.md`. Physical persistence lives in `docs/implementation/persistence-implementation.md`. Queue topology lives in `docs/implementation/queue-implementation.md`.

## Build Boundary

- Static analysis only.
- No customer source execution.
- No scanner-initiated npm install, build, test, Docker, CI, package script execution or API probing.
- No raw source, full prompts, secrets, provider tokens, repository credentials, full repository archives or full AST bodies in long-term persistence, queue payloads, audit logs or LLM inputs.
- Python receives Tree-sitter syntax-only coverage. Python semantic import/type analysis is not active controlled MVP behavior.

## Controlled MVP Scanner Scope

The active scanner documentation covers the full controlled MVP scanner path, not only the parser foundation slice. The MVP scanner owns:

1. Commit-pinned repository snapshot materialization into a restricted temporary workspace.
2. Deterministic file enumeration, ignore handling, file-size checks, generated-file checks and minified-file checks.
3. Language mapping, parser adapter selection, unsupported-file handling and Tree-sitter AST extraction.
4. TS/JS semantic enrichment through `ts-morph`.
5. Python syntax-only extraction for imports, functions, classes and simple calls.
6. In-memory graph construction with `graphology`.
7. AI provider, framework, invocation, output, decision-flow, prompt and data-field signal detection.
8. Evidence reference generation from normalized metadata only.
9. Metadata-only persistence of source files, graph nodes/edges, evidence references, findings and technical evidence reports.
10. Workspace cleanup verification and audit logging.
11. Outbox emission of `event.scan.completed.v1` or `event.scan.failed.v1`.

The parser foundation slice implements `ParserRegistry`, `LanguageMapper`, `UnsupportedParserAdapter`, `TreeSitterAstExtractor`, DTO/types and `EvidenceRefFactory`; that slice is a prerequisite for the full scanner MVP, not the scope of this document.

## Runtime Ownership

| Concern | Controlled MVP Decision |
|---|---|
| Service name | Scanner Service |
| Package | `packages/scanner` |
| API module | `apps/api/src/modules/scans` |
| Worker handler | `apps/worker/src/handlers/scan/scan-requested.handler.ts` |
| Runtime | Node.js / TypeScript worker in npm workspaces |
| Syntax parser | Tree-sitter |
| TS/JS semantic layer | ts-morph |
| Graph runtime | graphology in memory |
| Persistence | PostgreSQL metadata only |
| Queue | consumes `command.scan.requested.v1`; publishes `event.scan.completed.v1` or `event.scan.failed.v1` through outbox |

## Exact Libraries

| Library | Purpose | Reason | Not Used |
|---|---|---|---|
| `tree-sitter` | Generic syntax parsing. | Canonical static parser foundation. | Regex-only parsing. |
| `tree-sitter-typescript` | TypeScript/TSX grammar. | Required TS/TSX syntax support. | Babel-only parsing. |
| `tree-sitter-javascript` | JavaScript/JSX/MJS/CJS grammar. | Required JS-family syntax support. | Regex-only parsing. |
| `tree-sitter-python` | Python syntax-only coverage. | Supports Python import/function/class/simple-call extraction without Python execution. | Python runtime execution. |
| `ts-morph` | TS/JS import, symbol, call and type resolution wrapper. | Developer-friendly wrapper over TypeScript compiler services. | Direct raw TypeScript Compiler API in scanner code. |
| `typescript` | Compiler engine for ts-morph. | Required dependency. | none. |
| `fast-glob` | File enumeration. | Deterministic include/exclude traversal. | shell `find`. |
| `ignore` | Ignore policy. | `.gitignore`-style filtering. | manual path filters only. |
| `graphology` | In-memory dependency/evidence graph. | TypeScript-first graph implementation. | NetworkX. |
| `zod` | DTO/report validation. | Schema gate before persistence. | unchecked objects. |
| `@octokit/rest` | GitHub metadata/snapshot retrieval boundary. | GitHub App repository access. | GitHub OAuth as repository authorization. |

## Folder Structure

```text
packages/scanner/
  src/
    parsers/          ParserRegistry, LanguageMapper, ParserAdapter, TreeSitterAstExtractor
    semantic/         ts-morph TS/JS semantic analysis
    analyzers/        AI provider/framework/data-flow detectors
    rules/            versioned detector rulesets
    graph/            graphology graph builders and evidence paths
    evidence/         EvidenceRefFactory and metadata hashing
    redaction/        secret/prompt/source redaction helpers
    reports/          TechnicalEvidenceReport builders and validation
    persistence/      repository interfaces implemented by API/worker persistence layer
    events/           scan command/completed/failed DTOs
    dto/              scanner DTOs shared across package internals
```

## Configuration

| Key | Secret? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection. |
| `RABBITMQ_URL` | Yes | RabbitMQ broker. |
| `LCSP_ENV` | No | Environment label. |
| `LCSP_LOG_LEVEL` | No | Structured logging level. |
| `LCSP_SCANNER_WORKSPACE_ROOT` | No | Temporary source workspace; fallback `.lcsp/tmp/scanner-workspaces`. |
| `SCANNER_MAX_FILES` | No | Repository file-count limit. |
| `SCANNER_RULESET_VERSION` | No | Detector ruleset version. |

## Scanner Workspace

| Item | Controlled MVP Decision |
|---|---|
| Workspace root | `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}` |
| Workspace naming | `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}` |
| Allowed contents | Temporary cloned or materialized files for the selected commit-pinned snapshot only. |
| Cleanup | Delete immediately after scan completion or terminal failure. |
| Cleanup failure | Mark scan failed with `SCANNER_WORKSPACE_CLEANUP_FAILED`, emit security-sensitive audit, and do not continue downstream. |
| Persisted data | Paths, hashes, sizes, language/support metadata, evidence refs, graph node/edge metadata, findings, reports and redacted failure codes only. |

## API and Queue Inputs

### StartRepositoryScanRequestDto

```json
{
  "assessmentId": "018f0000-0000-7000-8000-000000000101",
  "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
  "rulesetVersion": "scanner-rules-v0.1.0"
}
```

### ScanRequestedPayload

```json
{
  "scanJobId": "018f0000-0000-7000-8000-000000000106",
  "assessmentId": "018f0000-0000-7000-8000-000000000101",
  "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
  "commitSha": "abc123def456",
  "scannerVersion": "scanner-v0.1.0",
  "rulesetVersion": "scanner-rules-v0.1.0"
}
```

Queue envelope and routing are defined in `docs/implementation/queue-implementation.md`.

## Scanner Outputs

### ParsedFile

`TreeSitterAstExtractor.extract(...)` returns the canonical `ParsedFile` shape from `docs/specs/scanner-spec.md`:

```text
ParsedFile
  sourceFile
  language
  supportLevel
  imports
  exports
  calls
  functions
  classes
  decisionPoints
  promptFacts
  dataFieldFacts
  parseIssues
  coverageLimitations
```

### TechnicalFinding

```json
{
  "findingId": "018f0000-0000-7000-8000-000000000105",
  "findingType": "AI_MODEL_INVOCATION",
  "confidence": 0.92,
  "filePath": "src/services/loan.service.ts",
  "symbolRef": "LoanService.scoreApplication",
  "lineRange": { "start": 42, "end": 57 },
  "evidenceRef": "ev:scan:018f0000-0000-7000-8000-000000000105",
  "rulesetVersion": "scanner-rules-v0.1.0",
  "coverageLimitations": []
}
```

### TechnicalEvidenceReport

```json
{
  "technicalEvidenceReportId": "018f0000-0000-7000-8000-000000000107",
  "scanJobId": "018f0000-0000-7000-8000-000000000106",
  "reportHash": "sha256:normalized-report-hash",
  "scannerVersion": "scanner-v0.1.0",
  "rulesetVersion": "scanner-rules-v0.1.0",
  "coverageSummary": {
    "supportedFileCount": 84,
    "unsupportedFileCount": 12,
    "limitations": []
  }
}
```

## Persistence Ownership

Use the canonical Prisma schema in `docs/implementation/persistence-implementation.md`.

| Model | Scanner Usage |
|---|---|
| `RepositoryScanJob` | Scan lifecycle, idempotency, terminal status and failure code. |
| `SourceFile` | Snapshot file metadata, language/support level, size, hash and coverage limitations. |
| `CodeGraphNode` | Metadata-only graph nodes. |
| `CodeGraphEdge` | Metadata-only graph edges. |
| `EvidenceReference` | File/symbol/location/hash references. |
| `TechnicalFinding` | Normalized finding metadata. |
| `TechnicalEvidenceReport` | Immutable report metadata and coverage summary. |

`ScannerEvidencePath` is not a separate physical table in the controlled MVP. Store it as structured JSON in `TechnicalFinding.metadata.evidencePath`:

```json
{
  "pathType": "MODEL_INVOCATION_TO_DECISION_FLOW",
  "nodeIds": ["018f0000-0000-7000-8000-000000000201"],
  "edgeIds": ["018f0000-0000-7000-8000-000000000301"],
  "evidenceRefIds": ["018f0000-0000-7000-8000-000000000401"],
  "confidence": 0.84,
  "coverageLimitations": []
}
```

## Queue Contract

| Exchange | Queue | Routing Key | Producer | Consumer | Retry/DLQ |
|---|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | API outbox | Scan worker | 3 attempts, then `lcsp.scan-worker.dlq.v1` |
| `lcsp.events.v1` | orchestration binding | `event.scan.completed.v1` | Scan worker outbox | TechnicalProfile trigger / projections | reference-only payload |
| `lcsp.events.v1` | orchestration binding | `event.scan.failed.v1` | Scan worker outbox | Assessment projection / audit | reference-only payload |

No worker publishes directly to RabbitMQ inside the domain transaction. Workers write `OutboxEvent`; the outbox publisher publishes later.

## Core Processing Algorithm

```text
handleScanRequested(payload):
  job = lockJob(payload.scanJobId)
  snapshot = loadRepositorySnapshot(payload.repositorySnapshotId)
  workspace = materializeSnapshot(snapshot)
  sourceFiles = enumerateSourceFiles(snapshot)
  parsedFiles = []

  for sourceFile in sourceFiles:
    contentSample = fileEnumerator.sample(sourceFile)
    mapping = languageMapper.map({ sourceFile, contentSample })
    adapter = parserRegistry.getOrUnsupported(mapping.adapterKey)

    if mapping.isIgnored or mapping.supportLevel == 'UNSUPPORTED':
      parseResult = adapter.parse({ sourceFile, content: '' })
    else:
      content = workspace.readUtf8(sourceFile.relativePath)
      parseResult = adapter.parse({ sourceFile, content })

    parsedFile = treeSitterAstExtractor.extract(parseResult)
    parsedFiles.push(parsedFile)
    discard(content)

  semanticFacts = tsMorphAnalyzer.analyze(parsedFiles where supportLevel == FULL_STATIC)
  graph = graphBuilder.build(parsedFiles, semanticFacts)
  findings = detectorEngine.runAll(graph, parsedFiles, semanticFacts)
  evidence = evidenceRefFactory.attachRefs(findings)
  report = reportGenerator.generate(evidence, graph)

  transaction:
    save SourceFile metadata
    save CodeGraphNode/CodeGraphEdge metadata
    save EvidenceReference rows
    save TechnicalFinding rows
    save TechnicalEvidenceReport
    write AuditEvent

  cleanup workspace

  if cleanup fails:
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

Failure behavior:

- Parse failure for one file emits `SCANNER_PARSE_FAILED` and coverage limitation; continue when bounded.
- Unsupported/generated/minified/oversized file emits coverage limitation and empty facts.
- Secret redaction failure fails closed before persistence.
- Workspace cleanup failure marks scan failed with `SCANNER_WORKSPACE_CLEANUP_FAILED`, emits security-sensitive audit, and blocks downstream.

## Scanner Foundation Contracts

These contracts define the scanner parser foundation used by the full controlled MVP scanner. They are sufficient for the parser foundation slice covering `ParserRegistry`, `LanguageMapper`, `UnsupportedParserAdapter`, `TreeSitterAstExtractor`, scanner DTO/types and `EvidenceRefFactory`.

### Foundation Files

```text
packages/scanner/src/parsers/types.ts
packages/scanner/src/parsers/parser-registry.ts
packages/scanner/src/parsers/language-mapper.ts
packages/scanner/src/parsers/unsupported-parser-adapter.ts
packages/scanner/src/parsers/tree-sitter-ast-extractor.ts
packages/scanner/src/evidence/evidence-ref-factory.ts
```

### ParserRegistry

```ts
export class ScannerParserRegistry implements ParserRegistry {
  private readonly adapters = new Map<ParserAdapterKey, ParserAdapter>()

  register(adapter: ParserAdapter): void
  getAdapter(adapterKey: ParserAdapterKey): ParserAdapter | undefined
  getOrUnsupported(adapterKey: ParserAdapterKey): ParserAdapter
  initializeAll(): Promise<void>
}
```

Rules:

1. Instantiate once per worker process.
2. Register adapter keys: `typescript`, `javascript`, `python`, `unsupported`.
3. Do not register TSX/JSX/MJS/CJS as separate grammars.
4. `getOrUnsupported(...)` returns `UnsupportedParserAdapter` when a requested adapter is missing.
5. Initialization errors become `SCANNER_PARSER_INIT_FAILED`.

### LanguageMapper

```ts
export class DefaultLanguageMapper implements LanguageMapper {
  map(input: {
    sourceFile: SourceFileRef
    contentSample?: SourceContentSample
  }): LanguageMappingResult
}
```

Rules:

| Condition | Language | Support Level | Adapter Key |
|---|---|---|---|
| `.ts`, `.tsx` | `TYPESCRIPT` | `FULL_STATIC` | `typescript` |
| `.js`, `.jsx`, `.mjs`, `.cjs` | `JAVASCRIPT` | `FULL_STATIC` | `javascript` |
| `.py` | `PYTHON` | `SYNTAX_ONLY` | `python` |
| `.java`, `.kt`, `.go`, `.cs`, `.rs` | matching language | `BASIC_SIGNAL_ONLY` | `unsupported` |
| binary, generated, minified, oversized, unknown | `UNKNOWN` | `UNSUPPORTED` | `unsupported` |

`LanguageMapper` does not read files. File enumeration supplies `SourceContentSample`.

### ManifestConfigSignalExtractor

`BASIC_SIGNAL_ONLY` languages are handled before parser adapter selection by `ManifestConfigSignalExtractor`.

```ts
export class ManifestConfigSignalExtractor {
  extract(input: {
    assessmentId: string
    scanJobId: string
    sourceFiles: SourceFileRef[]
    repositoryManifests: ManifestMetadata[]
    dependencyMetadata: DependencyMetadata[]
  }): TechnicalFindingDraft[]
}
```

Rules:

- Runs before `ParserRegistry.getAdapter(...)`.
- Reads only manifest/config/dependency metadata, file paths and optional import-like metadata from repository inventory.
- May emit `AI_PROVIDER_USAGE`, `AI_FRAMEWORK_USAGE`, `DOMAIN_CONTEXT_SIGNAL` and `SCAN_COVERAGE_LIMITATION` findings.
- Must not emit `AI_MODEL_INVOCATION`, `AI_DECISION_FLOW_SIGNAL` or `AUTOMATED_DECISION_SIGNAL` for BASIC_SIGNAL_ONLY files.
- `UnsupportedParserAdapter` remains responsible only for unsupported parse results and file-level coverage limitations.

### UnsupportedParserAdapter

```ts
export class DefaultUnsupportedParserAdapter implements UnsupportedParserAdapter {
  adapterKey: 'unsupported'
  language: 'UNKNOWN'

  parse(input: { sourceFile: SourceFileRef; content: string }): ParserAdapterParseResult
}
```

Behavior:

- Never throws for unsupported language.
- Returns `treeAvailable: false`.
- Adds `UNSUPPORTED_LANGUAGE` issue with severity `INFO`.
- Adds `UNSUPPORTED_LANGUAGE` coverage limitation with file-level evidence ref.

### TreeSitterAstExtractor

```ts
export class TreeSitterAstExtractor implements AstExtractor {
  constructor(private readonly evidenceRefFactory: EvidenceRefFactory) {}

  extract(parseResult: ParserAdapterParseResult): ParsedFile
}
```

Processing:

1. Receive `ParserAdapterParseResult`.
2. If `treeAvailable` is false, return `ParsedFile` with empty fact arrays and propagated issues/coverage limitations.
3. Traverse parse tree wrapper.
4. Extract imports, exports, calls, functions, classes, decision points, prompt facts and data field facts using `docs/specs/scanner-spec.md`.
5. Create evidence refs during extraction using normalized metadata only.
6. Return `ParsedFile`; do not return raw source or full AST body.

### EvidenceRefFactory

Evidence refs are created during extraction. Hash input is normalized metadata, not full source text.

Allowed `stableText` values:

- symbol name;
- module specifier;
- callee chain;
- normalized condition summary;
- redacted metadata.

Forbidden:

- raw full source body;
- raw prompt;
- secret value;
- full AST body.

## Scanner Foundation Acceptance Criteria

- Given `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` or `.py`, `DefaultLanguageMapper.map`, `ParserRegistry.getOrUnsupported`, `ParserAdapter.parse` and `TreeSitterAstExtractor.extract` produce canonical `ParsedFile`.
- Given `.tsx`, `.jsx`, `.mjs` or `.cjs`, registry lookup uses adapter keys, not separate extension-specific grammar registrations.
- Given `.java`, `.kt`, `.go`, `.cs`, `.rs`, binary, generated, minified, oversized or unknown files, `UnsupportedParserAdapter` returns no tree and extractor returns empty fact arrays with coverage limitations.
- Given Python source, scanner extracts syntax-only imports, functions, classes and simple calls, emits `PYTHON_SEMANTIC_ANALYSIS_DEFERRED`, and does not perform Python semantic import resolution.
- Given parser init or parse failure, scanner emits `SCANNER_PARSER_INIT_FAILED` or `SCANNER_PARSE_FAILED`, preserves evidence refs, and does not persist raw source or full AST.

## Full MVP Scanner Acceptance Criteria

- Given a commit-pinned repository snapshot, scanner materializes only the selected snapshot into the restricted temporary workspace and deletes that workspace after completion or terminal failure.
- Given supported TS/JS files, scanner produces parsed facts, semantic facts, graph nodes/edges, evidence references, technical findings and a technical evidence report using metadata-only persistence.
- Given Python files, scanner performs syntax-only extraction and records coverage limitations for deferred Python semantic analysis.
- Given unsupported, generated, minified or oversized files, scanner records coverage limitations and does not infer unsupported certainty.
- Given AI provider package presence without invocation or downstream usage evidence, scanner must not produce a high-impact legal-risk conclusion.
- Given AI model invocation plus output/branch/action evidence, scanner creates evidence-backed technical findings that downstream TechnicalProfile and AIUsageFlow can consume.
- Given any scan outcome, scanner writes audit evidence and emits the canonical outbox event instead of publishing directly to RabbitMQ inside a domain transaction.

## Verification

| Command | Expected Output | Success Criteria |
|---|---|---|
| `npm run test:scanner` | Scanner parser/language/extractor tests pass. | ParserRegistry, LanguageMapper, UnsupportedParserAdapter, TreeSitterAstExtractor and EvidenceRefFactory tests green. |
| `npm run smoke:scan-fixture` | Scan fixture creates report or explicit blocked reason. | No raw source/full AST persisted; scan emits completed or failed event through outbox. |

## Explicit Non-Claims

- This scanner implementation document does not claim production readiness.
- It does not claim runtime scanner accuracy acceptance.
- It does not complete A2-b2 empirical scanner validation.
- It does not create legal conclusions.
- It does not authorize source execution or customer deployment.
