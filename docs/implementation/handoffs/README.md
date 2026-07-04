---
status: ACTIVE_PLANNING_ARTIFACT
artifact_type: engineering_handoff_catalog
---

# LCSP Engineering Handoff Catalog

## Purpose

This folder contains domain and wave handoff packets for implementation planning. Handoffs group task briefs into executable context packets for engineers and AI coding agents.

## Handoff Index

| Handoff | Status | Scope | Included tasks |
|---|---|---|---|
| [HANDOFF-scanner-evidence-to-technical-profile.md](HANDOFF-scanner-evidence-to-technical-profile.md) | `READY_FOR_PLANNING_REVIEW` | repository scan, evidence gates, TechnicalProfile | MW-scan-001, MW-pyp-001, MW-scan-py-001, MW-scan-py-004, MW-intel-001 |
| [HANDOFF-ai-usage-flow-and-reconciliation.md](HANDOFF-ai-usage-flow-and-reconciliation.md) | `READY_FOR_PLANNING_REVIEW` | AIUsageFlow, conflict candidates, reconciliation, VerifiedProfile | MW-intel-002, MW-intel-004 |

## Rules

- Handoffs do not authorize implementation before readiness and sprint planning.
- Handoffs must cite active authority docs only.
- Handoffs must preserve artifact boundaries:
  - `TechnicalEvidenceReport` is scanner evidence.
  - `TechnicalProfile` is technical observation.
  - `AIUsageFlow` is business usage claim set.
  - `VerifiedProfile` is post-reconciliation final profile for legal matching.
