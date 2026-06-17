# LCSP Pre-implementation Threat Model

## Purpose

Threat model for LCSP before implementation. This is not a security test plan or backlog.

## Threats

| Threat | Risk | Impact | Mitigation | Open question | Relevant module |
| --- | --- | --- | --- | --- | --- |
| Weak password | Password-auth account compromised | Unauthorized workspace/assessment access | Password policy, reset token validity, rate limit | Final password/SSO scope | Authentication |
| Password reuse | Reused credential from breach used against LCSP | Account takeover | Rate limit, MFA, suspicious login audit | Breached password screening scope | Authentication |
| Account takeover | Attacker gains Manager/Developer account | Assessment data exposure or false confirmations | MFA, session controls, audit, role enforcement | Account recovery owner | Authentication / RBAC |
| MFA secret leakage | Authenticator App seed exposed | MFA bypass | Secret encrypted/reference-only, never logged plaintext | Secret storage mechanism | Authentication / MFA |
| OTP brute force | Repeated OTP guesses | MFA bypass | Short validity window, failed attempt counter, rate limit/temporary lock | Exact threshold | Authentication / MFA |
| Recovery bypass | MFA reset grants access without proper verification | Account takeover | Manager/admin recovery policy or support/admin verification, audit | MVP recovery authority | Authentication / MFA |
| Session hijacking | Active session token reused | Unauthorized access | Session expiration, revocation, re-authentication for sensitive actions | Session/token implementation | Authentication |
| Missing audit for MFA reset | Reset not traceable | Compliance/security investigation gap | MFA reset requested/completed events required | Audit retention policy | Authentication / Audit |
| GitHub token misuse | Overbroad or leaked repo access | Source exposure | Least privilege GitHub App, short-lived tokens, audit | Final GitHub permission manifest | Evidence / Integration |
| Raw source leakage | Source sent/stored outside policy | IP/security breach | No raw source to LLM, temporary workspace cleanup | Cleanup verification mechanism | Scanner Worker |
| Secret leakage | Secrets appear in findings/logs | Credential compromise | Secret redaction before persistence | Redaction tool/rules | Scanner |
| Evidence tampering | Uploaded report modified | Incorrect classification | report_hash, provenance, integrity validation | Signing requirement for Local/CI | Evidence Gate |
| Human attestation abuse | Bypass weak evidence | False compliance confidence | Role-bound schema, dual confirmation, audit | A3 validation result | Reconciliation / Attestation |
| Unauthorized Developer access | Developer sees or changes Manager-only data | Privacy/workflow breach | Task-based Developer policies | Exact policy matrix | RBAC |
| Legal citation hallucination | LLM invents legal basis | Invalid report | Rule/citation retrieval, output validation | A2 rule contract | Risk Classification / RAG |
| LLM overclaim | LLM makes final legal conclusion without support | Compliance overclaim | Hard-rule precedence, degraded/blocked behavior | Validation fixture coverage | Agent Worker |
| Document generation overclaim | Report implies final status when blocked | User misuse | Report gate, disclosure, no final with conflict | Template controls | Document |
| Audit log tampering | Loss of traceability | Compliance failure | Append-oriented audit, integrity controls | Immutable log approach | Audit |

## Current Security Status

Security posture is pre-implementation and conditional. Backlog remains blocked until A1-A3 validation results are recorded and required updates are complete.
