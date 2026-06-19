# LCSP Pre-implementation Threat Model

## Purpose

Threat model for LCSP before implementation. This is not a security test plan or backlog.

## Threats

| Threat | Risk | Impact | Mitigation | Open question | Relevant module |
| --- | --- | --- | --- | --- | --- |
| Weak password | Password-auth account compromised | Unauthorized workspace/assessment access | Password policy, reset token validity, rate limit | Final password/SSO scope | Authentication |
| Password reuse | Reused credential from breach used against LCSP | Account takeover | Rate limit, MFA, suspicious login audit | Breached password screening scope | Authentication |
| Account takeover | Attacker gains Manager/Developer account | Assessment data exposure or false confirmations | MFA, session controls, audit, role enforcement | Account recovery owner | Authentication / RBAC |
| OAuth/OIDC callback abuse | Attacker tampers callback, state, nonce or token audience | Account takeover or wrong account session | Authorization code + PKCE, redirect URI/state/nonce/issuer/audience/expiry validation | Provider configuration | Authentication / OAuth |
| OAuth account linking takeover | Provider identity links to wrong LCSP account | Account takeover or cross-tenant access | Do not link solely on unverified email; audit linking; require safe linking policy | Account linking policy | Authentication / OAuth |
| OAuth token exposure | Provider token appears in UI/logs/audit | Credential leakage | Store metadata/reference only; no raw provider token in UI/log/audit | Token storage mechanism | Authentication / OAuth |
| MFA secret leakage | Authenticator App seed exposed | MFA bypass | Secret encrypted/reference-only, never logged plaintext | Secret storage mechanism | Authentication / MFA |
| OTP brute force | Repeated OTP guesses | MFA bypass | Short validity window, failed attempt counter, rate limit/temporary lock | Exact threshold | Authentication / MFA |
| Recovery bypass | MFA reset grants access without proper verification | Account takeover | Manager/admin recovery policy or support/admin verification, audit | MVP recovery authority | Authentication / MFA |
| Session hijacking | Active session token reused | Unauthorized access | Session expiration, revocation, re-authentication for sensitive actions | Session/token implementation | Authentication |
| Missing audit for MFA reset | Reset not traceable | Compliance/security investigation gap | MFA reset requested/completed events required | Audit retention policy | Authentication / Audit |
| GitHub token misuse | Overbroad or leaked repo access | Source exposure | Least privilege GitHub App, short-lived tokens, audit | Final GitHub permission manifest | Evidence / Integration |
| Unauthorized repository scan | Non-owner or undelegated Developer runs scan outside repo scope | Unauthorized source access and evidence generation | Manager ownership check or delegated `RUN_REPOSITORY_SCAN`, connected repository scope check, audit | Exact policy matrix | Evidence / RBAC |
| OAuth/GitHub boundary confusion | OAuth login mistaken for repository authorization | Unauthorized or missing repository access controls | Keep OAuth/OIDC login separate from GitHub App connection; require GitHub App for scan | UX/API copy and policy checks | Auth / Evidence |
| Overbroad GitHub App permission | GitHub App receives more access than selected read-only repo scope | Source exposure beyond assessment | Least privilege selected repository permission and permission review | Final GitHub App manifest | Evidence / Integration |
| Raw source leakage | Source sent/stored outside policy | IP/security breach | No raw source to LLM, temporary workspace cleanup | Cleanup verification mechanism | Scanner Worker |
| Secret leakage | Secrets appear in findings/logs | Credential compromise | Secret redaction before persistence | Redaction tool/rules | Scanner |
| Repository scan result tampering | Scanner-generated TechnicalEvidenceReport modified | Incorrect classification | report_hash, provenance, scanner_version, scan_job_id and integrity validation | Signing requirement if future evidence paths are added | Evidence Gate |
| Scanner report hash mismatch | Report hash does not match stored metadata | Incorrect or untrusted evidence | Reject report and keep classification locked | Hash algorithm/version | Evidence Gate |
| Scan job replay | Old scan job/result reused against current assessment state | Stale or misleading evidence | scan_job_id, repo/branch/commit, timestamp and assessment binding | Replay window policy | Evidence / Queue |
| Human attestation abuse | Bypass weak evidence | False compliance confidence | Role-bound schema, Manager review, audit, forbidden metadata replacement | A3 validation result | Reconciliation / Attestation |
| Delegation abuse | Developer receives or keeps overbroad permission | Unauthorized technical actions | Scoped PermissionGrant, revocation, server-side authorization, audit | Delegation policy | RBAC |
| Unauthorized Developer access | Developer sees or changes Manager-only data | Privacy/workflow breach | Task-based Developer policies | Exact policy matrix | RBAC |
| Legal citation hallucination | LLM invents legal basis | Invalid report | Rule/citation retrieval, output validation | A2 rule contract | Risk Classification / RAG |
| LLM overclaim | LLM makes final legal conclusion without support | Compliance overclaim | Hard-rule precedence, degraded/blocked behavior | Validation fixture coverage | Agent Worker |
| Document generation overclaim | Report implies final status when blocked | User misuse | Report gate, disclosure, no final with conflict | Template controls | Document |
| Audit log tampering | Loss of traceability | Compliance failure | Append-oriented audit, integrity controls | Immutable log approach | Audit |

## Current Security Status

Security posture is pre-implementation and conditional. Backlog remains blocked until A1-A3 validation results are recorded and required updates are complete.
