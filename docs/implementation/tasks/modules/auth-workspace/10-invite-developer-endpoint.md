---
task_id: MW-auth-010
module: auth-workspace
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
epic_story: 1.5
depends_on:
  - auth-workspace/06-get-workspace-endpoint.md
  - platform/pbac/03-nestjs-guard.md
  - platform/audit-writer/02-audit-writer-service.md
---

# Invite Developer Endpoint

## Outcome

Allow a Manager to create a scoped Developer invitation for a specific assessment or task scope. The invite defines PBAC-bounded actions only. Manager golden path must not depend on Developer acceptance.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/src/modules/auth-workspace/presentation/http/auth-workspace.controller.ts` | Modify | Add `POST /organizations/:orgId/invitations` |
| `apps/api/src/modules/auth-workspace/application/commands/invite-developer/invite-developer.command.ts` | Create | Command shape |
| `apps/api/src/modules/auth-workspace/application/commands/invite-developer/invite-developer.handler.ts` | Create | Invite creation logic |
| `apps/api/src/modules/auth-workspace/application/contracts/auth-workspace/invitation.contract.ts` | Create | Request/response DTOs |
| `apps/api/src/modules/auth-workspace/auth-workspace.module.ts` | Modify | Register new handler |

## API Contract

**Endpoint:** `POST /organizations/:orgId/invitations`
**Auth required:** Yes — Manager session + PBAC allow `invite:developer`

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Invitee email |
| `assessment_id` | string | No | Scope to specific assessment (must be Manager-owned) |
| `allowed_actions` | string[] | Yes | From `DEVELOPER_ALLOWED_ACTIONS` allowlist only |
| `expires_in_hours` | number | No | Default 72h; max 168h |

**Success response (201):**

| Field | Type | Notes |
|---|---|---|
| `invitation_id` | string | |
| `email` | string | |
| `expires_at` | string | ISO 8601 |
| `allowed_actions` | string[] | Echo of granted actions |
| `correlation_id` | string | |

**Error responses:**

| HTTP | `error_code` | Meaning |
|---|---|---|
| 403 | `PBAC_DENIED` | Manager lacks `invite:developer` permission |
| 400 | `INVALID_ACTIONS` | One or more actions not in `DEVELOPER_ALLOWED_ACTIONS` |
| 400 | `ASSESSMENT_NOT_OWNED` | `assessment_id` not owned by Manager's org |
| 422 | `INVALID_EMAIL` | Email format invalid |

## Prisma Models Used

| Model | Action | Key fields |
|---|---|---|
| `AuthInvitation` | Create | `id`, `email`, `organizationId`, `state = approved`, `emailVerified = false`, `membershipStatus = active`, `subjectAttributes = { role: 'Developer', scope: assessmentId }`, `policyId` (developer policy), `policyVersion`, `expiresAt` |
| `AuthPolicy` | Read | Load developer policy template for org |
| `AuthDecisionLog` | Create | PBAC allow/deny for `invite:developer` action |
| `AuthAuditEvent` | Create | `AUTH_DEVELOPER_INVITED` |

## Business Rules

1. PBAC guard: evaluate `action = invite:developer`, `subject = Manager`, `org = session.organizationId`. Deny if not allowed.
2. Validate `allowed_actions` ⊆ `DEVELOPER_ALLOWED_ACTIONS` constant. Reject any action outside allowlist.
3. If `assessment_id` provided: verify assessment belongs to session org. Otherwise → `ASSESSMENT_NOT_OWNED`.
4. Create `AuthInvitation` with `state = approved`, expiry, and scoped `subjectAttributes`.
5. Developer invitation must NOT grant Manager-only actions (VerifiedProfile approval, classification request, final report generation, org management).
6. Emit audit event `AUTH_DEVELOPER_INVITED` with actor, org, invitee email (non-sensitive for audit), scope, expiry.

**`DEVELOPER_ALLOWED_ACTIONS` allowlist:**
- `evidence:read:redacted`
- `ai-usage-flow:read`
- `findings:read:redacted`
- `conflict:comment` (if enabled)

## Commands / Events

| Name | Type | Safe payload |
|---|---|---|
| `InviteDeveloperCommand` | App command | `{ orgId, email, assessmentId?, allowedActions, expiresInHours?, correlationId? }` |
| `event.auth.developer-invited` | `AuthAuditEvent` | `{ actorId, orgId, inviteeEmail, allowedActions, expiresAt, correlationId }` |

## PBAC

- Manager must have `invite:developer` in their `AuthPolicy.actions`.
- Developer policy is a separate policy template in org; developer's `policyId` is the developer template ID.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Manager with `invite:developer` + valid actions + org-owned assessment | 201 invitation created |
| T02 | Manager lacks `invite:developer` | 403 `PBAC_DENIED` |
| T03 | `allowed_actions` contains Manager-only action | 400 `INVALID_ACTIONS` |
| T04 | `assessment_id` not owned by Manager's org | 400 `ASSESSMENT_NOT_OWNED` |
| T05 | Invalid email format | 422 `INVALID_EMAIL` |
| T06 | `expires_in_hours` > 168 | Clamp to 168 or reject with `INVALID_REQUEST` |
| T07 | Invite has `state = approved` in DB | DB row verified |
| T08 | PBAC deny logged in `AuthDecisionLog` when blocked | DB row with deny decision |
| T09 | Manager golden path unaffected if invite not accepted | Assessment flow continues |

## Definition of Done

- Invitation created with correct scope, policy, and expiry.
- `allowed_actions` strictly within `DEVELOPER_ALLOWED_ACTIONS`.
- Manager-only actions never granted to Developer invitations.
- PBAC deny logged for unauthorized calls.
- Manager workflow continues independently of Developer acceptance.
