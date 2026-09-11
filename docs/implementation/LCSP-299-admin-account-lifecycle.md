# LCSP-299 — Admin account lifecycle and provisioning

## Scope and consumers

Implements the account-management API consumed by LCSP-295, under parent LCSP-297. LCSP-298 account metrics must use the same persisted lifecycle, not login lockouts. No commit, push or production migration is performed by this implementation.

## Canonical state

`User.accessStatus` is `ACTIVE` or `SUSPENDED`. `User.accessVersion` increments on effective role, suspend and restore changes. `lockUntil`, failed-login counters and MFA lockouts remain transient security controls.

`INVITED` in the list/detail read model refers only to a real, unexpired `AccountInvitation` with `PENDING` status. An unverified User is not an invitation. Expired, revoked and accepted invitation records are not included in the pending list. Invitation identifiers are prefixed with `invitation:` and differentiated by `referenceType`.

Migration `20260911090000_admin_account_lifecycle` is additive. It converts the exact year-9999 sentinel from the prior Admin implementation and revokes those sessions. Other finite lockouts and active sessions are preserved. Deploy the migration before the new API. Deploy the web/API contract together because legacy mutation clients without version/idempotency are rejected.

## HTTP contracts

All Admin endpoints use the existing `RbacGuard` and Admin policy independently. JSON success/failure uses the canonical result/problem envelope.

| Endpoint | Input and behavior |
| --- | --- |
| GET /admin/users | q (alias query), status, role, page, pageSize (alias page_size); server-side PostgreSQL filtering and stable `createdAt DESC, id ASC` sort; default 20, maximum 100 rows/page |
| GET /admin/users/:id | Safe user/invitation detail, authoritative status/version and bounded usage |
| POST /admin/users/:id/role | `{ role, expectedVersion }`, Idempotency-Key, optional X-Correlation-Id |
| POST /admin/users/:id/suspend | `{ expectedVersion, reason? }`, same headers |
| POST /admin/users/:id/restore | `{ expectedVersion, reason? }`, same headers |
| POST /admin/users | `{ email, displayName, role }`, Idempotency-Key; creates/sends real invitation; 201 only after successful delivery |
| POST /auth/invitations/accept | `{ token, password }`; opaque token authorizes one-time acceptance; no role/account ID accepted from the caller |

Role/suspend/restore return HTTP 200 with server-read detail. Retries using the same actor/key and normalized payload do not repeat the state transition or mutation audit event; `replayed` is true and current server state is returned. Reusing a key for a different payload returns a deterministic 409. Missing/malformed versions/keys are rejected, not filled by the server.

## Authorization and concurrent mutation safety

A transaction-scoped PostgreSQL advisory lock serializes lifecycle/provisioning commands. Current actor, active session and access version are re-read after lock acquisition. The target User row is locked before mutation and compared with expectedVersion. Audit, state update, revocation and command receipt commit atomically. Failure to persist the mutation audit rolls back the mutation.

Self-suspend is always denied. Self-demotion is permitted only when another usable Admin remains. For this implementation, a usable Admin is an ACTIVE, email-verified ADMIN with neither a current login lockout nor a current MFA lockout. Two concurrent demotions cannot both remove the last usable Admin. Invited Admins do not count as existing usable Admin accounts.

Effective role changes and suspension revoke existing sessions. Session persistence compares accessVersion and does not un-revoke a stale MFA/reauth session entity. Session issuance uses the same target User row lock. Restore changes durable access to ACTIVE without recreating previously revoked sessions; the user must sign in again. Password login, OAuth login, request RBAC and worker preflight enforce suspension.

## Invitation security and delivery

The token has 32 random bytes; only its SHA-256 digest authorizes acceptance. Pending delivery material is AES-256-GCM encrypted with the invitation ID as authenticated associated data. SMTP delivery runs outside the lifecycle transaction with a bounded lease. Successful delivery clears encrypted material; the token itself is never returned by Admin projections or stored as plaintext.

Expiry is 48 hours. The invitee chooses a 12–256-character password. Acceptance atomically consumes the invitation and creates the actual User with the stored intended role. No automatic session is created; normal sign-in and MFA policy apply.

Email links use `/sign-up#invitation=...`. The web form captures the fragment once, removes it from the address bar, and handles React Strict Mode effect replay without losing the token. The token/password submission stays on the existing API/BFF path, not a fake client success.

Delivery failure returns 503 and leaves a retryable invitation, not a falsely successful send. The UI retains the idempotency key for an unchanged invite request. Reissuing an expired invitation increments a separate generation; receipts are pinned to that generation. Old request retries return ADMIN_INVITATION_STALE_GENERATION and cannot deliver or authorize a newer invitation. Acceptance is single-use even with parallel requests.

Configure these on the API before enabling actual delivery:

- Existing SMTP configuration consumed by MailService.
- `ADMIN_INVITATION_ENCRYPTION_KEY`: at least 32 characters, managed as a secret; no default key.
- `ADMIN_INVITATION_WEB_ORIGIN`: an HTTPS origin with no credentials, path, query or fragment. HTTP is allowed only for localhost/127.0.0.1 development.

