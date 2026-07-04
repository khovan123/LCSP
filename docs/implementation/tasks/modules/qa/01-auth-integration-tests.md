---
task_id: MW-qa-001
module: qa
runtime: nestjs-api
priority: P0
status: READY_FOR_DEV
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
| `tests/integration/auth/sign-in.spec.ts` | Create | Sign-in + lockout + MFA pending |
| `tests/integration/auth/register.spec.ts` | Create | Approved path registration |
| `tests/integration/auth/mfa.spec.ts` | Create | MFA enroll + OTP verify + replay prevention |
| `tests/integration/auth/session.spec.ts` | Create | Session revoke + validation |
| `tests/integration/auth/oauth.spec.ts` | Create | OAuth start + callback + no-repo side effect |
| `tests/integration/auth/developer-invitation.spec.ts` | Create | Invite + accept + revoke flow |
| `tests/integration/auth/pbac-guard.spec.ts` | Create | Guard allow/deny for all endpoints |
| `tests/integration/helpers/auth-factory.ts` | Create | Test data factories |

## Test Environment

- Real PostgreSQL (Docker in CI).
- Real Prisma migrations applied before tests.
- No external HTTP calls — OAuth providers mocked at HTTP client level only.
- Each test in transaction that rolls back after.

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
