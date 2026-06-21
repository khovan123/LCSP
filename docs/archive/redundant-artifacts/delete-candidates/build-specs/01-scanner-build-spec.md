# 01 Scanner Build Spec

## 1. Purpose

Produce static, traceable technical evidence from a commit-pinned GitHub repository snapshot without executing customer code and without creating legal conclusions.

## 2. Runtime Ownership

| Concern            | Owner                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service name       | Scanner Service                                                                                                                                                              |
| Module name        | `scanner`                                                                                                                                                                    |
| NestJS module      | `apps/api/src/modules/scanner/scanner.module.ts`                                                                                                                             |
| Worker name        | `apps/worker/src/handlers/scan/scan-requested.handler.ts`                                                                                                                    |
| Database ownership | `RepositoryScanJob`, `StaticAnalysisScan`, `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `ScannerGraphNode`, `ScannerGraphEdge`, `ScannerEvidencePath` |
| Queue ownership    | consumes `command.scan.requested.v1`; publishes `event.scan.completed.v1`, `event.scan.failed.v1`                                                                            |

## 3. Exact Libraries

| Library                  | Version strategy    | Purpose                                                                                       | Why selected                                                                        | Alternatives reected                     |
| ------------------------ | ------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| `tree-sitter`            | pinned npm lockfile | Generic AST parsing                                                                           | Canonical parser foundation; no code execution                                      | regex-only parsing                       |
| `tree-sitter-typescript` | pinned npm lockfile | TS/JS grammar                                                                                 | Required TS/JS syntax support                                                       | Babel-only parse                         |
| `tree-sitter-javascript` | pinned npm lockfile | JS grammar fallback                                                                           | Handles plain JS syntax                                                             | Regex-only parse                         |
| `tree-sitter-python`     | pinned npm lockfile | Python syntactic coverage                                                                     | Supports Python coverage limitation mode                                            | Python runtime semantic execution        |
| `ts-morph`               | pinned npm lockfile | TS/JS project loading, import, symbol, call, and type resolution over TypeScript Compiler API | Required by Phase 5.2D for developer ergonomics while preserving compiler semantics | Raw TypeScript Compiler API direct usage |
| `typescript`             | pinned npm lockfile | Underlying compiler engine for `ts-morph`                                                     | Required peer/compiler dependency                                                   | none                                     |
| `fast-glob`              | pinned npm lockfile | File inventory                                                                                | Fast deterministic include/exclude                                                  | shell find                               |
| `ignore`                 | pinned npm lockfile | gitignore-style filtering                                                                     | Prevents scanning ignored/generated files                                           | manual string filters                    |
| `graphology`             | pinned npm lockfile | In-memory graph                                                                               | TypeScript-first graph assembly                                                     | NetworkX deferred with Python worker     |
| `zod`                    | pinned npm lockfile | Finding/report validation                                                                     | Shared contract validation                                                          | handwritten assertions                   |
| `@octokit/rest`          | pinned npm lockfile | GitHub snapshot retrieval                                                                     | GitHub App repository access                                                        | GitHub OAuth for repo access             |

## 4. Folder Structure

```text
packages/scanner/
  src/
    module/                 scanner facade and dependency injection
    snapshot/               GitHub commit snapshot and workspace inventory
    parsers/                Tree-sitter parser lifecycle and language mapping
    semantic/               ts-morph project, import, symbol, and type analysis
    analyzers/              AI invocation, data-flow, output-use detectors
    rules/                  versioned SDK/framework detection rules
    graph/                  graph node/edge/path assembly
    evidence/               TechnicalFinding and EvidenceReference builders
    redaction/              deterministic secret redaction
    persistence/            repository interfaces for API/worker persistence
    events/                 scan command/event DTOs
    dto/                    public scanner DTO schemas
