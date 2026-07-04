---
task_id: MW-web-001
module: web
runtime: nextjs
priority: P0
status: READY_FOR_DEV
epic_story: 1.2
depends_on:
  - auth-workspace/01-sign-in-endpoint.md
---

# Sign-In Page

## Outcome

Render a sign-in form that submits to `POST /auth/sign-in`. Handle MFA pending state (redirect to MFA verify page). Handle account lockout message. Store session token in httpOnly cookie or secure client store. No password or session token in URL params.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/web/app/(auth)/sign-in/page.tsx` | Create | Sign-in page |
| `apps/web/app/(auth)/sign-in/sign-in-form.tsx` | Create | Form component |
| `apps/web/lib/api/auth-client.ts` | Create | Client-side API wrapper for auth endpoints |
| `apps/web/lib/session/session-store.ts` | Create | Session token storage (httpOnly cookie preferred) |

## UI Components

| Component | Notes |
|---|---|
| Email input | Standard email validation |
| Password input | Masked, no autocomplete on shared devices warning |
| Submit button | Loading state during request |
| Error message | Business-language: `Invalid credentials`, `Account temporarily locked` |
| OAuth button | `Sign in with GitHub` → `GET /auth/oauth/start?provider=github` |

## Business Rules

1. On `sign_in_result.mfa_required = true` → redirect to `/auth/mfa/verify` with `session_token` as state (not in URL — use session cookie or memory state).
2. On success with `mfa_required = false` → redirect to `/workspace`.
3. On `ACCOUNT_LOCKED` error → show business-language message: "Account temporarily locked. Please try again later."
4. Password field must not be stored in component state after form submission.
5. Session token must not appear in URL, browser history, or console logs.
6. Error messages must not reveal whether the email exists in the system.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Valid credentials, no MFA | Redirect to `/workspace` |
| T02 | MFA required | Redirect to `/auth/mfa/verify` |
| T03 | Invalid credentials | Business-language error, no email hint |
| T04 | Account locked | Lockout message shown |
| T05 | Session token not in URL | Browser history inspection |
| T06 | Loading state on submit | Button disabled during request |

## Definition of Done

- Sign-in form functional with loading state.
- MFA redirect works correctly.
- Session token never in URL or console.
- Business-language error messages only.
