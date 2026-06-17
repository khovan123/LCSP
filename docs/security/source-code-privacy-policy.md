# Source Code Privacy Policy

## Purpose

Defines LCSP source-code handling rules before implementation.

## Core Rules

| Rule | Requirement |
| --- | --- |
| No raw source to LLM | LLM only receives normalized evidence, summaries, findings metadata and retrieved legal rules |
| No long-term raw source storage | Raw source may exist only in temporary scanner workspace |
| Evidence-only storage | Persist evidence reports, metadata, hashes, confidence and findings, not source |
| Secret redaction | Scanner must redact secrets before evidence output |
| Audit metadata | Audit stores actor, repo, commit, scanner version, ruleset version, report hash |
| GitHub App least privilege | Read-only, selected repo/scope only |
| Local/CI scanner alternative | Enterprise can keep source inside its environment and upload evidence report |
| Authenticated access only | Source/evidence actions require authenticated session; MFA-enabled users must pass Authenticator App OTP before workspace access |
| Developer policy isolation | Developer can access source/evidence tasks only within Manager-assigned policies |

## Temporary Workspace Handling

- Workspace is created for scan job.
- Workspace is isolated from API backend runtime where feasible.
- Workspace is deleted after scan completion or failure handling.
- Cleanup failure must create audit/security event.

## Evidence Storage

Allowed:

- report_hash
- repo/branch/commit metadata
- scanner/ruleset version
- technical_profile
- findings metadata
- confidence_per_signal
- privacy_flags

Not allowed:

- raw source repository snapshots
- long source snippets
- full AST uploads
- secrets
- raw source in LLM prompt logs

## Validation Dependencies

A3 validation may change how human attestation supplements insufficient evidence, but it cannot weaken this privacy policy.

Authentication and Authenticator App MFA protect access to source/evidence workflows, but they do not weaken the core rules: no raw source to LLM, no long-term raw source storage, and no secrets in persisted evidence/audit artifacts.
