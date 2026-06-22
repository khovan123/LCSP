# Scanner Data Journey

## Purpose

Show exactly how one repository file becomes a canonical `ParsedFile`, scanner facts, evidence references, downstream scanner outputs, database records, and canonical queue events.

## Concrete Input Example

Source file path:

```text
src/loan.ts
```

Minimal source shape used for reasoning:

```ts
const response = await openai.chat.completions.create({ model: 'gpt-4.1', messages })
const score = Number(response.choices[0].message.content)
if (score > 0.7) {
  rejectLoan(application.id)
}
```

This snippet is documentation input only. It is not repository source code for the product.

## Seven-Question Trace Summary

| Question | Answer |
|---|---|
| User bấm nút gì? | Manager clicks `Run Repository Scan`. |
| Request đi đâu? | `POST /api/v1/assessments/:assessmentId/scans`. |
| Service nào xử lý? | API creates `RepositoryScanJob`; `ScanWorker.handleScanRequested()` performs scanner stages. |
| DB đọc/ghi gì? | Reads `RepositorySnapshot`; writes `SourceFile`, `EvidenceReference`, `CodeGraphNode`, `CodeGraphEdge`, `TechnicalFinding`, `TechnicalEvidenceReport`. |
| Queue nào được publish? | API outbox publishes `command.scan.requested.v1` to `lcsp.commands.v1`; worker outbox publishes `event.scan.completed.v1` or `event.scan.failed.v1` to `lcsp.events.v1`. |
| Worker nào consume? | `lcsp.scan-worker.v1` consumed by `ScanWorker.handleScanRequested()`. |
| Output cuối cùng là object gì? | `TechnicalEvidenceReport` with `TechnicalFinding[]` and evidence refs. |

## Canonical Queue Choreography

| Step | Exchange | Routing Key | Queue | DLQ |
|---|---|---|---|---|
| Request scan | `lcsp.commands.v1` | `command.scan.requested.v1` | `lcsp.scan-worker.v1` | `lcsp.scan-worker.dlq.v1` |
| Scan completed | `lcsp.events.v1` | `event.scan.completed.v1` | downstream bound queues | downstream DLQ |
| Scan failed | `lcsp.events.v1` | `event.scan.failed.v1` | downstream bound queues | downstream DLQ |

## Data Journey Diagram

```text
src/loan.ts
  -> SourceFileRef
  -> SourceContentSample
  -> DefaultLanguageMapper.map({ sourceFile, contentSample })
  -> LanguageMappingResult
  -> ParserRegistry.getAdapter(adapterKey)
  -> ParserAdapter.parse({ sourceFile, content })
  -> ParserAdapterParseResult
  -> TreeSitterAstExtractor.extract(parseResult)
  -> ParsedFile
  -> ImportFact[] / CallFact[] / DecisionPointFact[] / PromptFact[] / DataFieldFact[]
  -> TypeScript SemanticFacts (later stage)
  -> CodeGraphNode[] / CodeGraphEdge[]
  -> DetectionResult[]
  -> EvidenceRef[]
  -> TechnicalFinding[]
  -> TechnicalEvidenceReport
  -> PostgreSQL rows
  -> event.scan.completed.v1
```

## Object Transformation Table

| Stage | Class / Method | Input Object | Output Object | DB Write | Event |
|---|---|---|---|---|---|
| File enumeration | `RepositoryFileEnumerator.enumerate()` | `RepositorySnapshot` | `SourceFileRef[]` + `SourceContentSample[]` | `SourceFile` metadata | None |
| Language mapping | `DefaultLanguageMapper.map()` | `{ sourceFile, contentSample }` | `LanguageMappingResult` | None | None |
| Parser lookup | `ParserRegistry.getAdapter()` / `ParserRegistry.getOrUnsupported()` | `LanguageMappingResult.adapterKey` | `ParserAdapter` | None | None |
| AST parse | `ParserAdapter.parse()` | `{ sourceFile, content }` | `ParserAdapterParseResult` | None | None |
| Fact extraction | `TreeSitterAstExtractor.extract()` | `ParserAdapterParseResult` | `ParsedFile` | None | None |
| Semantic pass | `TypeScriptSemanticAnalyzer.analyze()` | `ParsedFile[]` | enriched semantic facts | None | None |
| Graph build | `DependencyGraphBuilder.build()` | parsed + semantic facts | `CodeGraphBuildResult` | `CodeGraphNode`, `CodeGraphEdge` | None |
| AI detection | `AIDetectorEngine.runAll()` | `DetectorInput` | `DetectionResult[]` | Draft findings in memory | None |
| Evidence generation | `EvidenceRefFactory.createLocationRef()` / `createFileRef()` | source location/fact metadata | `EvidenceRef` | `EvidenceReference` metadata | None |
| Finding build | `TechnicalFindingBuilder.fromDetection()` | `DetectionResult` | `TechnicalFinding` | `TechnicalFinding` | None |
| Report build | `TechnicalEvidenceReportBuilder.build()` | findings + limitations | `TechnicalEvidenceReport` | `TechnicalEvidenceReport` | None |
| Gates | `EvidenceSchemaGate`, `EvidenceQualityGate` | report | pass/fail result | gate audit | Failure event only |
| Cleanup verification | `ScanWorker.verifyWorkspaceCleanup()` | workspace ref + report | cleanup pass/fail | `AuditEvent` on failure | `event.scan.failed.v1` on failure |
| Completion | `ScanWorker.handleScanRequested()` followed by `ScanWorker.publishScanCompletedEvent()` | report + cleanup pass | `ScanCompletedPayload` | `OutboxEvent` | `event.scan.completed.v1` |

