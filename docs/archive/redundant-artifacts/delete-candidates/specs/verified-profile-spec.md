# Verified Profile Spec

## Status

AUTHORITATIVE

## Purpose

Single source of truth for the object that permits Legal Matching and Risk Classification. VerifiedProfile is created only after TechnicalEvidenceReport gates, AIUsageFlow, and Reconciliation are clean or Manager-resolved.

## Canonical Rules

- Classification requires VerifiedProfile.
- Unresolved conflict blocks VerifiedProfile.
- Manager is the MVP final resolver.
- Developer absence must not block VerifiedProfile creation.
- Manager resolution is stored separately from scanner evidence.
- VerifiedProfile references WizardProfile, TechnicalProfile, AIUsageFlow, ManagerConflictResolutionTask when applicable, and audit evidence.

## Runtime Source

See `docs/developer-execution-blueprints/06-verified-profile-blueprint.md`.