Missing SMTP/key/origin fails closed with ADMIN_INVITATION_DELIVERY_UNAVAILABLE. SMTP transport was replaced with a fake mail sender in automated tests; real delivery needs a configured deployment smoke check. Delivery retries may send the same email twice if SMTP accepts a message before the process loses its acknowledgement; the token remains the same and one-time use prevents duplicate account creation. Automatic scheduled retry/resend UI for already-delivered invitations is not part of this task.

## Read model and privacy

The API selects only safe identity/status/version fields. Counts are server aggregates; account pagination does not load the full user base or all owned assessment IDs into memory. `assessments30d` uses actual owned assessments over the trailing 30 days. `lastAssessmentAt` uses the actual maximum creation time. `lastActiveAt` currently means the latest trusted session issuance timestamp, not a browser interaction timestamp. Credit spend and open findings remain `null` because this read model has no canonical aggregate for them; the UI renders unavailable rather than invented zero.

No password hash, MFA secret, recovery code, session/OAuth token or unrestricted audit payload is included in Admin DTOs. Internal audit still retains safe actor/target/previous/new state/reason/correlation metadata.

## UI integration

LCSP-295 Create user opens a validated invitation form. Suspended User detail exposes Restore account instead of a disabled Suspend button. Invited records cannot be role-changed or suspended as if they were Users. BFF helpers forward expectedVersion, idempotency and correlation headers rather than discarding them. Mutation errors remain visible and query invalidation reloads server state. All new UI strings are available in EN/VI.

## Verification

Run from the repository root with supported Node and pnpm:

```sh
pnpm --filter @lcsp/api prisma:generate
pnpm exec tsc -b --pretty false
pnpm --filter @lcsp/api lint
pnpm --filter @lcsp/api build
NODE_OPTIONS=--experimental-vm-modules pnpm --filter @lcsp/api exec jest --config jest.config.ts --runInBand --watchman=false
pnpm run test:web
```

The focused database suite is fenced to a disposable PostgreSQL instance at `127.0.0.1:55439/lcsp_299_test`. It never reads an application database URL implicitly. Provision an empty local database, set both explicit URLs, and run:

```sh
export LCSP299_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55439/lcsp_299_test?schema=public'
export DATABASE_URL="$LCSP299_TEST_DATABASE_URL"
pnpm --filter @lcsp/api exec prisma db push
NODE_OPTIONS=--experimental-vm-modules pnpm --filter @lcsp/api exec jest --config test/jest-e2e.ts --runInBand --watchman=false --runTestsByPath test/admin-users.e2e-spec.ts test/lcsp299-account-lifecycle.e2e-spec.ts
```

WARNING: the legacy Admin E2E helper resets its explicitly configured disposable test database. Never point those tests at shared/staging/production data. The tests use real PostgreSQL transactions, actual account/auth modules, actual RBAC and a simulated SMTP boundary, while excluding unrelated repository-provider CLI startup dependencies.

Migration verification was performed separately against the prior HEAD schema on `lcsp_299_migration_test`: applied the actual migration SQL, verified year-9999 conversion, finite lock preservation and session revocation, then verified `prisma migrate diff` reports no difference versus the target schema. Application data was not migrated.

Browser click-through and real SMTP delivery are not covered by the Node SSR/client or PostgreSQL suites; do not equate those test results with a deployed browser/SMTP end-to-end certification.


## Verified implementation result — 2026-09-11

Branch: `feat/LCSP-299-admin-account-lifecycle`; base commit: `de4582ac9e650d4d195586c072bc1c5cecd43fc9`. Changes remain uncommitted.

| Check | Result |
| --- | --- |
| Prisma client generation | PASS |
| Full workspace TypeScript (`tsc -b`) | PASS |
| Full API ESLint | PASS, 0 errors; 5 pre-existing warnings in legal-rule-catalog tests |
| API build (including contracts/i18n prebuild) | PASS |
| Full API unit suite | 846 PASS; 22 skipped; 1 todo |
| Admin HTTP/PostgreSQL suites | 34 PASS (16 existing auth-module tests plus 18 lifecycle/security cases) |
| Web feature/client/SSR suite | 344 PASS |
| Import policy | PASS |
| Contract literal policy | PASS |
| Actual previous-schema migration + target-schema parity | PASS |
| git diff --check | PASS |

The old full-App Admin test fixture originally failed before any assertions because an unrelated Azure DevOps CLI provider was unavailable. Its setup now imports the actual auth/RBAC modules, Prisma and canonical problem handlers rather than unrelated provider modules. No production guard or provider policy was relaxed. Existing last-admin test data was corrected to actually contain a single usable Admin. React SSR test execution uses the same automatic JSX runtime as Next. Existing BFF architecture sentinels verify the shared upstream helper instead of requiring duplicated upstream calls per route.

One pre-existing full-lint blocker in `gitlab-secure-archive-http.transport.real.spec.ts` was fixed by retaining the caught error as `cause`; no GitLab production behavior changed. Complete browser navigation and real SMTP transport delivery were not executed. Those remain deployment smoke checks, separate from the passing code-level gates above.
