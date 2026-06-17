# 09 AI Signal Detector Construction Manual

## Purpose

Define detector interface and concrete detectors for OpenAI, Anthropic, Gemini, LangChain, Vercel AI SDK, and custom wrappers.

Documentation only: these definitions instruct future code creation but do not create source files.

## Exact files to create

```text
packages/scanner/src/detectors/detector.interface.ts
packages/scanner/src/detectors/openai.detector.ts
packages/scanner/src/detectors/anthropic.detector.ts
packages/scanner/src/detectors/gemini.detector.ts
packages/scanner/src/detectors/langchain.detector.ts
packages/scanner/src/detectors/vercel-ai.detector.ts
packages/scanner/src/detectors/custom-wrapper.detector.ts
packages/scanner/src/detectors/confidence.ts
packages/scanner/src/detectors/false-positive-rules.ts
```

## Interfaces

```ts
interface DetectorInput { scanJobId: string; packageFacts: PackageFact[]; importFacts: ImportResolution[]; callFacts: SemanticCall[]; astFacts: AstFact[]; graph: ScannerGraph }
interface DetectorOutput { findings: TechnicalFindingDraft[]; limitations: CoverageLimitation[] }
interface AIDetector { readonly detectorId: string; detect(input: DetectorInput): DetectorOutput }
interface TechnicalFindingDraft { findingType: string; confidence: number; filePath: string; evidenceRefSeed: string; metadata: Record<string, unknown> }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `OpenAIDetector` | Detect OpenAI package/import/calls. | confidence calculator | `detect()` |
| `AnthropicDetector` | Detect Anthropic package/import/calls. | confidence calculator | `detect()` |
| `GeminiDetector` | Detect Gemini package/import/calls. | confidence calculator | `detect()` |
| `LangChainDetector` | Detect framework and model invocation. | graph | `detect()` |
| `VercelAIDetector` | Detect `ai` SDK calls. | semantic calls | `detect()` |
| `CustomWrapperDetector` | Detect bounded local wrappers. | graph, wrapper resolver | `detect()` |
| `DetectorConfidenceCalculator` | Score evidence strength. | none | `scoreDependency()`, `scoreInvocation()`, `penalizeUnresolved()` |
| `FalsePositiveFilter` | Remove dependency-only high-impact inference. | rules | `filter()` |

## DTO Catalog

```ts
interface DetectorFindingDto { findingId: string; scanJobId: string; findingType: 'AI_PROVIDER_DEPENDENCY' | 'AI_MODEL_INVOCATION' | 'AI_FRAMEWORK_USAGE' | 'CUSTOM_AI_WRAPPER_DETECTED' | 'COVERAGE_LIMITATION'; confidence: number; filePath: string; evidenceRef: string }
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

For every detector:

Input: package/import/call/graph facts. Output: findings and limitations. Complexity: O(package facts + imports + calls + graph edges inspected).

Confidence calculation:
- dependency only: 0.35 to 0.45.
- import + client construction: 0.55 to 0.70.
- resolved model invocation: 0.75 to 0.90.
- invocation + downstream action edge: 0.85 to 0.95.
- unresolved wrapper/dynamic call: cap at 0.55 and emit limitation.

False positive handling:
```text
if provider dependency exists but no invocation: emit dependency finding only
if invocation unresolved: emit limitation, not high-impact claim
if output use not connected to business action: no automated-decision finding
if human review path unclear: mark unclear, do not infer absent review
```

Detector-specific rules: OpenAI matches `openai`, `OpenAI`, `chat.completions.create`, `responses.create`; Anthropic matches `@anthropic-ai/sdk`, `messages.create`; Gemini matches `@google/generative-ai`, `generateContent`; LangChain matches `langchain`, `@langchain/*`, `invoke/call/stream`; Vercel AI matches `generateText`, `streamText`, `generateObject`; custom wrapper follows bounded local imports.
