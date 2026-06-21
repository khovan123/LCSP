# Security and Privacy Implementation

## Purpose

Define threat-to-control implementation guidance for LCSP security and privacy invariants.

## Scope

Covers authentication, authorization, GitHub App access, scanner isolation, source/prompt privacy, LLM Gateway, legal corpus provenance, storage, encryption, audit integrity and incident hooks.

## Dependencies / Source References

- [Threat Model](../security/threat-model.md)
- [Source Code Privacy Policy](../security/source-code-privacy-policy.md)
- [Implementation Contract](../specs/implementation-contract.md)

## Implementation Boundaries

- OAuth/OIDC authenticates LCSP user identity only.
- GitHub App grants repository scan access only.
- Raw source exists only in temporary scanner workspace.
- LLM Gateway receives sanitized metadata only.
- Manager authority is server-side enforced.

## Threat-to-Control Mapping

| Threat | Required Control |
| --- | --- |
| OAuth callback spoofing | Validate redirect URI, state, nonce, issuer, audience and expiry |
| Account takeover via linking | Do not link by unverified email; audit account link/unlink |
| Session theft | Secure cookies, revocation, expiration, MFA policy |
| Privilege escalation | Server-side RBAC, Manager super-role rules, scoped Post-MVP PermissionGrant |
| Developer overreach | Developer cannot finalize conflict/classification/document by default |
| Excess GitHub access | Least privilege GitHub App installation and selected repository scope |
| Source leakage | Temporary workspace, no long-term raw source persistence |
| Secret leakage | Deterministic redaction before persistence/audit |
| Prompt leakage | Do not store full system prompts by default |
| LLM data exfiltration | Gateway-only calls, sanitized metadata, reject disallowed inputs |
| Corpus poisoning | Approved/versioned legal corpus with provenance |
| Object storage exposure | Scoped access, hashes, retention, no raw source artifacts |
| Audit tampering | Append-oriented audit, correlation ids, export controls |
| Abuse/rate pressure | Rate limits on auth, scan request, LLM and document generation |

## Required Inputs and Outputs

| Input | Security Output |
| --- | --- |
| Auth callbacks | Validated identity or rejection |
| Repository scan request | Authorized scan job or denial |
| Scanner findings | Redacted evidence metadata |
| LLM input request | Accepted sanitized payload or rejected security event |
| Legal corpus update | Versioned provenance record |

## State / Error / Failure Handling

- Fail closed on auth/RBAC violation.
- Block workflow on cleanup failure until security review.
- Reject evidence containing raw source, full prompts or secrets.
- Block/degrade legal output when citation guardrail fails.

## Encryption and Retention

Encrypt or hash MFA secrets, session tokens and sensitive integration metadata. Retain raw source only in temporary workspace for scan duration. Retention periods remain a security decision before implementation.

## Incident-Response Hooks

Create alert hooks for cleanup failure, raw secret detection after redaction, OAuth callback anomaly, high access denial rate, audit write failure and suspected corpus poisoning.

## Audit Requirements

Audit auth events, access denied, GitHub connection, scan lifecycle, redaction, cleanup, conflict resolution, LLM gateway calls, corpus version use, classification and document generation.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Exact scan sandbox technology | Ephemeral isolated container or restricted temporary volume | Implementation |
| Encryption key management | Required; provider/tooling not selected | Implementation configuration |