## Expected SourceFileRef Object

```json
{
  "sourceFileId": "018f0000-0000-7000-8000-000000000201",
  "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
  "relativePath": "src/loan.ts",
  "extension": ".ts",
  "sizeBytes": 348,
  "contentHash": "sha256:metadata-only-hash",
  "generatedHint": false,
  "minifiedHint": false
}
```

## Expected LanguageMappingResult Object

```json
{
  "sourceFile": {
    "sourceFileId": "018f0000-0000-7000-8000-000000000201",
    "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
    "relativePath": "src/loan.ts",
    "extension": ".ts",
    "sizeBytes": 348,
    "contentHash": "sha256:metadata-only-hash"
  },
  "language": "TYPESCRIPT",
  "supportLevel": "FULL_STATIC",
  "adapterKey": "typescript",
  "isIgnored": false,
  "isGenerated": false,
  "isMinified": false,
  "isOversized": false,
  "issues": [],
  "coverageLimitations": []
}
```

## Expected ParsedFile Object

```json
{
  "sourceFile": {
    "sourceFileId": "018f0000-0000-7000-8000-000000000201",
    "repositorySnapshotId": "018f0000-0000-7000-8000-000000000102",
    "relativePath": "src/loan.ts",
    "extension": ".ts",
    "sizeBytes": 348,
    "contentHash": "sha256:metadata-only-hash"
  },
  "language": "TYPESCRIPT",
  "supportLevel": "FULL_STATIC",
  "imports": [
    {
      "factId": "fact_import_openai_001",
      "sourceFileId": "018f0000-0000-7000-8000-000000000201",
      "importedModule": "openai",
      "importedNames": ["OpenAI"],
      "defaultImport": "OpenAI",
      "importKind": "ES_IMPORT",
      "location": { "filePath": "src/loan.ts", "startLine": 1, "endLine": 1 },
      "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:IMPORT:1"
    }
  ],
  "exports": [],
  "calls": [
    {
      "factId": "fact_call_openai_001",
      "sourceFileId": "018f0000-0000-7000-8000-000000000201",
      "calleeText": "openai.chat.completions.create",
      "receiverText": "openai.chat.completions",
      "callKind": "METHOD_CALL",
      "argumentKinds": ["OBJECT_LITERAL"],
      "awaited": true,
      "location": { "filePath": "src/loan.ts", "startLine": 1, "endLine": 1 },
      "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:CALL:1"
    },
    {
      "factId": "fact_call_reject_loan_001",
      "sourceFileId": "018f0000-0000-7000-8000-000000000201",
      "calleeText": "rejectLoan",
      "callKind": "CALL_EXPRESSION",
      "argumentKinds": ["IDENTIFIER"],
      "awaited": false,
      "location": { "filePath": "src/loan.ts", "startLine": 4, "endLine": 4 },
      "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:CALL:4"
    }
  ],
  "functions": [],
  "classes": [],
  "decisionPoints": [
    {
      "factId": "fact_decision_score_threshold_001",
      "sourceFileId": "018f0000-0000-7000-8000-000000000201",
      "decisionKind": "THRESHOLD_BRANCH",
      "conditionSummary": "AI_OUTPUT > NUMERIC_LITERAL",
      "relatedCallEvidenceRefs": [
        "ev:018f0000-0000-7000-8000-000000000201:CALL:1",
        "ev:018f0000-0000-7000-8000-000000000201:CALL:4"
      ],
      "location": { "filePath": "src/loan.ts", "startLine": 3, "endLine": 5 },
      "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:DECISION_POINT:3"
    }
  ],
  "promptFacts": [],
  "dataFieldFacts": [
    {
      "factId": "fact_data_loan_001",
      "sourceFileId": "018f0000-0000-7000-8000-000000000201",
      "fieldName": "loan",
      "categoryHint": "FINANCIAL",
      "location": { "filePath": "src/loan.ts", "startLine": 4, "endLine": 4 },
      "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:DATA_FIELD:4"
    }
  ],
  "parseIssues": [],
  "coverageLimitations": []
}
```

