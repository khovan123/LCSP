# Story STORY-02-02 — Session, MFA Hooks, and Account Safety

## Metadata
- Epic ID: EPIC-02
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-02-01
- Intended implementation order: 5
- Prototype-only classification: Controlled MVP prototype auth assurance story

## User Story
As a security reviewer, I want session and MFA hooks present so the prototype preserves LCSP authentication assurance boundaries.

## Business Value
Keeps auth prototype aligned with the security threat model.

## Authorization and Scope Boundary
Prototype auth assurance only; not production auth certification.

## In Scope
- Session lifecycle hooks for login, logout, revocation and expiry.
- TOTP MFA challenge when enabled.
- MFA setup/reset/disable audit readiness.
- Workspace access block for failed MFA or invalid session.

## Out of Scope
- SMS OTP.
- Enterprise recovery workflows beyond prototype policy.
- Production account recovery certification.

## Dependencies
- STORY-02-01.

## Architecture and Module References
- `docs/implementation/auth-oauth-mfa-rbac-implementation.md`
- `docs/specs/implementation-contract.md`
- `docs/security/threat-model.md`

## Domain, Data, Event, and API Contract References
- Entities: User, UserMfaMethod, Session, AuditEvent.
- API groups: Auth / MFA / Profile.

## Acceptance Criteria
1. Session lifecycle supports login, logout and revocation.
2. TOTP MFA challenge is enforced when enabled.
3. MFA setup/reset/disable paths are audit-ready.
4. Failed MFA or invalid session blocks workspace access.

## Technical Implementation Notes
- Store MFA secret only as encrypted value/reference.
- Enforce server-side session checks for protected endpoints.

## Security and Privacy Constraints
- MFA secret is never logged plaintext.
- Auth failures must not leak account enumeration details.

## Auditability and Observability Expectations
- Audit MFA setup, challenge success/failure, reset, disable and session revocation.

## Error Handling and Failure-Safe Behavior
- Invalid/expired/replayed OTP fails closed.
- Revoked session cannot call protected endpoints.

## Test Expectations
- Unit tests: session and MFA policy checks.
- Integration tests: protected endpoint access blocked when MFA/session invalid.
- Manual verification: MFA audit event presence.
- Explicit non-testable conditions: production recovery process remains decision-dependent.

## Validation and Risk-Acceptance Limitations
Recovery policy may evolve after validation/security review.

## Explicit Non-Claims
No production security certification, SSO/SAML/SCIM, compliance certification or production deployment.

## Definition of Done
Prototype session and MFA hooks are represented and fail closed without weakening Manager workflow ownership.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-02-02-session-mfa-hooks-and-account-safety.md`
