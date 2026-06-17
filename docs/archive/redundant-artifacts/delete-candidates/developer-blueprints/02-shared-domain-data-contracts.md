# Shared Domain and Data Contracts

## Purpose

Define shared TypeScript contracts for the controlled MVP prototype. Contracts live in `packages/contracts` and are imported by Web, API and Worker. All internal identifiers are UUIDv7 strings validated through the shared UUID helper.

## UUID Policy

- Helper: `packages/contracts/src/ids/create-uuid.ts`.
- Validator: `packages/contracts/src/ids/uuid-v7.schema.ts`.
- Internal ID type alias: `LcspUuid`.
- Invalid UUID returns `INVALID_UUID` with HTTP 400.
- Valid but unknown UUID returns `RESOURCE_NOT_FOUND` with HTTP 404.

## TypeScript DTO Names

| Domain | DTO / Contract | Owning Package | Notes |
|---|---|---|---|
| Auth | `OAuthCallbackRequestDto`, `SessionDto` | `packages/contracts/src/auth` | OAuth/OIDC login only; not GitHub authorization |
| Organization | `OrganizationDto`, `MembershipDto` | `packages/contracts/src/organizations` | Organization-scoped authorization |
| Assessment | `CreateAssessmentDto`, `AssessmentDto` | `packages/contracts/src/assessments` | `assessmentId` is UUIDv7 |
| Wizard | `WizardProfileDto`, `SubmitWizardProfileDto` | `packages/contracts/src/wizard` | Manager declaration input |
| GitHub | `RepositoryConnectionDto`, `RepositorySnapshotRequestDto` | `packages/contracts/src/github` | External GitHub IDs stay strings |
| Scan | `RepositoryScanJobDto`, `ScanRequestedCommand` | `packages/contracts/src/scans` | Queue payload has refs only |
| Evidence | `TechnicalEvidenceReportDto`, `TechnicalFindingDto` | `packages/contracts/src/evidence` | No raw source/full AST |
| AIUsageFlow | `AIUsageFlowDto`, `AIUsageFlowClaimDto` | `packages/contracts/src/ai-usage-flow` | Material claims require `evidenceRefs` |
| Reconciliation | `ReconciliationConflictDto`, `ConflictResolutionDto` | `packages/contracts/src/reconciliation` | Manager resolution is separate from scanner evidence |
| VerifiedProfile | `VerifiedProfileDto` | `packages/contracts/src/verified-profile` | Required before classification |
| Legal RAG | `LegalRuleMatchDto`, `LegalCitationDto` | `packages/contracts/src/legal-rag` | Citation traceability required |
| Classification | `RiskClassificationDraftDto`, `ClassificationBlockedDto` | `packages/contracts/src/classification` | Blocks on missing VerifiedProfile/citation |
| Gap | `GapAnalysisResultDto` | `packages/contracts/src/gap-analysis` | Requires valid classification |
| Document | `DocumentGenerationRequestDto`, `GeneratedDocumentDto` | `packages/contracts/src/documents` | Prototype-only warning required |
| Audit | `AuditEventDto` | `packages/audit` | Append-only event contract |

## Queue Envelope

```json
{
  "eventId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "eventType": "event.scan.completed.v1",
  "schemaVersion": 1,
  "occurredAt": "2026-06-20T10:00:00.000Z",
  "correlationId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "causationId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "aggregateType": "Assessment",
  "aggregateId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "producer": "apps/api",
  "payload": {}
}
```

## Prisma Model Ownership

| Model | Owner | ID |
|---|---|---|
| `Organization`, `User`, `Membership` | Auth/Organization API | UUIDv7 |
| `Assessment`, `WizardProfile` | Assessment/Wizard API | UUIDv7 |
| `RepositoryConnection`, `RepositorySnapshot`, `RepositoryScanJob` | GitHub/Scan API | UUIDv7 |
| `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `TechnicalProfile` | Scanner/Evidence Worker | UUIDv7 |
| `AIUsageFlow`, `AIUsageFlowClaim` | AIUsageFlow Worker | UUIDv7 |
| `ReconciliationConflict`, `ConflictResolution`, `VerifiedProfile` | Reconciliation Worker/API | UUIDv7 |
| `LegalDocumentVersion`, `LegalRule`, `LegalCitation` | Legal RAG API/Worker | UUIDv7 |
| `RiskClassification`, `GapAnalysis`, `GeneratedDocument` | Classification/Document Worker | UUIDv7 |
| `AuditEvent`, `OutboxEvent` | Audit/API | UUIDv7 |

## State Transition Payloads

Every transition payload includes `assessmentId`, `actorUserId` or `systemWorkerId`, `previousState`, `nextState`, `correlationId`, `causationId`, and `auditEventId`.
