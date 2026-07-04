---
task_id: MW-rec-002
module: reconciliation
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 5.2
depends_on:
  - reconciliation/01-conflict-detection-callback-endpoint.md
  - platform/pbac/03-nestjs-guard.md
---

# List Conflicts Endpoint

## Outcome

Return all pending conflicts for an assessment for Manager review. Includes conflict score, explanation, type, and evidence refs. No raw source code in response. Manager can filter by status.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/modules/reconciliation/presentation/http/reconciliation.controller.ts` | Modify | Add `GET /assessments/:assessmentId/conflicts` |
| `apps/api/src/modules/reconciliation/application/queries/list-conflicts/list-conflicts.query.ts` | Create | Query shape |
| `apps/api/src/modules/reconciliation/application/queries/list-conflicts/list-conflicts.handler.ts` | Create | Paginated list |
| `apps/api/src/modules/reconciliation/application/contracts/reconciliation/conflict-list.contract.ts` | Create | Response DTO |

## API Contract

**Endpoint:** `GET /assessments/:assessmentId/conflicts`
**Auth required:** Yes — `@RequireAction('conflict:read')`

**Query parameters:**

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `status` | string | No | `PENDING` | Filter by status |
| `page` | number | No | 1 | |
| `page_size` | number | No | 20 | Max 100 |

**Success response (200):**

| Field | Type | Notes |
|---|---|---|
| `conflicts` | ConflictSummary[] | See below |
| `total` | number | |
| `page` | number | |
| `page_size` | number | |
| `correlation_id` | string | |

**`ConflictSummary` object:**

| Field | Type | Notes |
|---|---|---|
| `conflict_id` | string | |
| `conflict_type` | string | |
| `conflict_score` | number | 0.0 – 1.0 |
| `score_explanation` | string | |
| `status` | string | |
| `evidence_refs` | string[] | Evidence finding IDs (not content) |
| `created_at` | string | ISO 8601 |

**Error responses:**

| HTTP | `error_code` | Meaning |
|---|---|---|
| 403 | `PBAC_DENIED` | Actor lacks `conflict:read` |
| 404 | `ASSESSMENT_NOT_FOUND` | Not found or not in org |

## Business Rules

1. PBAC guard: `action = conflict:read`.
2. Org-scope guard on assessment.
3. Default filter: `status = PENDING`.
4. `evidence_refs` contains reference IDs only — not the actual finding content.
5. No raw source code in response.

## Prisma Models Used

| Model | Action | Key fields |
|---|---|---|
| `ConflictRecord` | Read (paginated) | `assessmentId`, `status` filter |

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | PENDING conflicts exist | 200 list returned |
| T02 | No conflicts | 200 empty list |
| T03 | Filter by `status = RESOLVED` | Only resolved returned |
| T04 | Actor lacks `conflict:read` | 403 `PBAC_DENIED` |
| T05 | Assessment not in org | 404 `ASSESSMENT_NOT_FOUND` |
| T06 | `evidence_refs` are IDs not content | Field inspection |

## Definition of Done

- Conflicts returned with score, explanation, type, and refs.
- Default filter is `PENDING`.
- No raw source code or finding content in `evidence_refs`.
