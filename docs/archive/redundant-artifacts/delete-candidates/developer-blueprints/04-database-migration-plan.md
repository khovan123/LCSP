# Database Migration Plan

## Rules

- Prisma owns PostgreSQL schema changes.
- Every LCSP domain entity uses native PostgreSQL `uuid` with UUIDv7 values created by application code.
- No CUID, random string ID or auto-increment ID for LCSP domain entities.
- External GitHub IDs remain strings.
- Commit SHA remains string.
- Audit events are append-only.

## Migration Order

| Order | Models | Purpose |
|---:|---|---|
| 1 | `User`, `Organization`, `Membership`, `OAuthIdentity`, `Session` | Identity and organization scope |
| 2 | `Assessment`, `WizardProfile` | Manager assessment workflow |
| 3 | `RepositoryConnection`, `RepositorySnapshot`, `RepositoryScanJob` | GitHub App and scan lifecycle |
| 4 | `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `TechnicalProfile` | Static evidence and technical profile |
| 5 | `AIUsageFlow`, `AIUsageFlowClaim` | Evidence-backed usage claims |
| 6 | `ReconciliationConflict`, `ConflictResolution`, `VerifiedProfile` | Conflict and verified profile gate |
| 7 | `LegalDocumentVersion`, `LegalRule`, `LegalCitation` | Legal retrieval and citation traceability |
| 8 | `RiskClassification`, `GapAnalysis`, `GeneratedDocument` | Workflow shells and generated artifacts |
| 9 | `AuditEvent`, `OutboxEvent` | Immutable audit and transactional outbox |

## Required Indexes

- All foreign keys.
- `Assessment.organizationId`.
- `Membership.organizationId,userId` unique.
- `RepositorySnapshot.repositoryConnectionId,commitSha` unique.
- `RepositoryScanJob.assessmentId,repositorySnapshotId,idempotencyKey` unique.
- `TechnicalEvidenceReport.scanJobId` unique.
- `AIUsageFlow.assessmentId,version`.
- `VerifiedProfile.assessmentId,version`.
- `AuditEvent.assessmentId,occurredAt`.
- `OutboxEvent.status,occurredAt`.

## Audit Immutability

`AuditEvent` rows are append-only. Corrections are represented as new audit events referencing `causationId`, never updates to previous audit payloads.

## Seed Data Requirements

Local prototype seed creates one organization, one Manager user, one assessment, and synthetic fixture references only. It does not seed production credentials, real customer repository source or legal reliability claims.
