# 05 GitHub App Construction Manual

## Purpose

Specify classes, methods, DTOs, persistence, and exact implementation order for GitHub App repository authorization and commit selection.

This is a construction manual only; no source code is created in this phase.

## Exact files to create

```text
apps/api/src/modules/github/github.module.ts
apps/api/src/modules/github/github.controller.ts
apps/api/src/modules/github/github-app.service.ts
apps/api/src/modules/github/repository-selection.service.ts
apps/api/src/modules/github/github.repository.ts
apps/api/src/modules/github/dto/connect-github-repository.dto.ts
apps/api/src/modules/github/dto/select-repository-commit.dto.ts
apps/api/src/modules/github/events/github-audit.events.ts
```

## Interfaces

```ts
interface GitHubAppConfig { appId: string; privateKey: string; webhookSecret: string }
interface GitHubInstallationRepository { installationId: string; repositoryId: string; fullName: string; defaultBranch?: string }
interface CommitSelection { repositoryConnectionId: string; branchName: string; commitSha: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `GitHubAppService` | JWT and installation token lifecycle. | `GitHubAppConfig`, Octokit | `createAppJwt()`, `getInstallationToken()`, `verifyWebhookSignature()` |
| `GitHubRepositoryService` | List and validate repositories. | `GitHubAppService` | `listInstallationRepositories()`, `assertRepositoryAccessible()` |
| `RepositorySelectionService` | Resolve branch/commit and persist snapshot. | repository, audit | `selectRepository()`, `resolveCommitSha()`, `createSnapshot()` |
| `GitHubRepository` | Prisma adapter. | Prisma | `createConnection()`, `findConnection()`, `createSnapshot()` |

## DTO Catalog

```ts
interface ConnectGitHubRepositoryRequestDto { githubInstallationId: string; githubRepositoryId: string }
interface GitHubRepositoryConnectionDto { repositoryConnectionId: string; repositoryFullName: string; defaultBranch?: string }
interface SelectRepositoryCommitRequestDto { repositoryConnectionId: string; branchName: string; commitSha?: string }
interface RepositorySnapshotDto { repositorySnapshotId: string; commitSha: string; branchName: string }
```

## Database Schema

```prisma
model GitHubRepositoryConnection { id String @id @db.Uuid organizationId String @db.Uuid assessmentId String @db.Uuid githubInstallationId String githubRepositoryId String repositoryFullName String defaultBranch String? connectedByUserId String @db.Uuid createdAt DateTime @default(now()) @@unique([organizationId, githubInstallationId, githubRepositoryId]) @@index([assessmentId]) }
model RepositorySnapshot { id String @id @db.Uuid assessmentId String @db.Uuid repositoryConnectionId String @db.Uuid branchName String commitSha String manifest Json createdByUserId String @db.Uuid createdAt DateTime @default(now()) @@unique([repositoryConnectionId, commitSha]) @@index([assessmentId, commitSha]) }
```

## State Machines

CREATED/WIZARD_SUBMITTED -> `REPOSITORY_CONNECTED` after connection; `REPOSITORY_CONNECTED` -> `SNAPSHOT_CREATED` after commit selection. Developer actions are denied.

## Queue Catalog

GitHub connection is synchronous. Scan command is emitted later by Scan API after `RepositorySnapshot` exists.

## Algorithms

GitHub App creation and use:

1. Create GitHub App with read-only repository contents/metadata permissions.
2. Register callback/webhook URL and webhook secret.
3. API receives installation/repository selection from Manager.
4. Generate app JWT with private key.
5. Request installation token server-side.
6. List installation repositories.
7. Verify selected repository belongs to installation.
8. Resolve branch head or validate provided commit SHA.
9. Persist connection/snapshot metadata only.
10. Audit connection and snapshot selection.

Pseudocode:
```text
jwt = createAppJwt(appId, privateKey)
token = createInstallationToken(jwt, installationId)
repos = listRepos(token)
assert repoId in repos
commit = resolveCommit(token, repo, branchOrSha)
transaction: create connection/snapshot, append audit
```

Edge cases: inaccessible repository, deleted branch, force-pushed branch, token failure, invalid webhook signature, Developer attempt.
