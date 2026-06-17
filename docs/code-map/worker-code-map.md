# Worker Code Map

## Purpose

Define async worker ownership before creating files.

## Folder Layout

```text
apps/worker/src/
  main.ts
  messaging/
    consumer-registry.ts
    retry-policy.ts
    message-envelope.ts
  workers/
    scanner.worker.ts
    technical-profile.worker.ts
    ai-usage-flow.worker.ts
    reconciliation.worker.ts
    legal-matching.worker.ts
    classification.worker.ts
    gap-analysis.worker.ts
    document.worker.ts
```

## Worker Ownership

| Worker | Consumes | Produces | Reads | Writes |
|---|---|---|---|---|
| `scanner.worker.ts` | `command.scan.requested.v1` | `event.scan.completed.v1` | `ScanJob`, `RepositorySnapshot` | `TechnicalEvidenceReport`, `TechnicalFinding`, graph rows |
| `technical-profile.worker.ts` | `command.technical-profile.requested.v1` | `event.technical-profile.completed.v1` or `event.technical-profile.failed.v1` | `TechnicalEvidenceReport`, `TechnicalFinding[]` | `TechnicalProfile` |
| `ai-usage-flow.worker.ts` | `command.ai-usage-flow.requested.v1` | `event.ai-usage-flow.completed.v1` or `event.ai-usage-flow.failed.v1` | `WizardProfile`, `TechnicalProfile`, findings | `AIUsageFlow`, `AIUsageFlowClaim` |
| `reconciliation.worker.ts` | `command.reconciliation.requested.v1` | `event.reconciliation.verified-profile-ready.v1` or `event.reconciliation.conflict-detected.v1` | `WizardProfile`, `TechnicalProfile`, `AIUsageFlow` | `ReconciliationConflict` or `VerifiedProfile` |
| `legal-matching.worker.ts` | `command.legal-matching.requested.v1` | `event.legal-matching.completed.v1` or `event.legal-matching.failed.v1` | `VerifiedProfile`, legal corpus | `LegalRuleMatch` |
| `classification.worker.ts` | `command.classification.requested.v1` | `event.classification.completed.v1` or `event.classification.blocked.v1` | `VerifiedProfile`, `LegalRuleMatch[]` | `RiskClassification` |
| `gap-analysis.worker.ts` | `command.gap-analysis.requested.v1` | `event.gap-analysis.completed.v1`, `event.gap-analysis.blocked.v1`, or `event.gap-analysis.failed.v1` | `RiskClassification`, `LegalRuleMatch[]`, obligations | `GapAnalysis` |
| `document.worker.ts` | `command.document.requested.v1` | `event.document.generated.v1` or `event.document.blocked.v1` | `RiskClassification`, `GapAnalysis`, citations | `GeneratedDocument` |

## Worker Rule

Every worker must be idempotent by message idempotency key and must write audit events for state-changing output.


## Phase 5.5 Worker Trigger Rule

Orchestrator/projection handlers consume domain events and create the next `command.*` outbox row. Workers consume commands only. Legal matching is requested after `event.reconciliation.verified-profile-ready.v1`; classification is requested after `event.legal-matching.completed.v1`; gap analysis is requested after `event.classification.completed.v1`; document generation is requested after `event.gap-analysis.completed.v1`.
