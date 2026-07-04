---
task_id: MW-aiuf-001
module: ai-usage-flow
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 4.2
depends_on:
  - evidence/02-technical-profile-callback-endpoint.md
  - platform/outbox/02-outbox-publisher.md
  - platform/audit-writer/02-audit-writer-service.md
---

# AIUsageFlow Callback Endpoint

## Outcome

Receive the `AIUsageFlow` artifact from the Python intelligence worker after AI usage detection. Validate schema, provenance, and claim evidence refs. Store immutable `AIUsageFlow`. Each claim must carry evidence references and uncertainty reasons. Unknown/unclear usage must be preserved — not discarded.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/modules/ai-usage-flow/presentation/http/ai-usage-flow.controller.ts` | Create | `POST /internal/ai-usage-flow/callback` |
| `apps/api/src/modules/ai-usage-flow/application/commands/accept-ai-usage-flow/accept-ai-usage-flow.command.ts` | Create | Command shape |
| `apps/api/src/modules/ai-usage-flow/application/commands/accept-ai-usage-flow/accept-ai-usage-flow.handler.ts` | Create | Validation + persistence + event |
| `apps/api/src/modules/ai-usage-flow/domain/entities/ai-usage-flow.entity.ts` | Create | `AIUsageFlow` domain entity |
| `apps/api/prisma/schema.prisma` | Modify | Add `AIUsageFlow` model |
| `apps/api/src/modules/ai-usage-flow/ai-usage-flow.module.ts` | Create | NestJS module |

## Prisma Model

```prisma
model AIUsageFlow {
  id                  String   @id @default(uuid())
  technicalProfileId  String   @unique
  assessmentId        String
  organizationId      String
  schemaVersion       String
  providerVersion     String
  claims              Json                             // Array of AIUsageClaim
  unknownUsages       Json                             // Preserved unclear usage signals
  privacyFlags        Json
  status              String   @default("accepted")   // 'accepted' | 'rejected'
  rejectionReason     String?
  createdAt           DateTime @default(now())

  @@index([assessmentId])
}
```

## AIUsageClaim Structure (in `claims` JSON array)

```json
{
  "claim_id": "string",
  "claim_type": "provider_integration | model_call | framework_usage | agent_pattern",
  "confidence": "high | medium | low | unknown",
  "evidence_refs": ["evidenceReportId::findingId", ...],
  "uncertainty_reason": "string | null",
  "description": "string",
  "is_material": true
}
```

## API Contract

**Endpoint:** `POST /internal/ai-usage-flow/callback`
**Auth:** `X-Worker-Api-Key`

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `technical_profile_id` | string | Yes | Source profile |
| `assessment_id` | string | Yes | |
| `schema_version` | string | Yes | |
| `provider_version` | string | Yes | |
| `claims` | AIUsageClaim[] | Yes | May be empty |
| `unknown_usages` | object[] | Yes | Preserved unclear signals (may be empty) |
| `privacy_flags` | object | Yes | |

**Success response (200):**

| Field | Type | Notes |
|---|---|---|
| `accepted` | boolean | |
| `ai_usage_flow_id` | string | |
| `correlation_id` | string | |

**Error responses:**

| HTTP | `error_code` | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` | Invalid worker API key |
| 404 | `TECHNICAL_PROFILE_NOT_FOUND` | Source profile not found |
| 409 | `FLOW_ALREADY_EXISTS` | AIUsageFlow already accepted for this profile |
| 422 | `CLAIM_MISSING_EVIDENCE_REF` | Material claim has no `evidence_refs` |
| 422 | `PRIVACY_FLAGS_INVALID` | Source code or secrets in payload |

## Business Rules

1. Auth: validate `X-Worker-Api-Key`.
2. Verify `technicalProfileId` references an accepted `TechnicalProfile`.
3. Check `AIUsageFlow` not already accepted → `FLOW_ALREADY_EXISTS`.
4. Validate all claims where `is_material = true` have at least one `evidence_ref`. → `CLAIM_MISSING_EVIDENCE_REF`.
5. Validate privacy flags.
6. `unknown_usages` must be preserved — not discarded or defaulted to empty. Worker must pass them explicitly.
7. Create `AIUsageFlow` with `status = accepted` (immutable).
8. Emit outbox message `ai-usage-flow-ready` for conflict detection worker.
9. Audit event `AI_USAGE_FLOW_ACCEPTED`.

## Commands / Events

| Name | Type | Safe payload |
|---|---|---|
| `AcceptAIUsageFlowCommand` | App command | `{ technicalProfileId, assessmentId, schemaVersion, privacyFlags, correlationId? }` |
| `event.ai-usage-flow-ready` | Outbox | `{ aiUsageFlowId, assessmentId, technicalProfileId, correlationId }` |
| `AI_USAGE_FLOW_ACCEPTED` | `AuthAuditEvent` | `{ aiUsageFlowId, assessmentId, correlationId }` |

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Valid claims with evidence refs | 200 accepted |
| T02 | Material claim missing `evidence_refs` | 422 `CLAIM_MISSING_EVIDENCE_REF` |
| T03 | `unknown_usages` not empty — preserved | DB field non-null |
| T04 | Flow already exists | 409 `FLOW_ALREADY_EXISTS` |
| T05 | Privacy flags invalid | 422 `PRIVACY_FLAGS_INVALID` |
| T06 | Outbox `ai-usage-flow-ready` created | DB verified |
| T07 | Empty `claims` accepted (no AI usage found) | 200 accepted |

## Definition of Done

- Material claims must have `evidence_refs` — no empty refs allowed.
- `unknown_usages` preserved (not stripped).
- Immutable once accepted.
- Outbox `ai-usage-flow-ready` triggers conflict detection.
