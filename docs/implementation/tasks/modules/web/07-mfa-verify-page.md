---
task_id: MW-web-007
module: web
runtime: nextjs
priority: P0
status: READY_FOR_DEV
epic_story: 1.2
depends_on:
  - auth-workspace/04-mfa-verify-otp-endpoint.md
  - web/01-auth-sign-in-page.md
---

# MFA Verify Page

## Outcome

Render the MFA challenge form reached after sign-in when `mfa_required = true`. Submit a 6-digit OTP to `POST /auth/mfa/verify-otp` using the pending session (httpOnly cookie already set at sign-in — never read from URL). On success, redirect to `/workspace`. Handle invalid code, replayed code, rate-limit lockout, and invalid/expired session. Follows the `DESIGN.md` Auth Surface pattern (centered form card, no hero panel).

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/web/src/app/(auth)/mfa/verify/page.tsx` | Create | MFA verify page |
| `apps/web/src/features/auth/components/organisms/mfa-verify-form.tsx` | Create | Form component |
| `apps/web/src/features/auth/schemas/mfa-verify.schema.ts` | Create | OTP validation schema |
| `apps/web/src/lib/api/auth-client.ts` | Modify | Add `verifyMfaOtp()` wrapper |
| `apps/web/src/app/api/auth/mfa/verify-otp/route.ts` | Create | BFF route — reads the pending session cookie server-side and forwards it to `POST /auth/mfa/verify-otp`; never exposes it to client JS |

## UI Components

| Component | Notes |
|---|---|
| OTP input | 6-digit, numeric |
| Submit button | Loading state during request |
| Error message | Business-language: invalid code, too many attempts |
| "Need help?" link | Same `accessHelp` pattern as sign-in — contact organization owner |

## Business Rules

1. Page must not read `session_token` from a URL query param. The pending session is the httpOnly cookie already set by `POST /api/auth/sign-in` (see `MW-web-001`). The BFF route (`/api/auth/mfa/verify-otp`) reads that cookie server-side and forwards it in the request body to the API.
2. On `verified = true` → redirect to `/workspace`.
3. On `error_code = OTP_INVALID` → business-language error `auth.errors.mfaInvalid`: "The verification code is invalid or has expired." Do not reveal remaining attempt count beyond what the API response provides.
4. On `error_code = OTP_REPLAYED` → same generic message as `OTP_INVALID` (`auth.errors.mfaInvalid`). Do not tell the user the code was "already used" — that leaks replay/timing information distinguishable from a simple wrong code.
5. On `error_code = MFA_RATE_LIMITED` → business-language lockout message `auth.errors.mfaRateLimited`: "Too many failed attempts. Please try again later." Submit button disabled while locked.
6. On `error_code = SESSION_INVALID` → redirect to `/sign-in` (pending session expired or was never established).
7. OTP value must never be logged to the console or included in any URL, query param, or browser history entry.
8. OTP field cleared from component state after each submit attempt (same discipline as the password field in `MW-web-001`).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Valid pending session + correct OTP | Redirect to `/workspace` |
| T02 | Wrong OTP | Business-language "invalid or expired" error, field cleared |
| T03 | Replayed OTP | Same generic invalid-code message as T02 (no "already used" wording) |
| T04 | 5 consecutive wrong OTPs | Rate-limit message shown, submit disabled |
| T05 | Session invalid/expired | Redirect to `/sign-in` |
| T06 | OTP never in URL, history, or console | Browser history + console inspection |
| T07 | Loading state on submit | Button disabled during request |

## Definition of Done

- OTP form functional with loading state.
- Success redirects to `/workspace`; invalid/expired session redirects to `/sign-in`.
- Rate-limit and invalid-code states use distinct, business-language, non-leaking messages.
- OTP never in URL, browser history, or console logs.
- Layout follows `DESIGN.md` Auth Surface pattern — no hero panel, no new brand-only tokens.
