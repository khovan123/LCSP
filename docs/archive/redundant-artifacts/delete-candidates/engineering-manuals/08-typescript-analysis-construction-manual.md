# 08 TypeScript Analysis Construction Manual

## Purpose

Define exact ts-morph semantic analyzer construction for import, symbol, wrapper, call, and type resolution.

Documentation only: these definitions instruct future code creation but do not create source files.

## Exact files to create

```text
packages/scanner/src/semantic/typescript-project-factory.ts
packages/scanner/src/semantic/source-loader.ts
packages/scanner/src/semantic/import-resolver.ts
packages/scanner/src/semantic/symbol-resolver.ts
packages/scanner/src/semantic/type-resolver.ts
packages/scanner/src/semantic/wrapper-resolver.ts
packages/scanner/src/semantic/semantic-limitations.ts
```

## Interfaces

```ts
interface TypeScriptProjectInput { workspaceRoot: string; filePaths: string[]; tsConfigPath?: string }
interface ImportResolution { filePath: string; moduleSpecifier: string; resolvedPath?: string; packageName?: string; unresolvedReason?: string }
interface SemanticCall { filePath: string; calleeText: string; resolvedSymbol?: string; packageName?: string; typeText?: string; evidenceRef?: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `TypeScriptProjectFactory` | Create no-emit ts-morph Project. | `ts-morph`, config | `createProject()` |
| `SourceLoader` | Load allowed TS/JS files. | project, manifest | `addSourceFiles()` |
| `ImportResolver` | Resolve package/local imports. | project | `resolveImports()` |
| `SymbolResolver` | Resolve call/property symbols. | TypeChecker | `resolveCall()`, `resolveIdentifier()` |
| `TypeResolver` | Extract bounded type categories. | TypeChecker | `getInputType()`, `getOutputType()` |
| `WrapperResolver` | Follow local AI wrappers. | import/symbol resolvers | `resolveWrapper()` |
| `SemanticLimitations` | Emit limitation facts. | none | `unresolvedImport()`, `dynamicCall()` |

## DTO Catalog

```ts
interface TypeScriptSemanticAnalysisRequestDto { scanJobId: string; workspaceRoot: string; filePaths: string[] }
interface TypeScriptSemanticAnalysisResultDto { imports: ImportResolution[]; calls: SemanticCall[]; limitations: string[] }
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

Input: TS/JS file paths. Output: semantic imports/calls/types/limitations. Complexity: O(source files + AST nodes TypeScript compiler traverses).

```text
project = create Project({ noEmit:true, allowJs:true, skipLibCheck:true })
sourceFiles = add files from manifest
for source in sourceFiles:
  resolve import declarations
  inspect call expressions and property access expressions
  resolve symbols and package origins
  follow local wrappers up to maxDepth
  infer simple type categories
  emit semantic facts or limitations
```

Edge cases: missing tsconfig uses in-memory config; dynamic imports emit limitations; unresolved wrapper abstains; no dependency install/build/test is executed.
