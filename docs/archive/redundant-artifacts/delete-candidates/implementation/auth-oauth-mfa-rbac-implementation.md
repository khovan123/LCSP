# Auth, OAuth/OIDC, MFA and RBAC Implementation

## Purpose

Define authentication, session, MFA and authorization implementation contracts for LCSP MVP.

## Scope

LCSP supports Password Login where retained by source docs, OAuth/OIDC Login as active MVP, TOTP MFA and server-side role/permission checks. OAuth/OIDC authenticates LCSP identity only and does not grant GitHub repository access.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Threat Model](../security/threat-model.md)
- [API and Async Event Contracts](api-and-async-event-contracts.md)

## Implementation Boundaries

- OAuth/OIDC Login is separate from GitHub App repository authorization.
- OAuth/OIDC provider tokens must not be exposed to UI or logs.
- LCSP session and RBAC remain internal authorization authority.
- Manager is MVP super-role.
- Developer delegation is Post-MVP and scoped.

## Authentication Flows

| Flow | Required Controls | Output |
| --- | --- | --- |
| Password Login | Credential validation, lockout/session policy, MFA when required | LCSP session |
| OAuth/OIDC Login | Authorization Code Flow, PKCE when applicable, state, nonce, issuer, audience, expiry and redirect URI validation | Linked LCSP identity + session candidate |
| TOTP MFA Challenge | User-bound TOTP secret, rate limiting, lockout, recovery/reset policy | Session continuation |
| Logout / Session Revocation | Server-side session invalidation | Session ended |

## Safe Account Linking

- Do not link accounts based only on unverified email.
- Validate provider subject and verified identity according to provider policy.
- Link attempts, failures and unlink requests must be audited.
- Account linking must not grant new repository scan permission by itself.

## MVP Role Matrix

| Capability | Manager | Developer |
| --- | --- | --- |
| Create assessment | Yes | No unless future delegation |
| Complete WizardProfile | Yes | No |
| Connect GitHub repository | Yes | Optional if assigned |
| Run Repository Scan | Yes | Optional if assigned |
| View scan status | Yes | Optional if assigned |
| View TechnicalEvidenceReport and findings | Yes | Optional if assigned |
| Review AIUsageFlow | Yes | Optional if assigned |
| Resolve business conflict | Yes | No |
| Resolve technical conflict | Yes | Optional input only |
| Finalize conflict resolution | Yes | No |
| Build/approve VerifiedProfile | Yes | No |
| Trigger risk classification | Yes | No |
| View gap analysis | Yes | Optional if permitted |
| Generate compliance document | Yes | No |
| View audit trail | Yes | Limited to assigned scope if Developer exists |
| Manage organization and assignments | Yes | No |

## Post-MVP PermissionGrant

| Field | Purpose |
| --- | --- |
| `granted_by_manager_id` | Manager who delegated the scope |
| `grantee_user_id` | Developer or collaborator receiving scope |
| `scope_type` / `scope_id` | Organization, assessment, repository or task boundary |
| `permission_code` | Delegated technical permission |
| `status`, `expires_at`, `revoked_at` | Revocable lifecycle |

Delegation never removes Manager permissions and never gives Developer final compliance authority by default.

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| Provider authorization response | Validated OAuthIdentity or rejected callback |
| MFA code | MFA pass/fail state |
| Session token/cookie | Authenticated user context |
| User role/grants | Allowed action set |

## State / Error / Failure Handling

- Invalid callback/state/nonce/issuer/audience/expiry rejects login.
- MFA failure blocks session continuation.
- Revoked session blocks API access.
- Missing Manager authority blocks final compliance actions.
- Developer without delegated scope receives access denied.

## Security and Privacy Considerations

- Use Authorization Code Flow; use PKCE where applicable.
- Do not place OAuth client secret in frontend.
- Do not log raw provider access/refresh tokens.
- Protect session cookies with secure, httpOnly and same-site settings according to environment.
- Apply server-side authorization to every state-changing endpoint.

## Audit Requirements

Audit login success/failure, OAuth callback validation failure, account linked/unlinked, MFA setup/challenge/reset/disable, session revoked, permission grant/revocation and denied authorization attempts.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Exact OAuth/OIDC provider | Provider-neutral contract; at least one configured provider required before release | Implementation configuration |
| MFA recovery policy details | Required, but exact operator/user recovery process remains security decision | Implementation |