## Expected EvidenceRef Object

```json
{
  "evidenceRefId": "018f0000-0000-7000-8000-000000000301",
  "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:CALL:1",
  "sourceFileId": "018f0000-0000-7000-8000-000000000201",
  "relativePath": "src/loan.ts",
  "location": { "filePath": "src/loan.ts", "startLine": 1, "endLine": 1 },
  "evidenceHash": "sha256:normalized-metadata-only",
  "redactionStatus": "NO_SOURCE_STORED"
}
```

## Expected Graph Objects

```json
{
  "nodes": [
    { "nodeId": "node:file:loan", "type": "FILE", "label": "src/loan.ts" },
    { "nodeId": "node:provider:openai", "type": "AI_PROVIDER", "label": "OpenAI" },
    { "nodeId": "node:call:openai-chat", "type": "CALL", "label": "chat.completions.create" },
    { "nodeId": "node:decision:score-threshold", "type": "DECISION_POINT", "label": "score threshold" },
    { "nodeId": "node:action:reject-loan", "type": "DOWNSTREAM_ACTION", "label": "rejectLoan" }
  ],
  "edges": [
    { "type": "IMPORTS", "fromNodeId": "node:file:loan", "toNodeId": "node:provider:openai", "confidence": 0.8 },
    { "type": "CALLS", "fromNodeId": "node:file:loan", "toNodeId": "node:call:openai-chat", "confidence": 0.9 },
    { "type": "FEEDS", "fromNodeId": "node:call:openai-chat", "toNodeId": "node:decision:score-threshold", "confidence": 0.75 },
    { "type": "TRIGGERS_ACTION", "fromNodeId": "node:decision:score-threshold", "toNodeId": "node:action:reject-loan", "confidence": 0.75 }
  ]
}
```

## Expected TechnicalFinding Objects

```json
[
  {
    "findingId": "tf_001",
    "scanJobId": "scan_001",
    "findingType": "AI_MODEL_INVOCATION",
    "confidence": 0.9,
    "filePath": "src/loan.ts",
    "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:CALL:1",
    "evidenceRefs": [
      "ev:018f0000-0000-7000-8000-000000000201:IMPORT:1",
      "ev:018f0000-0000-7000-8000-000000000201:CALL:1"
    ],
    "description": "OpenAI invocation detected through package import and chat completion call."
  },
  {
    "findingId": "tf_002",
    "scanJobId": "scan_001",
    "findingType": "AI_DECISION_FLOW_SIGNAL",
    "confidence": 0.75,
    "filePath": "src/loan.ts",
    "evidenceRef": "ev:018f0000-0000-7000-8000-000000000201:DECISION_POINT:3",
    "evidenceRefs": [
      "ev:018f0000-0000-7000-8000-000000000201:CALL:1",
      "ev:018f0000-0000-7000-8000-000000000201:DECISION_POINT:3",
      "ev:018f0000-0000-7000-8000-000000000201:CALL:4"
    ],
    "description": "AI output appears to feed a threshold branch that triggers loan rejection."
  }
]
```

## Persistence Timing

1. `SourceFile` rows are written after file enumeration.
2. Evidence refs are created during extraction and persisted as metadata only.
3. Graph rows are written only after graph build completes.
4. `TechnicalFinding` rows are written only after detector output is converted into redacted evidence-backed findings.
5. `TechnicalEvidenceReport` row is written after report hash is generated.
6. Workspace cleanup is verified after report gates.
7. `event.scan.completed.v1` is written to outbox only after Schema Gate, Quality Gate and cleanup verification pass.
8. Cleanup failure writes `event.scan.failed.v1` with `SCANNER_WORKSPACE_CLEANUP_FAILED` and blocks downstream processing.

## Developer Rule

If a stage cannot produce the next object in this document, it must emit a coverage limitation or failure state. It must not invent a stronger finding.
