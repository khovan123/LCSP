# UUID and Identity Standard

## Policy

All LCSP internal IDs are UUIDv7.

Examples:

- `organizationId`
- `userId`
- `membershipId`
- `assessmentId`
- `wizardProfileId`
- `repositoryConnectionId`
- `scanJobId`
- `technicalEvidenceReportId`
- `technicalFindingId`
- `technicalProfileId`
- `aiUsageFlowId`
- `reconciliationConflictId`
- `verifiedProfileId`
- `classificationId`
- `gapAnalysisId`
- `documentId`
- `auditEventId`
- `eventId`
- `correlationId`
- `causationId`

## Implementation Standard

| Concern | Standard |
|---|---|
| PostgreSQL storage | native `uuid` columns |
| TypeScript generation | `packages/contracts/src/ids/create-uuid.ts` |
| Package | `uuid` with UUIDv7 support |
| Validation schema | `packages/contracts/src/ids/uuid-v7.schema.ts` |
| Type alias | `LcspUuid` |

## Prohibitions

- No CUID.
- No random string IDs.
- No database auto-increment IDs for LCSP domain entities.
- No mixed ID format for internal API paths.

## External Identifier Exceptions

- `githubInstallationId`, `githubRepositoryId`, `githubAccountId` remain strings.
- Git commit SHA remains a string.
- Provider IDs from OAuth/OIDC remain strings and are always namespaced by provider.

## API Behavior

| Condition | HTTP Status | Error Code | Behavior |
|---|---:|---|---|
| Invalid internal ID format | 400 | `INVALID_UUID` | Reject before repository lookup |
| Valid UUID but unknown resource | 404 | `RESOURCE_NOT_FOUND` | Do not reveal cross-tenant existence |
| Valid UUID outside organization scope | 404 or 403 by endpoint policy | `RESOURCE_NOT_FOUND` or `FORBIDDEN` | Prefer no cross-tenant disclosure |

## Queue Identity Fields

Every RabbitMQ envelope carries:

```json
{
  "eventId": "uuidv7",
  "correlationId": "uuidv7",
  "causationId": "uuidv7",
  "aggregateId": "uuidv7"
}
```

Consumers are idempotent by `eventId` and traceable by `correlationId`.