```

## 5. DTO Contracts

### StartScanRequestDto

```json
{
  "assessmentId": "018f0000-0000-7000-8000-000000000101",
  "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
  "rulesetVersion": "scanner-rules-v0.1.0"
}
```

### RepositorySnapshotManifestDto

```json
{
  "snapshotId": "018f0000-0000-7000-8000-000000000103",
  "repositoryConnectionId": "018f0000-0000-7000-8000-000000000104",
  "commitSha": "abc123def456",
  "fileCount": 120,
  "supportedFileCount": 84,
  "ignoredFileCount": 36,
  "totalBytes": 850000,
  "languageSummary": { "typescript": 60, "javascript": 12, "python": 12 },
  "coverageLimitations": []
}
```

### TechnicalFindingDto

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

### ScanRequestedQueueDto

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

## 6. Database Models

### Prisma model specification

| Model                     | Fields                                                                                                                                                                                | Indexes / Unique                                       | Relationships                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `RepositoryScanJob`       | `id uuid`, `assessmentId uuid`, `repositorySnapshotId uuid`, `status`, `idempotencyKey`, `scannerVersion`, `rulesetVersion`, `requestedBy`, `startedAt`, `completedAt`, `failureCode` | unique `idempotencyKey`; index `(assessmentId,status)` | has one `StaticAnalysisScan` |
| `StaticAnalysisScan`      | `id uuid`, `scanJobId uuid`, `assessmentId uuid`, `commitSha`, `analysisLevelsUsed Json`, `coverageSummary Json`, `completedAt`                                                       | unique `scanJobId`                                     | has graph nodes/edges/report |
| `ScannerGraphNode`        | `id uuid`, `scanId uuid`, `nodeType`, `filePath`, `symbolRef`, `lineStart`, `lineEnd`, `evidenceHash`, `confidence`                                                                   | index `(scanId,nodeType)`                              | belongs to scan              |
| `ScannerGraphEdge`        | `id uuid`, `scanId uuid`, `sourceNodeId uuid`, `targetNodeId uuid`, `edgeType`, `evidenceHash`, `confidence`                                                                          | index `(scanId,edgeType)`                              | links nodes                  |
| `ScannerEvidencePath`     | `id uuid`, `scanId uuid`, `pathType`, `nodeRefs Json`, `edgeRefs Json`, `findingRefs Json`, `confidence`                                                                              | index `(scanId,pathType)`                              | referenced by findings       |
| `TechnicalEvidenceReport` | `id uuid`, `assessmentId uuid`, `scanJobId uuid`, `sourceType`, `commitSha`, `scannerVersion`, `rulesetVersion`, `reportHash`, `privacyFlags Json`, `scope Json`, `status`            | unique `reportHash`; index `assessmentId`              | has findings/gates           |
| `TechnicalFinding`        | `id uuid`, `reportId uuid`, `findingType`, `severity`, `confidence`, `evidenceRef`, `graphPathId`, `redactionStatus`                                                                  | index `(reportId,findingType)`                         | belongs to report            |

Example record:

```json
{
  "id": "018f0000-0000-7000-8000-000000000105",
  "reportId": "018f0000-0000-7000-8000-000000000107",
  "findingType": "AI_MODEL_INVOCATION",
  "severity": "INFO",
  "confidence": 0.92,
  "evidenceRef": "ev:scan:018f0000-0000-7000-8000-000000000105",
  "redactionStatus": "REDACTED_SAFE"
}
```

## 7. RabbitMQ Contracts

### `command.scan.requested.v1`

```json
{
  "eventId": "018f0000-0000-7000-8000-000000000201",
  "eventType": "command.scan.requested.v1",
  "schemaVersion": 1,
  "occurredAt": "2026-06-20T00:00:00.000Z",
  "correlationId": "018f0000-0000-7000-8000-000000000202",
  "causationId": "018f0000-0000-7000-8000-000000000203",
  "aggregateType": "Assessment",
  "aggregateId": "018f0000-0000-7000-8000-000000000101",
  "producer": "apps/api",
  "payload": {
    "scanJobId": "018f0000-0000-7000-8000-000000000106",
    "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
    "commitSha": "abc123def456",
    "scannerVersion": "scanner-v0.1.0",
    "rulesetVersion": "scanner-rules-v0.1.0"
  }
}
```

Producer: API ScanService. Consumer: scan worker. Retry: 3 transient retries. DLQ: `lcsp.scan-worker.dlq.v1`. Idempotency: `eventId` and `scanJobId`.

## 8. Algorithms

### Tree-sitter lifecycle

Input: workspace file path and language.

Processing steps:

1. Create parser singleton per language at worker startup.
2. Map extensions: `.ts/.tsx -> typescript`, `.js/.jsx -> javascript`, `.py -> python`.
3. Read file into memory only for parse.
4. Parse syntax tree.
5. Extract structural nodes: imports, calls, functions, class methods, literals, route decorators.
6. Emit `SyntaxNodeDto[]` with path, symbol, line range, node type and hash.
7. Discard source text and AST body after extraction.

Pseudocode:

```text
for file in supportedFiles:
  language = languageMap[file.extension]
  parser = parserRegistry.get(language)
  tree = parser.parse(readFile(file))
  nodes = extractSyntaxNodes(tree.rootNode, file.path)
  persistMetadataOnly(nodes)
  dispose(tree)
