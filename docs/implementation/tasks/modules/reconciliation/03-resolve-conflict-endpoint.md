---
task_id: MW-rec-003
module: reconciliation
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 5.3
depends_on:
  - reconciliation/02-list-conflicts-endpoint.md
  - platform/pbac/03-nestjs-guard.md
  - platform/outbox/02-outbox-publisher.md
---

# Resolve Conflict Endpoint

## Outcome

Allow a Manager to resolve or dismiss a conflict. Resolution is audited and immutable — resolved conflicts cannot be re-opened. Resolution authority stays with Manager (Developer cannot resolve). After all conflicts resolved, emit event to allow VerifiedProfile creation to proceed.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/modules/reconciliation/presentation/http/reconciliation.controller.ts` | Modify | Add `PATCH /assessments/:assessmentId/conflicts/:conflictId/resolve` |
| `apps/api/src/modules/reconciliation/application/commands/resolve-conflict/resolve-conflict.command.ts` | Create | Command shape |
| `apps/api/src/modules/reconciliation/application/commands/resolve-conflict/resolve-conflict.handler.ts` | Create | Resolution + gate check |

## API Contract

**Endpoint:** `PATCH /assessments/:assessmentId/conflicts/:conflictId/resolve`
**Auth required:** Yes — `@RequireAction('conflict:resolve')` (Manager-only action)

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `resolution` | string | Yes | `RESOLVED` \| `DISMISSED` |
| `resolution_note` | string | No | Max 2000 chars — business-language explanation |

**Success response (200):**

| Field | Type | Notes |
|---|---|---|
| `conflict_id` | string | |
| `status` | string | `RESOLVED` or `DISMISSED` |
| `resolved_at` | string | ISO 8601 |
| `all_conflicts_resolved` | boolean | True if no more PENDING conflicts |
| `correlation_id` | string | |

**Error responses:**

| HTTP | `error_code` | Meaning |
|---|---|---|
| 403 | `PBAC_DENIED` | Actor lacks `conflict:resolve` |
| 404 | `CONFLICT_NOT_FOUND` | Not found or not in org |
| 409 | `CONFLICT_ALREADY_RESOLVED` | Already resolved or dismissed |

## Business Rules

1. PBAC guard: `action = conflict:resolve`. Developer does NOT have this action.
2. Verify conflict exists and `assessmentId` and `organizationId` match session.
3. If `status ≠ PENDING` → `CONFLICT_ALREADY_RESOLVED`.
4. Update `ConflictRecord.status`, `resolvedAt`, `resolvedById`, `resolutionNote` atomically.
5. After resolution, check if all `ConflictRecord` for the assessment have `status ≠ PENDING`.
6. If all resolved → emit outbox message `reconciliation.all-conflicts-resolved` for VerifiedProfile gate.
7. `resolution_note` stored as-is (Manager-authored content). No LLM processing of this field.
8. Audit event `CONFLICT_RESOLVED` or `CONFLICT_DISMISSED`.

## Commands / Events

| Name | Type | Safe payload |
|---|---|---|
| `ResolveConflictCommand` | App command | `{ conflictId, resolution, resolutionNote?, correlationId? }` |
| `event.reconciliation.all-conflicts-resolved` | Outbox | `{ assessmentId, correlationId }` (emitted when all PENDING cleared) |
| `CONFLICT_RESOLVED` | `AuthAuditEvent` | `{ conflictId, resolution, resolvedById, assessmentId, correlationId }` |

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Manager resolves PENDING conflict | 200 `status = RESOLVED` |
| T02 | Manager dismisses conflict | 200 `status = DISMISSED` |
| T03 | Last conflict resolved | `all_conflicts_resolved = true`, outbox event emitted |
| T04 | Conflict already resolved | 409 `CONFLICT_ALREADY_RESOLVED` |
| T05 | Developer attempts resolution | 403 `PBAC_DENIED` |
| T06 | Conflict not in org | 404 `CONFLICT_NOT_FOUND` |
| T07 | Outbox event only emitted when all resolved | DB verified — no early emission |

## Definition of Done

- Manager-only action (`conflict:resolve` not in Developer policy).
- Conflict immutable once resolved/dismissed.
- `all-conflicts-resolved` outbox event emitted only when all PENDING cleared.
- Audit event written with resolution, resolver ID.
