---
task_id: MW-web-008
module: web
runtime: nextjs
priority: P1
status: READY_FOR_DEV
epic_story: 1.5
depends_on:
  - auth-workspace/11-accept-developer-invitation-endpoint.md
  - auth-workspace/12-revoke-developer-membership-endpoint.md
  - evidence/01-get-technical-evidence-endpoint.md
  - web/02-workspace-dashboard-page.md
---

# Developer Scoped Task Workspace

## Outcome

Covers EXPERIENCE.md Flow 4 ("Developer handles a scoped task") end to end: a Developer opens an invitation link, sees exactly what organization/assessment/scope they are being granted before accepting, accepts, and then reviews their assigned redacted technical findings. Manager's golden path is never blocked by this flow (Developer participation stays optional). Access must visibly and immediately reflect revocation.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/web/src/app/(auth)/invite/accept/page.tsx` | Create | Public invitation-acceptance page, reads `?token=` |
| `apps/web/src/features/auth/components/organisms/accept-invitation-form.tsx` | Create | Display name + password form |
| `apps/web/src/app/(workspace)/developer/assessments/[id]/page.tsx` | Create | Scoped Developer task workspace |
| `apps/web/src/features/developer-task/components/organisms/scope-summary-card.tsx` | Create | Org, assessment label, granted actions, hidden-data-boundary notice |
| `apps/web/src/features/developer-task/components/organisms/redacted-findings-list.tsx` | Create | Findings list with `file_path`/`line_number` omitted |
| `apps/web/src/lib/api/auth-client.ts` | Modify | Add `acceptInvitation()` wrapper |
| `apps/web/src/lib/api/evidence-client.ts` | Create | `GET /assessments/:id/evidence` wrapper |
| `apps/web/src/app/api/auth/accept-invitation/route.ts` | Create | BFF route — sets session cookie from `POST /auth/accept-invitation` response |

## UI Components — Accept Invitation

| Component | Notes |
|---|---|
| Display name input | 1–100 chars |
| Password input | Min 12 chars, masked |
| Submit button | Loading state during request |
| Error message | Business-language: invitation invalid/expired/consumed, email already exists, password too short |

## UI Components — Scoped Task Workspace

| Component | Notes |
|---|---|
| Scope summary card | Organization name, assessment label, granted actions (business language, e.g. "View redacted technical findings"), explicit "You cannot see: source code, file paths, line numbers, or Manager-only actions" notice |
| Redacted findings list | Per finding: tool, finding type, description — `file_path`/`line_number` fields are omitted entirely, not shown as blank/null |
| Revoked banner | `{components.blocked-banner}` — "Your access to this task was revoked." No findings shown underneath |
| Empty state | "No technical findings available yet for this assessment." |

## Business Rules

1. `/invite/accept?token=...` reads `invitation_token` from the URL query — this is the one legitimate case of a credential-adjacent value in a URL, because it is a single-use invitation token, not a session token or password (distinct from the "no session token/password in URL" rule elsewhere).
2. On successful `POST /auth/accept-invitation` → BFF route sets the returned `session_token` as an httpOnly cookie (same mechanism as `MW-web-001`) and redirects to the scoped task workspace for the invitation's `assessment_id` (or to a task-selection view if the invitation was not scoped to one assessment). `session_token` itself never reaches client JS or the URL.
3. `INVITATION_INVALID` (not found, expired, or already consumed) → single business-language message: "This invitation link is no longer valid. Ask your organization owner for a new one." (do not distinguish expired vs. consumed vs. not-found — same non-leaking principle as sign-in's invalid-credentials message).
4. `EMAIL_ALREADY_EXISTS` → "An account already exists for this email. Sign in instead." with a link to `/sign-in`.
5. `PASSWORD_TOO_SHORT` → inline field-level business-language validation, mirrors `MW-web-001`'s password rules.
6. Scoped task workspace fetches `GET /assessments/:id/evidence` on mount. Response `granted_actions`/scope shown are a UI-only hint (server enforces PBAC independently, per `MW-web-002` rule 2) — this page must never assume it can show something the API didn't return.
7. `file_path` and `line_number` are `null` for Developer-scoped requests (server already redacts them) — the UI must omit these fields from the findings list entirely rather than rendering `null`/"N/A".
8. On `401 SESSION_INVALID` while fetching evidence → redirect to `/sign-in` (membership/session was fully revoked or expired, mirrors `MW-web-002` rule 5).
9. On `403 PBAC_DENIED` while fetching evidence (session still valid, scope narrowed) → show the revoked banner inline; do not redirect away, so the Developer understands *why* they lost access rather than landing on an unexplained sign-in screen.
10. On `404 EVIDENCE_NOT_FOUND` → show the empty state, not an error.
11. Manager-only actions (VerifiedProfile approval, classification request, final report generation, org management, conflict resolution) must never appear as options on this page, regardless of what the API returns — this page only ever renders `DEVELOPER_ALLOWED_ACTIONS`-scoped UI.
12. Layout follows `DESIGN.md` Auth Surface pattern for the accept-invitation screen (centered form card, no hero panel); the scoped task workspace follows the standard workspace layout (`MW-web-002`), not the Auth Surface pattern.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Valid invitation token, valid display name + password | Account created, session cookie set, redirect to scoped task workspace |
| T02 | Expired/consumed/unknown invitation token | Single generic "no longer valid" message (no distinction shown) |
| T03 | Email already has an account | "Sign in instead" message with link |
| T04 | Password under 12 chars | Inline field validation error |
| T05 | Developer views scoped workspace | Org, assessment label, granted actions, hidden-data notice shown |
| T06 | Findings list rendered | No `file_path`/`line_number` values or placeholders visible anywhere |
| T07 | No evidence yet for assessment | Empty state shown, not an error |
| T08 | Session revoked mid-session (401) | Redirect to `/sign-in` |
| T09 | Scope narrowed but session valid (403) | Inline revoked banner, no findings shown |
| T10 | Manager-only actions never rendered | UI inspection across all states |
| T11 | Invitation token never treated as a session credential | No session cookie set until acceptance succeeds |

## Definition of Done

- Accept-invitation form functional with loading state and non-leaking error messages.
- Scoped task workspace shows org/assessment/scope and redacted findings only.
- `file_path`/`line_number` never rendered, even as empty placeholders.
- Session-revoked (401) and scope-narrowed (403) are handled as two distinct, correctly-worded states.
- No Manager-only action ever rendered on this page.
- Accept-invitation screen follows `DESIGN.md` Auth Surface pattern.
