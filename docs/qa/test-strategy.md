# LCSP Test Strategy

## Purpose

Defines pre-implementation test strategy for LCSP. This is not a test backlog.

## Test Layers

| Layer | Focus |
| --- | --- |
| Authentication tests | Register/login/logout/session/email verification/password reset/change password/profile constraints and Authenticator App MFA setup/login/disable/reset |
| Unit tests | Pure rules, state transitions, scoring thresholds, validators |
| Integration tests | Evidence report validation, reconciliation, RAG/rule lookup, document pipeline |
| E2E tests | Manager-led assessment, Developer evidence task, repository scan/re-scan, conflict resolution, VerifiedProfile approval, gap view, report generation |
| Agent output validation | Schema validation, rule trace, no unsupported legal conclusion |
| Evidence contract validation | Required fields, privacy flags, report hash, provenance and scan job output contract |
| Reconciliation tests | Conflict creation, routing, dual confirmation, block conditions |
| Scoring threshold tests | Evidence Confidence, AI Intervention, Conflict Score behavior |
| Security/privacy tests | No raw source to LLM, no long-term source storage, secret redaction |
| MFA/security tests | MFA secret not logged plaintext, invalid/expired OTP rejected, OTP brute force protection, MFA reset audit |
| Regression tests | Wizard-only no risk level, no classification before VerifiedProfile, no final report with conflict |

## Validation A1-A3 Dependency

| Assumption | Test strategy dependency |
| --- | --- |
| A1 | Final WizardProfile fields and Wizard UX test cases |
| A2 | Legal rule fixtures, citation contract and output validation |
| A3 | Attestation abuse tests and role-bound claim policy |

## Non-negotiable Regression Assertions

- Wizard-only never shows HIGH/MEDIUM/LOW or provisional risk label.
- Risk Classification cannot run before Manager-approved VerifiedProfile.
- Conflict Score is the only blocking score.
- Human attestation cannot replace machine-generated metadata.
- Raw source code is not sent to LLM.
- Final report cannot be generated with unresolved material/critical conflict.
- MFA-enabled account cannot create a session without a valid Authenticator App OTP.
- MFA setup is not enabled until OTP verification succeeds.
- MFA reset/disable actions are audited and cannot bypass authentication policy.
- Developer cannot run repository scan without `RUN_SCAN` policy.
- Gap analysis view cannot be presented as final compliance report.
