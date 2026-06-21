# 06 Repository Snapshot Construction Manual

## Purpose

Define snapshot workspace creation, file inventory, hashing, manifest persistence, and cleanup for commit-pinned GitHub repository scans.

Documentation only: these definitions instruct future code creation but do not create source files.

## Exact files to create

```text
packages/scanner/src/snapshot/repository-snapshot-builder.ts
packages/scanner/src/snapshot/workspace-manager.ts
packages/scanner/src/snapshot/file-inventory.ts
packages/scanner/src/snapshot/snapshot-manifest.ts
packages/scanner/src/snapshot/cleanup-verifier.ts
packages/scanner/src/snapshot/snapshot-errors.ts
```

## Interfaces

```ts
interface RepositorySnapshotManifest { snapshotId: string; repositoryConnectionId: string; commitSha: string; fileCount: number; supportedFileCount: number; ignoredFileCount: number; totalBytes: number; fileHashes: FileHash[]; languageSummary: Record<string, number>; coverageLimitations: string[] }
interface FileHash { path: string; sha256: string; bytes: number; language: string; supported: boolean }
interface WorkspaceHandle { scanJobId: string; rootPath: string; cleanup(): Promise<void> }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `RepositorySnapshotBuilder` | Build manifest and workspace. | `GitHubAppService`, `WorkspaceManager`, `FileInventory` | `buildSnapshot()`, `downloadCommitArchive()`, `createManifest()` |
| `WorkspaceManager` | Create/delete isolated workspace. | filesystem adapter | `createWorkspace()`, `assertInsideRoot()`, `cleanup()` |
| `FileInventory` | Apply ignore/size/language policy. | `ignore`, `fast-glob` | `listFiles()`, `hashFiles()`, `summarizeLanguages()` |
| `CleanupVerifier` | Verify deletion. | filesystem adapter, audit | `verifyDeleted()`, `raiseCleanupIncident()` |

## DTO Catalog

```ts
interface BuildSnapshotInputDto { scanJobId: string; repositoryConnectionId: string; commitSha: string }
interface BuildSnapshotOutputDto { manifest: RepositorySnapshotManifest; workspace: WorkspaceHandle }
interface SnapshotFailureDto { scanJobId: string; code: 'SNAPSHOT_BUILD_FAILED' | 'REPOSITORY_LIMIT_EXCEEDED' | 'WORKSPACE_CLEANUP_FAILED'; message: string }
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

Input: repository connection, commit SHA, scan job. Output: manifest plus temporary workspace. Complexity: O(file count + total bytes hashed).

```text
load connection
mint installation token in memory
download archive at commitSha
extract under SCANNER_WORKSPACE_ROOT/scanJobId
assert every path remains inside workspace
apply ignore/size/language policy
sha256 each included file
produce manifest
return manifest to scanner
finally cleanup workspace and verify deletion
```

Edge cases: force-pushed branch is irrelevant after commit pin; symlink/path traversal rejected; limits exceeded produces blocked/failed scan; cleanup failure raises critical audit.
