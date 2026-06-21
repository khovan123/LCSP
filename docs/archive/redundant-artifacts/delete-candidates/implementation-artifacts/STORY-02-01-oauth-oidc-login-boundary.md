# Story STORY-02-01 — OAuth/OIDC Login Boundary

## Metadata
- Epic ID: EPIC-02
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-01-03
- Intended implementation order: 4
- Prototype-only classification: Controlled MVP prototype authentication boundary

## User Story
As a Manager, I want to sign in with OAuth/OIDC so LCSP can authenticate my identity without granting repository access.

## Business Value
Enables MVP login while preserving GitHub authorization separation.

## Authorization and Scope Boundary
Prototype story only. It does not authorize enterprise SSO/SAML/SCIM or production identity certification.

## In Scope
- Provider-neutral OAuth/OIDC login initiation and callback boundary.
- Callback validation for state, nonce, issuer, audience, expiry and redirect URI policy.
- LCSP identity/session creation boundary.
- Explicit separation from GitHub App repository authorization.

## Out of Scope
- Enterprise SSO/SAML/SCIM.
- GitHub repository authorization.
- Production IdP hardening/certification.
- MFA implementation beyond integration boundary.

## Dependencies
- STORY-01-03.

## Architecture and Module References
- `docs/specs/implementation-contract.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/auth-oauth-mfa-rbac-implementation.md`
- `docs/security/threat-model.md`

## Domain, Data, Event, and API Contract References
- Entities: User, OAuthIdentity, Session.
- API boundary: Auth / OAuth/OIDC.
- Audit events: login started/succeeded/failed, callback validation failed, account link decision.

## Acceptance Criteria
1. OAuth/OIDC login creates only LCSP identity/session state.
2. Callback validation covers state, nonce, issuer, audience, expiry and redirect URI policy.
3. OAuth/OIDC login does not create GitHub repository connection or scan permission.
4. Invalid callback is rejected and audited.

## Technical Implementation Notes
- Keep provider adapter configurable.
- OAuth tokens must remain server-side.
- Auth controller lives in `apps/api`; Web handles redirect UX only.

## Security and Privacy Constraints
- Raw provider tokens are not exposed to UI/logs/audit export.
- OAuth login cannot grant `CONNECT_REPOSITORY` or `RUN_REPOSITORY_SCAN`.

## Auditability and Observability Expectations
- Record safe callback failure reason.
- Correlate login flow without storing raw tokens.

## Error Handling and Failure-Safe Behavior
- Invalid state/nonce/issuer/audience/expiry rejects login.
- Unsafe account linking fails closed.

## Test Expectations
- Unit tests: callback validation.
- Integration tests: login boundary does not create repository access.
- Manual verification: OAuth/GitHub separation.
- Explicit non-testable conditions: production IdP SLA/certification deferred.

## Validation and Risk-Acceptance Limitations
Auth prototype does not establish production security readiness.

## Explicit Non-Claims
No enterprise SSO, production identity certification, GitHub authorization, compliance certification or production deployment.

## Definition of Done
OAuth/OIDC identity boundary is implemented in prototype form and cannot be confused with GitHub App repository authorization.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-02-01-oauth-oidc-login-boundary.md`
