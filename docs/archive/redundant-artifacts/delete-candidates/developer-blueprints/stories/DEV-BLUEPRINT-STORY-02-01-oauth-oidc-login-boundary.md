# DEV-BLUEPRINT — STORY-02-01 — OAuth/OIDC Login Boundary

## 1. Implementation Objective
Implement backend-owned OAuth/OIDC login boundary that creates LCSP session state without granting GitHub repository access.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| API | NestJS | `AuthModule`, `OAuthModule` | Controller/service/guard pattern |
| Validation | class-validator + Zod shared DTOs | DTO layer | OpenAPI-friendly |
| Session | Prisma/PostgreSQL | `Session`, `OAuthIdentity` | Server-side verification |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| Web | `apps/web/app/(auth)/login` | Start login, handle callback UX |
| API | `apps/api/src/modules/oauth` | OAuth state/callback validation |
| DB | Prisma | Users, OAuthIdentity, Session |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `apps/api/src/modules/oauth/oauth.module.ts` | Nest module |
| CREATE | `apps/api/src/modules/oauth/oauth.controller.ts` | `/auth/oauth` routes |
| CREATE | `apps/api/src/modules/oauth/oauth.service.ts` | State/callback/linking logic |
| CREATE | `apps/api/src/modules/oauth/dto/oauth-start.dto.ts` | Start DTO |
| CREATE | `apps/api/src/modules/oauth/dto/oauth-callback.dto.ts` | Callback DTO |
| CREATE | `apps/web/app/(auth)/login/page.tsx` | Login entry |
| CREATE | `apps/web/app/(auth)/oauth/callback/page.tsx` | Callback page |
| MODIFY | `prisma/schema.prisma` | User/OAuthIdentity/Session models |

## 5. Inputs
### UI Inputs
- Route: `/login`, `/oauth/callback`.
- Form fields: provider selection, return_url.
- Validation rules: providerId must match configured providers.
- UI state transitions: idle -> redirecting -> callback_loading -> active_session or mfa_required or error.
### API Inputs
- POST `/api/v1/auth/oauth/:provider/start`
- Headers: optional `x-correlation-id`.
- Auth: public.
- Role: none.
- Request:
```json
{ "return_url": "/dashboard" }
```
### Event / Job Inputs
None.

## 6. Outputs
### API Response
Success:
```json
{ "authorization_url": "https://provider/authorize?...", "state_ref": "oauth_state_123" }
```
Error:
```json
{ "code": "OAUTH_PROVIDER_NOT_CONFIGURED", "message": "OAuth provider is not configured." }
```
Status codes: 200, 400, 503.
### Database Output
Models changed: User, OAuthIdentity, Session.
Records created/updated: OAuthIdentity link, Session.
Audit events: OAUTH_LOGIN_STARTED, OAUTH_LOGIN_SUCCESS, OAUTH_CALLBACK_VALIDATION_FAILED.
### Event / Job Output
None.
### UI Output
Success state: authenticated or MFA required.
Loading/error/blocked states: callback validation failure.

## 7. Data Model and Migration
Add `OAuthIdentity(provider, providerSubject, providerEmail, emailVerifiedAt, tokenMetadataReference)` and `Session(userId, expiresAt, revokedAt, mfaSatisfiedAt)`.

## 8. Step-by-Step Implementation Algorithm
1. Validate providerId.
2. Generate state/nonce and PKCE verifier.
3. Persist state reference server-side.
4. Redirect user to provider.
5. On callback, validate state, nonce, issuer, audience, expiry and redirect URI.
6. Safely link or create LCSP identity.
7. Create session or MFA challenge.
8. Write audit event.
9. Return session state DTO.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| Invalid state/nonce | 400 `OAUTH_CALLBACK_INVALID` | Login failed | OAUTH_CALLBACK_VALIDATION_FAILED |
| Provider unavailable | 503 `OAUTH_PROVIDER_UNAVAILABLE` | Try later | OAUTH_LOGIN_FAILED |
| Unsafe account link | 409 `OAUTH_ACCOUNT_LINK_REJECTED` | Account link blocked | OAUTH_LOGIN_FAILED |

## 10. Security and Privacy Constraints
OAuth tokens stay server-side; login does not grant GitHub access or scan permission.

## 11. Observability and Audit Requirements
Log correlationId, providerId and safe failure code; never log tokens.

## 12. Tests to Implement
### Unit tests
State/nonce/issuer/audience validation.
### Integration tests
Callback creates session but no GitHubRepositoryConnection.
### Contract tests
OpenAPI request/response schema.
### Manual smoke-test steps
Start OAuth, complete callback with mock provider, confirm session state.

## 13. Local Run Commands
```bash
npm run test --workspace @lcsp/api oauth
npm run test --workspace @lcsp/web login
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| LCSP identity only | `oauth.service.ts` | Integration test |
| Callback validation | `oauth.service.ts` | Unit tests |
| No GitHub access | Prisma assertions | Integration test |

## 15. Dependencies and Implementation Order
Requires STORY-01-03.

## 16. Explicit Non-Goals
No SAML, SCIM, enterprise federation or GitHub repository authorization.

## 17. Prototype Limitations
Provider selection is prototype config, not production-approved identity architecture.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-02-01` into an executable controlled-prototype slice. The business outcome is: LCSP session. It gives the developer exact ownership for package `@lcsp/authz`, API route `/api/v1/auth/oauth/callback`, service `AuthService`, and persistence models `Session, User, Membership`.

### Before coding

- Required completed predecessor stories: STORY-01-03.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-02-01/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `Session, User, Membership` if the model does not already exist.
3. Create or update NestJS module files for `AuthController` and `AuthService` at the route `/api/v1/auth/oauth/callback`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `AuditEvent` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `none` when applicable; consumer emits `event.audit.created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: LCSP session.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `OAuth callback`.
→ API route: `/api/v1/auth/oauth/callback`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `AuthService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `Session, User, Membership` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `AuditEvent` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `none` and calls package `@lcsp/authz`.
→ output state: API/UI exposes LCSP session; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `Session, User, Membership` rows.
- RabbitMQ emits or consumes `AuditEvent` / `event.audit.created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: LCSP session.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
