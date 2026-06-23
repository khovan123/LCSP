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
    attestations/
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
| `auth` | Auth, MFA, session, OAuth callback | `User`, `OrganizationMembership`, `AuditEvent` | none |
| `organizations` | organization/member/role management | `Organization`, `OrganizationMembership`, `AuditEvent` | none |
| `assessments` | assessment create/query/state projection | `Assessment`, `AuditEvent` | consumes/project events as needed |
| `wizard` | WizardProfile save/submit/readiness | `WizardProfile`, `Assessment`, `AuditEvent` | none |
| `github` | GitHub App connection and snapshot metadata | `RepositoryConnection`, `RepositorySnapshot`, `AuditEvent` | none |
| `scans` | request scan and query job/report summary | `RepositoryScanJob`, `OutboxEvent`, `AuditEvent` | produces `command.scan.requested.v1` |
| `technical-profile` | query latest profile | `TechnicalProfile` | none |
| `ai-usage-flow` | query latest flow/claims | `AIUsageFlow`, `AIUsageFlowClaim` | none |
| `developer-tasks` | invite/accept/revoke scoped Developer work | membership/task/policy tables, audit | none |
| `attestations` | submit/query structured attestation | `StructuredTechnicalAttestation`, `AuditEvent` | may trigger reconciliation only through explicit Manager action/policy |
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
| POST | `/api/v1/assessments/:assessmentId/attestations` | attestations |

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

- Controllers validate HTTP shape and actor scope.
- Services enforce domain/state preconditions.
- Repositories own Prisma access.
- State change and OutboxEvent write occur in one transaction.
- Customer APIs never expose raw source, secret, full prompt, full AST, provider credential, or internal corpus content beyond approved citation excerpts/metadata.
- Developer APIs cannot perform Manager-only actions.
- Structured attestation is supplemental only.
- Deferred `FR-050..FR-052` routes must not be created in the active MVP.
- Internal legal operations routes are not included in customer navigation or `bmad-ux` deliverables.