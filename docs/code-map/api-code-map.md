# API Code Map

## Purpose

Define planned NestJS API modules and route ownership for the A-to-Z runnable MVP before implementation.

## Folder Layout

```text
apps/api/src/
  app.module.ts
  common/
    auth/
    guards/
    dto/
    errors/
    audit/
    messaging/
    prisma/
    config/
  modules/
    auth/
    organizations/
    assessments/
    wizard/
    github/
    scans/
    technical-profile/
    ai-usage-flow/
    developer-tasks/
    policy/
    reconciliation/
    legal-matching/
    classification/
    gap-analysis/
    documents/
    audit/
    internal-legal-ops/
    platform-config/
```

## Module Ownership

| Module | Controllers/Services | Tables | Queue Role |
|---|---|---|---|
| `auth` | Auth, MFA, session, OAuth callback, PBAC subject context | `User`, `OrganizationMembership`, `AuthorizationDecision`, `AuditEvent` | none |
| `organizations` | organization/member/subject-label management | `Organization`, `OrganizationMembership`, `AuditEvent` | none |
| `assessments` | assessment create/query/state projection | `Assessment`, `AuditEvent` | consumes/project events as needed |
| `wizard` | WizardProfile save/submit/readiness | `WizardProfile`, `Assessment`, `AuditEvent` | none |
| `github` | GitHub App connection and snapshot metadata | `RepositoryConnection`, `RepositorySnapshot`, `AuditEvent` | none |
| `scans` | request/receive trusted scan trigger and query job/report summary | `TrustedScanTrigger`, `ScanMappingResolution`, `RepositoryScanJob`, `OutboxEvent`, `AuditEvent` | produces `command.scan-trigger.resolve-context.v1`, `command.scan.requested.v1` |
| `technical-profile` | query latest profile | `TechnicalProfile` | none |
| `ai-usage-flow` | query latest flow/claims | `AIUsageFlow`, `AIUsageFlowClaim` | none |
| `developer-tasks` | invite/accept/revoke scoped Developer work | membership/task/policy tables, audit | none |
| `policy` | PBAC policy refs/decisions where exposed internally | `Policy`, `PolicyVersion`, `AuthorizationDecision`, `AuditEvent` | none |
| `reconciliation` | list conflicts, Manager resolution, profile query | `ReconciliationConflict`, `VerifiedProfile`, `OutboxEvent`, `AuditEvent` | produces reconciliation command after valid resolution |
| `legal-matching` | query legal matches and citations | `LegalRuleMatch`, `RetrievalAuditLog` | none |
| `classification` | request/query classification | `RiskClassification`, `OutboxEvent`, `AuditEvent` | produces classification command when explicit API trigger is used |
| `gap-analysis` | query gap analysis | `GapAnalysis` | none |
| `documents` | request/status/download/readiness-only export | `GeneratedDocument`, `OutboxEvent`, `AuditEvent` | produces document command |
| `audit` | query/filter/export audit metadata | `AuditEvent` | none |
| `internal-legal-ops` | source validation, ingestion request, corpus review/approval, index request | legal corpus tables, audit/outbox | internal commands only |
| `platform-config` | provider/model/credential refs and budget status | configuration metadata, `ModelRunMetadata` | none |

## Customer-Facing Route Set

| Method | Route | Owner |
|---|---|---|
| POST | `/api/v1/auth/register` | auth |
| POST | `/api/v1/auth/login` | auth |
| GET/POST | `/api/v1/auth/oauth/*` | auth |
| POST | `/api/v1/auth/mfa/*` | auth |
| GET | `/api/v1/session` | auth |
| POST | `/api/v1/organizations` | organizations |
| GET | `/api/v1/organizations/:organizationId` | organizations |
| POST/DELETE | `/api/v1/organizations/:organizationId/members/*` | organizations |
| POST | `/api/v1/assessments` | assessments |
| GET | `/api/v1/assessments/:assessmentId` | assessments |
| POST | `/api/v1/assessments/:assessmentId/wizard-profile` | wizard |
| POST | `/api/v1/assessments/:assessmentId/github/repository-connections` | github |
| POST | `/api/v1/assessments/:assessmentId/repository-snapshots` | github |
| POST | `/api/v1/assessments/:assessmentId/scan-triggers` | scans |
| POST | `/api/v1/assessments/:assessmentId/scans` | scans |
| GET | `/api/v1/assessments/:assessmentId/scans/:scanJobId` | scans |
| GET | `/api/v1/assessments/:assessmentId/technical-profile` | technical-profile |
| GET | `/api/v1/assessments/:assessmentId/ai-usage-flow` | ai-usage-flow |
| GET | `/api/v1/assessments/:assessmentId/reconciliation-conflicts` | reconciliation |
| POST | `/api/v1/assessments/:assessmentId/reconciliation-conflicts/:conflictId/resolve` | reconciliation |
| GET | `/api/v1/assessments/:assessmentId/verified-profile` | reconciliation |
| GET | `/api/v1/assessments/:assessmentId/legal-matches` | legal-matching |
| POST | `/api/v1/assessments/:assessmentId/classifications` | classification |
| GET | `/api/v1/assessments/:assessmentId/classifications/latest` | classification |
| GET | `/api/v1/assessments/:assessmentId/gap-analysis/latest` | gap-analysis |
| POST | `/api/v1/assessments/:assessmentId/documents` | documents |
| GET | `/api/v1/assessments/:assessmentId/documents/:documentId` | documents |
| GET | `/api/v1/assessments/:assessmentId/documents/:documentId/download` | documents |
| GET | `/api/v1/assessments/:assessmentId/audit` | audit |
| POST | `/api/v1/assessments/:assessmentId/audit/exports` | audit |
| POST | `/api/v1/assessments/:assessmentId/developer-tasks` | developer-tasks |
| POST | `/api/v1/developer-tasks/:taskId/accept` | developer-tasks |

## Internal Legal Operations Routes

These routes are not part of Manager/Developer product UX and require internal operator authorization:

| Method | Route | Purpose |
|---|---|---|
| POST | `/internal/v1/legal-sources/validate` | validate official-source boundary |
| POST | `/internal/v1/legal-sources/ingestions` | request snapshot ingestion |
| GET | `/internal/v1/legal-corpus/versions/:versionId` | review staged corpus version |
| POST | `/internal/v1/legal-corpus/versions/:versionId/approve` | approve immutable version |
| POST | `/internal/v1/legal-corpus/versions/:versionId/reject` | reject staged version |
| POST | `/internal/v1/legal-corpus/versions/:versionId/indexes` | request FTS/vector build |

## API Rules

- Controllers validate HTTP shape and actor/service scope.
- Services enforce domain/state preconditions.
- Services enforce PBAC server-side. Roles are subject attributes/templates only.
- Repositories own Prisma access.
- State change and OutboxEvent write occur in one transaction.
- Customer APIs never expose raw source, secret, full prompt, full AST, provider credential, or internal corpus content beyond approved citation excerpts/metadata.
- Developer APIs cannot perform Manager-only actions.
- Structured attestation routes must not be created in the active MVP.
- Manual scanner report upload and `FR-051` routes must not be created. `FR-050` routes mean Automatic Trusted Scan Initiation only.
- Internal legal operations routes are not included in customer navigation or `bmad-ux` deliverables.
