---
task_id: MW-qa-001
module: qa
runtime: nestjs-api
priority: P0
status: DONE
epic_story: 1.1
depends_on:
  - auth-workspace/14-audit-event-writer.md
  - platform/pbac/03-nestjs-guard.md
---

# Auth Integration Test Suite

## Outcome

End-to-end integration tests for all auth-workspace endpoints running against a real Prisma + PostgreSQL test database. Tests cover complete golden paths and all denial paths. No mocking of DB or PBAC.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/api/test/auth-workspace.e2e-spec.ts` | Complete | Sign-in, registration, MFA, session, profile, recovery, workspace, and decision logs |
| `apps/api/test/oauth-login.e2e-spec.ts` | Complete | OAuth start, callback, replay protection, and no repository side effects |
| `apps/api/test/invite-developer.e2e-spec.ts` | Complete | Manager invitation allow/deny paths |
| `apps/api/test/accept-invitation.e2e-spec.ts` | Complete | Developer invitation acceptance and denial paths |
| `apps/api/test/revoke-membership.e2e-spec.ts` | Complete | Membership revocation and immediate session invalidation |
| `apps/api/test/developer-pbac.e2e-spec.ts` | Complete | Developer PBAC allow/deny enforcement |
| `apps/api/test/audit-trail.e2e-spec.ts` | Complete | Audit and authorization decision log safety |
| `apps/api/test/support/auth-workspace-test-helpers.ts` | Complete | Real PostgreSQL fixtures and auth factories |

## Test Environment

- Real PostgreSQL (Docker in CI).
- Real Prisma migrations applied before tests.
- No external HTTP calls — OAuth providers mocked at HTTP client level only.
- Database state reset with deterministic fixtures before each test.

## Critical Test Scenarios

**Sign-in:**
- Valid credentials → session created
- 5 failed attempts → `ACCOUNT_LOCKED`
- `mfa_required = true` when enrolled

**Developer Invitation:**
- Manager invites → Developer accepts → membership active
- Manager revokes → Developer session returns 401

**PBAC Guard:**
- Valid session + action → 200
- Any deny condition (revoked, expired, no policy) → 403
- `AuthDecisionLog` written for every decision

## Definition of Done

- All 14 auth-workspace endpoints covered by integration tests.
- Tests run against real DB (not mocked).
- PBAC guard deny paths all tested.
- `AuthDecisionLog` presence verified for all allow/deny decisions.

## Verification

```bash
pnpm --filter @lcsp/api test:auth-integration
```

Result: 7 suites passed, 83 tests passed against the PostgreSQL test database.
