# 08 PostgreSQL Build Spec

## 1. Purpose

Define canonical PostgreSQL/Prisma models, migration order, foreign keys, indexes, audit and outbox tables for controlled MVP implementation.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | Persistence Runtime |
| Module name | `database` |
| NestJS module | `apps/api/src/modules/database/database.module.ts` |
| Worker name | workers use Prisma through package repository adapters |
| Database ownership | all LCSP domain models |
| Queue ownership | outbox table feeds RabbitMQ publisher |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| PostgreSQL | pinned local/runtime version | relational persistence | canonical primary DB | MongoDB/document-only |
| Prisma | pinned npm lockfile | models/migrations/client | Type-safe DB + migration workflow | raw SQL-only |
| uuid | pinned npm lockfile | UUIDv7 generation | canonical identity standard | CUID/autoincrement |

## 4. Folder Structure

```text
prisma/
  schema.prisma                 canonical Prisma schema
  migrations/                   ordered SQL migrations
  seed.ts                       prototype seed data
apps/api/src/modules/database/  Prisma provider
packages/contracts/src/ids/     UUIDv7 schemas and helpers
```

## 5. DTO Contracts

Database-facing DTO example:

```json
{
  "id": "018f0000-0000-7000-8000-000000002001",
  "assessmentId": "018f0000-0000-7000-8000-000000000101",
  "status": "READY",
  "createdAt": "2026-06-20T00:00:00.000Z",
  "updatedAt": "2026-06-20T00:00:00.000Z"
}
```

## 6. Database Models

Canonical model groups:

| Group | Models | Required constraints |
|---|---|---|
| Identity | `User`, `OAuthIdentity`, `UserMfaMethod`, `Session`, `Organization`, `AssessmentMember` | unique email; unique provider+subject; tenant indexes |
| Assessment | `Assessment`, `WizardProfile` | assessment aggregate root; profile version uniqueness |
| GitHub/Scan | `GitHubRepositoryConnection`, `RepositorySnapshot`, `RepositoryScanJob`, `StaticAnalysisScan` | unique snapshot commit per connection; idempotency key |
| Evidence | `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `EvidenceGateResult`, `ScannerGraphNode`, `ScannerGraphEdge`, `ScannerEvidencePath`, `TechnicalProfile` | report hash unique; graph scoped by scan |
| AI/Reconciliation | `AIUsageFlow`, `AIUsageFlowClaim`, `ConflictRecord`, `ConflictResolution`, `VerifiedProfile` | material claim evidence refs; verified profile version unique |
| Legal/Classify | `LegalDocumentVersion`, `LegalRule`, `LegalCitation`, `ClassificationRun`, `RiskClassificationResult` | corpus source+version unique; citation required |
| Gap/Document | `GapAnalysisResult`, `ComplianceDocument`, `GeneratedDocumentFile` | object hash unique; no raw source |
| Runtime | `AuditEvent`, `OutboxEvent`, `ProcessedEvent` | audit append-only; outbox status indexes; processed event unique |

Example Prisma-style field spec for `AuditEvent`:

```text
AuditEvent
  id uuid primary key
  assessmentId uuid? indexed
  actorId uuid? indexed
  eventType string indexed
  objectType string
  objectId uuid?
  metadata jsonb
  correlationId uuid indexed
  timestamp timestamptz indexed
```

## 7. RabbitMQ Contracts

Outbox rows become RabbitMQ envelopes. Payloads store refs only and never raw source, secret, full prompt or raw AST.

## 8. Algorithms

Migration order:

1. Extensions and enums.
2. Identity and organization.
3. Assessment and membership.
4. Audit/outbox/processed events.
5. GitHub repository connection/snapshot.
6. Scan/evidence graph/report/finding.
7. AIUsageFlow/reconciliation/VerifiedProfile.
8. Legal corpus/citation/classification.
9. Gap/document.

Pseudocode:

```text
create migration N for independent roots
create migration N+1 for child tables with FK
create indexes after table creation
seed organization, Manager user, assessment, legal corpus placeholder
verify migrate reset in local DB
```

## 9. Failure Handling

| Error code | Reason | Recovery strategy |
|---|---|---|
| `DB_MIGRATION_FAILED` | migration error | rollback local; fix migration before feature work |
| `UNIQUE_CONSTRAINT_FAILED` | duplicate idempotency/key | return existing resource when idempotent |
| `TENANT_SCOPE_VIOLATION` | cross-org access | return 404/403 and audit |
| `AUDIT_WRITE_FAILED` | audit event failed | fail enclosing transaction for critical writes |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run db:generate` | Prisma client generated | no schema validation errors |
| `npm run db:migrate` | migrations applied | all tables/indexes exist |
| `npm run db:seed` | seeded Manager/org/assessment | UUIDv7 IDs printed |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
