# DEV-BLUEPRINT — STORY-02-02 — Session, MFA Hooks, and Account Safety

## 1. Implementation Objective
Add session lifecycle and TOTP MFA hooks that block workspace access until auth assurance requirements are met.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| API | NestJS | `MfaModule`, `SessionModule` | Server-side auth assurance |
| MFA | TOTP-compatible library | `apps/api/src/modules/mfa` | Authenticator app support |
| DB | Prisma/PostgreSQL | `UserMfaMethod`, `Session` | Persistent auth state |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| Web | `apps/web/app/(auth)/mfa` | Challenge UX |
| API | `apps/api/src/modules/mfa` | TOTP verify/setup/reset/disable |
| API | `apps/api/src/modules/session` | Session lifecycle |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `apps/api/src/modules/mfa/mfa.module.ts` | MFA module |
| CREATE | `apps/api/src/modules/mfa/mfa.controller.ts` | MFA endpoints |
| CREATE | `apps/api/src/modules/mfa/mfa.service.ts` | TOTP logic |
| CREATE | `apps/api/src/modules/session/session.service.ts` | Session validation/revocation |
| CREATE | `apps/api/src/modules/auth/guards/session.guard.ts` | Protected route guard |
| CREATE | `apps/web/app/(auth)/mfa/page.tsx` | MFA challenge UI |
| MODIFY | `prisma/schema.prisma` | `UserMfaMethod`, `Session` |

## 5. Inputs
### UI Inputs
- Route: `/mfa`.
- Form fields: `otp_code`.
- Validation rules: six-digit TOTP string, non-empty challenge id.
- UI transitions: challenge -> verifying -> active_session or error.
### API Inputs
- POST `/api/v1/auth/mfa/verify-login`
- Auth: pending MFA challenge.
- Request:
```json
{ "challenge_id": "mfa_ch_123", "otp_code": "123456" }
```
### Event / Job Inputs
None.

## 6. Outputs
### API Response
```json
{ "session_state": "ACTIVE", "userId": "018f2b8f-7d80-7c5f-9c42-5892d11c2f21" }
```
Error:
```json
{ "code": "MFA_CODE_INVALID" }
```
Status: 200, 400, 401, 429.
### Database Output
Models: UserMfaMethod, Session.
Audit events: MFA_SETUP_STARTED, MFA_ENABLED, MFA_LOGIN_SUCCESS, MFA_LOGIN_FAILED, MFA_DISABLED, SESSION_EXPIRED.
### Event / Job Output
None.
### UI Output
MFA success, retry error, locked/rate-limited state.

## 7. Data Model and Migration
Add encrypted/reference MFA secret field; never plaintext. Add session expiry/revocation fields.

## 8. Step-by-Step Implementation Algorithm
1. Validate challenge id and OTP DTO.
2. Load pending challenge/session.
3. Verify TOTP against encrypted/reference secret.
4. Increment failure counter on invalid OTP.
5. On success, mark session MFA satisfied.
6. Write audit event.
7. Return session DTO.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| Invalid OTP | 401 | Code invalid | MFA_LOGIN_FAILED |
| Too many attempts | 429 | Temporarily locked | MFA_LOGIN_FAILED |
| Revoked session | 401 | Sign in again | SESSION_EXPIRED |

## 10. Security and Privacy Constraints
MFA secret is encrypted/reference-only and never logged.

## 11. Observability and Audit Requirements
Log safe event and correlation id; no OTP values in logs.

## 12. Tests to Implement
### Unit tests
TOTP valid/invalid/expired/replay behavior.
### Integration tests
MFA-enabled account cannot access workspace before challenge success.
### Contract tests
OpenAPI schemas for MFA endpoints.
### Manual smoke-test steps
Enable MFA, log out, login, verify challenge.

## 13. Local Run Commands
```bash
npm run test --workspace @lcsp/api mfa
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| Session lifecycle | `session.service.ts` | Integration test |
| TOTP enforced | `mfa.service.ts` | Unit/integration |
| Audit-ready paths | `audit.service.ts` calls | Audit assertion |

## 15. Dependencies and Implementation Order
Requires STORY-02-01.

## 16. Explicit Non-Goals
No SMS OTP or production recovery certification.

## 17. Prototype Limitations
Recovery/reset policy may change after validation/security review.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-02-02` into an executable controlled-prototype slice. The business outcome is: session and MFA audit. It gives the developer exact ownership for package `@lcsp/authz`, API route `/api/v1/auth/session`, service `AuthService`, and persistence models `Session, User, Membership`.

### Before coding

- Required completed predecessor stories: STORY-02-01.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-02-02/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `Session, User, Membership` if the model does not already exist.
3. Create or update NestJS module files for `AuthController` and `AuthService` at the route `/api/v1/auth/session`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `AuditEvent` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `none` when applicable; consumer emits `event.audit.created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: session and MFA audit.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `session/MFA request`.
→ API route: `/api/v1/auth/session`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `AuthService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `Session, User, Membership` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `AuditEvent` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `none` and calls package `@lcsp/authz`.
→ output state: API/UI exposes session and MFA audit; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `Session, User, Membership` rows.
- RabbitMQ emits or consumes `AuditEvent` / `event.audit.created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: session and MFA audit.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
