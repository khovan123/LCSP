---
task_id: MW-gh-001
module: github-integration
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 3.1
depends_on:
  - auth-workspace/08-oauth-oidc-start-endpoint.md
  - platform/pbac/03-nestjs-guard.md
  - platform/audit-writer/02-audit-writer-service.md
---

# GitHub App OAuth Start Endpoint

## Outcome

Initiate GitHub App installation/authorization flow for repository access. Strictly separate from OAuth/OIDC login — this endpoint grants read-only repository permissions only. Never creates LCSP session. Generates secure `state` for GitHub's installation callback.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/modules/github-integration/presentation/http/github-integration.controller.ts` | Create | `GET /github/app/start` |
| `apps/api/src/modules/github-integration/application/commands/github-app-start/github-app-start.command.ts` | Create | Command shape |
| `apps/api/src/modules/github-integration/application/commands/github-app-start/github-app-start.handler.ts` | Create | State generation + redirect URL build |
| `apps/api/src/modules/github-integration/infrastructure/github/github-app.client.ts` | Create | GitHub App API wrapper |
| `apps/api/src/modules/github-integration/github-integration.module.ts` | Create | NestJS module wiring |
| `apps/api/prisma/schema.prisma` | Modify | Add `GitHubAppInstallState` model |

## Prisma Model

```prisma
model GitHubAppInstallState {
  id             String   @id @default(uuid())
  state          String   @unique
  assessmentId   String?
  organizationId String
  userId         String
  redirectUri    String
  expiresAt      DateTime
  createdAt      DateTime @default(now())
}
```

## API Contract

**Endpoint:** `GET /github/app/start`
**Auth required:** Yes — `@RequireAction('github:connect')` (authenticated Manager or scoped Developer)

**Query parameters:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `assessment_id` | string | No | Scope connection to specific assessment |
| `redirect_uri` | string | Yes | Must match server-side allowlist |

**Success response (200):**

| Field | Type | Notes |
|---|---|---|
| `installation_url` | string | GitHub App installation URL with `state` param |
| `correlation_id` | string | |

**Error responses:**

| HTTP | `error_code` | Meaning |
|---|---|---|
| 403 | `PBAC_DENIED` | Actor lacks `github:connect` |
| 400 | `INVALID_REDIRECT_URI` | Not in server allowlist |
| 400 | `ASSESSMENT_NOT_FOUND` | `assessment_id` not owned by org |

## Business Rules

1. PBAC guard: `action = github:connect`.
2. Validate `redirect_uri` against server-side allowlist.
3. Generate `state = crypto.randomBytes(32).toString('hex')`. Store in `GitHubAppInstallState` with 10-min expiry.
4. Build GitHub App installation URL: `https://github.com/apps/<APP_SLUG>/installations/new?state=<state>&redirect_uri=<redirect_uri>`.
5. This endpoint must NOT create any LCSP identity session or `AuthOAuthIdentity`.
6. This endpoint must NOT create `RepositoryConnection` — only starts authorization flow.
7. `state` not in response body — only in GitHub's installation URL (embedded as param).
8. Audit event `GITHUB_APP_INSTALL_STARTED` — no state value in payload.

## Commands / Events

| Name | Type | Safe payload |
|---|---|---|
| `GitHubAppStartCommand` | App command | `{ userId, organizationId, assessmentId?, redirectUri, correlationId? }` |
| `GITHUB_APP_INSTALL_STARTED` | `AuthAuditEvent` | `{ userId, organizationId, assessmentId?, correlationId }` |

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Valid actor + allowlisted redirect_uri | 200 with `installation_url` |
| T02 | Actor lacks `github:connect` | 403 `PBAC_DENIED` |
| T03 | Redirect URI not in allowlist | 400 `INVALID_REDIRECT_URI` |
| T04 | `assessment_id` not in org | 400 `ASSESSMENT_NOT_FOUND` |
| T05 | `GitHubAppInstallState` created with 10-min expiry | DB row verified |
| T06 | State not in response body | Response has no `state` field |
| T07 | No LCSP session created | No `AuthSession` side effect |
| T08 | Audit event has no state value | Clean payload |

## Definition of Done

- `installation_url` returned with embedded `state`.
- GitHub App flow strictly separate from OAuth/OIDC login.
- No LCSP session or `AuthOAuthIdentity` created.
- `GitHubAppInstallState` expires in 10 minutes.
