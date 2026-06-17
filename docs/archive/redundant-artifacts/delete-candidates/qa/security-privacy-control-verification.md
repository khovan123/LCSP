# Security and Privacy Control Verification

## Purpose

Map LCSP security/privacy threats to controls, verification methods and blocking behavior.

## Verification Matrix

| Threat / Abuse Case | Required Control | Verification Method | Required Evidence | Failure Impact | Blocking? |
| --- | --- | --- | --- | --- | --- |
| OAuth callback CSRF/replay | Validate state, nonce, redirect URI, issuer, audience and expiry | API/security contract test | Rejected callback audit | Account takeover | Yes |
| Auth code interception | PKCE where applicable | Config/security review | Provider/client config evidence | Session compromise | Yes |
| Unsafe account linking | Do not link by unverified email alone | Auth integration test | Account link audit | Account takeover | Yes |
| MFA enrollment bypass | TOTP setup not active until verification | API/security test | MFA setup/challenge audit | MFA bypass | Yes |
| MFA challenge brute force | Rate limit and lockout policy | Security test | Failed attempt and lockout audit | Account compromise | Yes |
| MFA reset abuse | Verified recovery/support/admin process | Manual security review + test | Reset authorization audit | Recovery bypass | Yes |
| Session reuse after revocation | Server-side session revocation | API contract test | Session revoked audit | Stale access | Yes |
| Manager privilege bypass | Server-side Manager authorization | API/RBAC test | Denied action audit | Compliance workflow breach | Yes |
| Future PermissionGrant overreach | Scoped, revocable, audited grants | Authorization contract test | Grant/revoke audit | Developer privilege escalation | Yes for Post-MVP |
| GitHub scope confusion | OAuth separate from GitHub App | API/security test | Scan blocked without GitHub App | Source access breach | Yes |
| Overbroad repository access | Least-privilege selected repo access | GitHub App config review | Permission list | Source exposure | Yes |
| Unpinned repository snapshot | Commit-pinned shallow clone | Scanner integration test | commit_sha in scan metadata | Non-reproducible evidence | Yes |
| Scanner runs as privileged process | Non-root temporary workspace | Security review | sandbox evidence | Host/source compromise | Yes |
| Customer source execution | Static-analysis only; no scripts/builds/tests/Docker/CI/API probes | Scanner fixture + sandbox audit | no execution logs, policy evidence | RCE/source risk | Yes |
| Outbound network misuse | Restricted outbound after repository retrieval | Sandbox/network policy review | network policy evidence | Data exfiltration | Yes |
| Oversized repository denial | File size/count/depth/time limits | Scanner limit tests | coverage limitation or fail-safe audit | Resource exhaustion | Yes |
| Raw source retained | Cleanup after success/failure | Scanner/recovery test | cleanup audit | Source leakage | Yes |
| Secret persisted | Deterministic redaction before persistence | Redaction fixture test | redaction audit and stored metadata | Secret leak | Yes |
| Full prompt/full AST persistence | Store only hash/category/ref/metadata | Persistence inspection | no full body evidence | Confidential data leak | Yes |
| Raw source enters LLM | LLM Gateway rejects disallowed input | Gateway contract test | rejected call audit | Source leak to provider | Yes |
| Prompt injection from repository metadata | Structured sanitized metadata and schema output | Gateway/security test | rejected unsafe output | Workflow/citation bypass | Yes |
| Legal corpus poisoning | Versioned approved corpus provenance | Corpus review | source/hash/version metadata | Unsupported legal output | Yes |
| Object storage exposure | Scoped access and no raw source artifact | Storage access test | object metadata/hash | Data exposure | Yes |
| Audit tampering | Append-oriented audit and redaction | Audit contract/review | event correlation and immutable expectation | No compliance trace | Yes |
| Abuse/rate pressure | Rate limits on auth, scan, LLM, document requests | Security/load design | rate-limit audit/metrics | Service degradation | Yes |

## Critical Privacy Rules

- Raw source code exists only in temporary scanner workspace.
- Full prompts and full AST bodies are not persisted.
- LLM receives sanitized metadata only through LLM Gateway.
- Ordinary audit records contain refs/hashes/redacted context only.

