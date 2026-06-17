# DEV-BLUEPRINT — STORY-02-03 — Manager Super-role Authorization

## 1. Implementation Objective
Implement server-side Manager authorization as the required and sufficient MVP role.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| Guards | NestJS Guards | `ManagerGuard` | Server-side enforcement |
| Permissions | TypeScript enums | `packages/shared` | Shared role constants |
| DB | Prisma | Assessment membership | Scoped ownership checks |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| API | `apps/api/src/modules/auth/guards` | Role enforcement |
| API | `apps/api/src/modules/assessment` | Ownership checks |
| Shared | `packages/shared/src/auth` | Permission constants |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `packages/shared/src/auth/roles.ts` | MANAGER/DEVELOPER |
| CREATE | `packages/shared/src/auth/permissions.ts` | MVP permission constants |
| CREATE | `apps/api/src/modules/auth/guards/manager.guard.ts` | Manager-only guard |
| CREATE | `apps/api/src/modules/auth/guards/assessment-scope.guard.ts` | Assessment ownership guard |
| CREATE | `apps/api/src/modules/permissions/permission.service.ts` | Role/permission checks |
| MODIFY | `prisma/schema.prisma` | AssessmentMember/PermissionGrant |

## 5. Inputs
### UI Inputs
None directly.
### API Inputs
- Headers: `Authorization`, `x-correlation-id`.
- Auth: active session.
- Role: Manager for MVP final actions.
- Request JSON: any protected future action.
### Event / Job Inputs
None.

## 6. Outputs
### API Response
Forbidden:
```json
{ "code": "MANAGER_ROLE_REQUIRED", "message": "Manager permission is required." }
```
Status: 403.
### Database Output
Models: AssessmentMember, PermissionGrant.
Audit: PERMISSION_DENIED, MANAGER_ACTION_ACCEPTED.
### Event / Job Output
None.
### UI Output
Blocked/forbidden state for unauthorized user.

## 7. Data Model and Migration
AssessmentMember unique `(assessmentId, userId)`; PermissionGrant is post-MVP but may be represented for future delegation.

## 8. Step-by-Step Implementation Algorithm
1. Validate session.
2. Load assessment membership.
3. If role is MANAGER, allow MVP action.
4. If role is DEVELOPER, check scoped permission only for allowed delegated actions.
5. Deny Manager-only actions to Developer.
6. Write audit event for denial or critical allowed action.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| No session | 401 | Sign in required | Optional |
| Not Manager for Manager-only action | 403 | Not authorized | PERMISSION_DENIED |
| Developer absent | Not error | Manager can proceed | None |

## 10. Security and Privacy Constraints
Authorization must fail closed and never rely on UI-only checks.

## 11. Observability and Audit Requirements
Audit permission denial and critical Manager actions.

## 12. Tests to Implement
### Unit tests
Permission matrix.
### Integration tests
Manager can access MVP transitions; Developer cannot final actions.
### Contract tests
403 error schema.
### Manual smoke-test steps
Call protected endpoint with Manager and Developer test users.

## 13. Local Run Commands
```bash
npm run test --workspace @lcsp/api -- permissions
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| Manager can do MVP actions | `permission.service.ts` | Matrix test |
| Developer absence non-blocking | Guards/services | Integration |
| Server-side enforced | guards | Integration |

## 15. Dependencies and Implementation Order
Requires STORY-02-01. Blocks GitHub connection.

## 16. Explicit Non-Goals
No enterprise IAM or Developer final compliance authority.

## 17. Prototype Limitations
Post-MVP delegation may evolve after governance validation.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-02-03` into an executable controlled-prototype slice. The business outcome is: authorization decision. It gives the developer exact ownership for package `@lcsp/authz`, API route `/api/v1/auth/session`, service `AuthService`, and persistence models `Session, User, Membership`.

### Before coding

- Required completed predecessor stories: STORY-02-01.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-02-03/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `Session, User, Membership` if the model does not already exist.
3. Create or update NestJS module files for `AuthController` and `AuthService` at the route `/api/v1/auth/session`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `AuditEvent` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `none` when applicable; consumer emits `event.audit.created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: authorization decision.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `Manager-scoped request`.
→ API route: `/api/v1/auth/session`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `AuthService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `Session, User, Membership` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `AuditEvent` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `none` and calls package `@lcsp/authz`.
→ output state: API/UI exposes authorization decision; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `Session, User, Membership` rows.
- RabbitMQ emits or consumes `AuditEvent` / `event.audit.created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: authorization decision.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
