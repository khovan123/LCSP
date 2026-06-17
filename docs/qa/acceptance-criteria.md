# LCSP Acceptance Criteria

## Purpose

Product/MVP acceptance criteria before implementation. These criteria remain conditional until A1-A3 validation completes.

## Criteria

| Area | Acceptance criteria |
| --- | --- |
| Authentication & MFA | User can register/login/logout; email verification/change password/profile management are scoped and audited when enabled; MFA setup uses Authenticator App/TOTP; MFA enables only after valid OTP; MFA-enabled login requires valid OTP; invalid/expired OTP is rejected/rate-limited; disable/reset MFA is audited and follows recovery policy |
| Manager workflow | Manager can create assessment, complete Wizard, invite Developer, track status, resolve business/legal conflicts, review/approve VerifiedProfile and generate report only after gates pass |
| Developer workflow | Developer can perform only assigned technical policies, including `RUN_SCAN` when granted, and cannot approve VerifiedProfile or generate final report |
| Evidence collection | GitHub App read-only scan/re-scan, Local/CI report upload and manual technical JSON share a unified evidence contract |
| Evidence gates | Schema completeness gate rejects invalid reports; quality threshold gate controls classification readiness |
| Reconciliation | WizardProfile and TechnicalProfile mismatches create conflicts with resolver routing |
| Risk classification | Runs only after Manager-approved VerifiedProfile and legal rule/citation retrieval |
| Gap analysis | Manager can view gap analysis only after valid classification/gap result exists, and gap view is clearly not a final report |
| Document generation | Final report includes evidence source, legal trace, attestation disclosure if used and is blocked by unresolved material conflict |
| Audit trail | Wizard answers, evidence metadata, gates, conflicts, attestations, classification and documents are auditable |
| Security/privacy | No raw source to LLM; no long-term raw source storage; metadata-only audit |
| Validation gates | Backlog cannot start until A1-A3 results exist and required PRD/Architecture/ADR updates are complete |

## Must-not-pass Conditions

- Wizard-only creates risk level.
- Evidence missing but classification runs.
- Attestation replaces scanner metadata.
- LLM produces legal conclusion without rule/citation.
- Developer performs Manager-only action.
- Report finalizes with unresolved material/critical conflict.
- Risk Classification runs before Manager-approved VerifiedProfile.
- Developer runs repository scan without `RUN_SCAN` policy.
- MFA-enabled account logs in without valid Authenticator App OTP.
- MFA secret appears in plaintext logs, evidence, audit or exported documents.
- MFA reset bypasses approved recovery/support/admin verification policy.