```

### TypeScript semantic analysis decision

Decision: use `typescript` Compiler API, not `ts-morph`, for prototype.

Project creation: create `ts.Program` from discovered `tsconfig.json` where present, otherwise create minimal compiler host over supported TS/JS files.
Source loading: load source files from workspace; no transpilation or execution.
Symbol resolution: use `program.getTypeChecker()`.
Import resolution: inspect `ImportDeclaration`, `CallExpression`, aliased symbols.
Type resolution: record symbol/type names and declaration file paths only.

Pseudocode:

```text
program = ts.createProgram(filePaths, compilerOptions)
checker = program.getTypeChecker()
for sourceFile in program.getSourceFiles():
  visit(sourceFile):
    if isCallExpression(node):
      symbol = checker.getSymbolAtLocation(node.expression)
      if matchesAiProvider(symbol, node): emitInvocationCandidate
```

### Dependency graph

Library: `graphology`.
Node: `{ id, nodeType, filePath, symbolRef, lineRange, evidenceHash, confidence }`.
Edge: `{ id, edgeType, sourceNodeId, targetNodeId, evidenceHash, confidence }`.
Persistence: normalize to `ScannerGraphNode`, `ScannerGraphEdge`, `ScannerEvidencePath`; no raw AST/source.

### AI signal detection

| Signal          | Detection rule                                                                                  | Finding                                |
| --------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------- | ------- | ------------------------------------------- |
| OpenAI SDK      | import/package `openai`, call `.chat.completions.create`, `.responses.create`                   | `AI_MODEL_INVOCATION`                  |
| Anthropic SDK   | import/package `@anthropic-ai/sdk`, call `messages.create`                                      | `AI_MODEL_INVOCATION`                  |
| Gemini SDK      | import/package `@google/generative-ai`, call `generateContent`                                  | `AI_MODEL_INVOCATION`                  |
| LangChain       | imports from `langchain`, `@langchain/*`, chains/agents invoke                                  | `AI_FRAMEWORK_USAGE`, maybe invocation |
| Vercel AI SDK   | import `ai`, calls `generateText`, `streamText`, `generateObject`                               | `AI_MODEL_INVOCATION`                  |
| Custom wrappers | function names containing `predict`, `classify`, `score`, `generate`, downstream HTTP `/predict | /infer                                 | /score` | `AI_MODEL_INVOCATION` with lower confidence |

## 9. Failure Handling

| Error code                      | Reason                                        | Recovery strategy                                    |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `SNAPSHOT_BUILD_FAILED`         | Cannot fetch commit snapshot                  | Retry if transient GitHub error; otherwise fail scan |
| `REPOSITORY_LIMIT_EXCEEDED`     | File/size limits exceeded                     | Persist coverage limitation and fail/partial block   |
| `SCANNER_PARSE_FAILED`          | Parser crashed for file                       | Mark file coverage limitation; continue if bounded   |
| `SECRET_REDACTION_FAILED`       | Secret redaction cannot guarantee safe output | Stop persistence and fail closed                     |
| `SCAN_WORKSPACE_CLEANUP_FAILED` | Workspace deletion failed                     | Raise critical audit event; retry cleanup            |

## 10. Verification

| Command                                             | Expected output                | Success criteria                                         |
| --------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| `npm run test --workspace @lcsp/scanner`            | scanner unit tests pass        | detector/parser/redaction tests green                    |
| `npm run test:integration --workspace @lcsp/worker` | scan worker integration passes | scan command creates report and no DLQ message           |
| `npm run dev --workspace @lcsp/worker`              | `worker.ready`                 | queues bound and health endpoint OK                      |
| Synthetic scan API smoke                            | `event.scan.completed.v1`      | report/finding/audit rows exist; no raw source persisted |

## ts-morph Prototype Decision

The controlled MVP prototype uses `ts-morph` as the implementation wrapper over the TypeScript Compiler API for source loading, symbol extraction, import resolution, and type resolution. This does not claim runtime scanner accuracy and does not execute source, installs, builds, tests, Docker, CI workflows, or API probes.

## Acceptance Criteria

- Given supported TS/JS source, Tree-sitter and ts-morph produce normalized evidence refs.
- Given provider SDK only, no legal-risk or high-impact conclusion is produced.
- Given dynamic or unsupported source, coverage limitation or abstention is emitted.
- Given terminal scan state, workspace cleanup is attempted and audited.
