# 07 Scanner Construction Manual

## Purpose

Define scanner implementation order from parser registry through persistence and worker handling.

Documentation only: these definitions instruct future code creation but do not create source files.

## Exact files to create

```text
packages/scanner/src/parsers/parser-registry.ts
packages/scanner/src/parsers/language-mapper.ts
packages/scanner/src/parsers/ast-extractor.ts
packages/scanner/src/parsers/import-extractor.ts
packages/scanner/src/semantic/typescript-semantic-analyzer.ts
packages/scanner/src/graph/scanner-graph-builder.ts
packages/scanner/src/detectors/ai-detector-engine.ts
packages/scanner/src/evidence/evidence-generator.ts
packages/scanner/src/reports/report-generator.ts
packages/scanner/src/persistence/scanner.repository.ts
packages/scanner/src/workers/scan.worker.ts
```

## Interfaces

```ts
interface ParserRegistry { getParser(language: SupportedLanguage): TreeSitterParser }
interface AstFact { filePath: string; fileHash: string; language: string; nodeType: string; name?: string; startLine: number; endLine: number }
interface DetectorFinding { findingType: string; confidence: number; filePath: string; evidenceRef: string; metadata: Record<string, unknown> }
interface TechnicalEvidenceReportDraft { scanJobId: string; findings: DetectorFinding[]; graphNodes: GraphNode[]; graphEdges: GraphEdge[]; coverageLimitations: string[] }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `ParserRegistry` | Own Tree-sitter parser lifecycle. | language grammars | `register()`, `getParser()`, `parse()` |
| `LanguageMapper` | Map extension to language/support level. | config | `detectLanguage()`, `isSupported()` |
| `AstExtractor` | Convert syntax tree to normalized facts. | parser registry | `extractFacts()`, `extractCalls()`, `extractImports()` |
| `ImportExtractor` | Extract dependency/import facts. | AST facts | `fromPackageJson()`, `fromSourceFile()` |
| `ScannerGraphBuilder` | Build graphology graph. | graphology | `buildGraph()`, `addNode()`, `addEdge()`, `createEvidencePath()` |
| `AIDetectorEngine` | Run provider/framework detectors. | detector array | `runAll()`, `mergeFindings()` |
| `EvidenceGenerator` | Create stable evidence refs. | hash service | `createEvidenceRef()`, `redactMetadata()` |
| `ReportGenerator` | Build schema-valid report. | zod schemas | `generate()`, `hashReport()`, `validate()` |
| `ScannerRepository` | Persist report/finding/graph. | Prisma | `saveReport()`, `markJobCompleted()`, `markJobFailed()` |
| `ScanWorker` | Consume scan command. | builder, scanner, repository | `handleScanRequested()` |

## DTO Catalog

```ts
interface ScanRequestedPayload { assessmentId: string; scanJobId: string; repositorySnapshotId: string; commitSha: string; rulesetVersion: string }
interface TechnicalFindingDto { findingId: string; scanJobId: string; findingType: string; confidence: number; filePath: string; evidenceRef: string }
interface TechnicalEvidenceReportDto { technicalEvidenceReportId: string; scanJobId: string; reportHash: string; findings: TechnicalFindingDto[] }
```

## Database Schema

```prisma
model RepositorySnapshot { id String @id @db.Uuid assessmentId String @db.Uuid repositoryConnectionId String @db.Uuid branchName String commitSha String manifest Json createdByUserId String @db.Uuid createdAt DateTime @default(now()) @@unique([repositoryConnectionId, commitSha]) }
model RepositoryScanJob { id String @id @db.Uuid assessmentId String @db.Uuid repositorySnapshotId String @db.Uuid status ScanJobStatus @default(REQUESTED) rulesetVersion String idempotencyKey String @unique failureReason String? startedAt DateTime? completedAt DateTime? }
model TechnicalEvidenceReport { id String @id @db.Uuid assessmentId String @db.Uuid scanJobId String @unique @db.Uuid schemaVersion String scannerVersion String rulesetVersion String reportHash String qualityResult GateResult createdAt DateTime @default(now()) }
model TechnicalFinding { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid findingType String confidence Float filePath String evidenceRef String metadata Json @@index([technicalEvidenceReportId, findingType]) }
model EvidenceReference { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid evidenceRef String filePath String fileHash String span Json? signalId String metadata Json @@unique([technicalEvidenceReportId, evidenceRef]) }
model CodeGraphNode { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid nodeType String filePath String? evidenceRef String? metadata Json @@index([technicalEvidenceReportId, nodeType]) }
model CodeGraphEdge { id String @id @db.Uuid technicalEvidenceReportId String @db.Uuid edgeType String fromNodeId String @db.Uuid toNodeId String @db.Uuid evidenceRef String? confidence Float @@index([technicalEvidenceReportId, edgeType]) }
```

## State Machines

`SNAPSHOT_CREATED` -> `SCAN_REQUESTED` -> `SCAN_RUNNING` -> `SCAN_COMPLETED` or failed/blocked. Classification and document actions are denied until `VERIFIED_PROFILE_READY` and later gates.

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer | Payload |
|---|---|---|---|---|---|
| `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `command.scan.requested.v1` | API outbox | `ScanWorker` | `ScanRequestedPayload` |
| `lcsp.events.v1` | downstream | `event.scan.completed.v1` | `ScanWorker` | profile/AIUsageFlow requester | `ScanCompletedPayload` |
| `lcsp.events.v1` | downstream | `event.scan.failed.v1` | `ScanWorker` | status/audit | `ScanFailedPayload` |

## Algorithms

Implementation order:

1. Parser Registry.
2. Language Mapper.
3. AST Extractor.
4. Import Extractor.
5. Semantic Analyzer.
6. Dependency Graph Builder.
7. AI Detector Engine.
8. Evidence Generator.
9. Report Generator.
10. Persistence Layer.
11. Worker.

Pseudocode:
```text
handleScanRequested(payload):
  job = lockJob(payload.scanJobId)
  manifest, workspace = snapshotBuilder.build(payload)
  files = languageMapper.filter(manifest.files)
  facts = files.flatMap(file => astExtractor.extractFacts(file))
  semanticFacts = tsAnalyzer.analyze(files.tsJs)
  graph = graphBuilder.build(facts, semanticFacts)
  findings = detectorEngine.runAll(graph, facts, semanticFacts)
  evidence = evidenceGenerator.attachRefs(findings)
  report = reportGenerator.generate(evidence, graph)
  transaction: save report, findings, graph, audit, event
  workspace.cleanup()
```

Complexity: O(files + AST nodes + graph edges). Failure cases: parse failure per file creates coverage limitation; redaction failure fails closed; duplicate command is idempotent.
