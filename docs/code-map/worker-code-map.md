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
| `technical-profile.worker.ts` | `event.scan.completed.v1` | `event.technical-profile.completed.v1` | `TechnicalEvidenceReport`, `TechnicalFinding[]` | `TechnicalProfile` |
| `ai-usage-flow.worker.ts` | `event.technical-profile.completed.v1` | `event.ai-usage-flow.completed.v1` or `event.reconciliation.conflict-detected.v1` | `WizardProfile`, `TechnicalProfile`, findings | `AIUsageFlow`, `AIUsageFlowClaim` |
| `reconciliation.worker.ts` | `event.ai-usage-flow.completed.v1` / Manager resolution event | `event.reconciliation.verified-profile-ready.v1` | `WizardProfile`, `TechnicalProfile`, `AIUsageFlow` | `ManagerConflictResolutionTask` or `VerifiedProfile` |
| `legal-matching.worker.ts` | `event.reconciliation.verified-profile-ready.v1` | `event.legal-matching.completed.v1` or `event.legal-matching.failed.v1` | `VerifiedProfile`, legal corpus | `LegalRuleMatch` |
| `classification.worker.ts` | `event.legal-matching.completed.v1` | `event.classification.completed.v1` or `event.classification.blocked.v1` | `VerifiedProfile`, `LegalRuleMatch[]` | `ClassificationResult` |
| `gap-analysis.worker.ts` | internal orchestration after classification result or document request | no canonical Phase 5.5 RabbitMQ event | `ClassificationResult`, obligations | `GapAnalysis` |
| `document.worker.ts` | `command.document.requested.v1` | `event.document.generated.v1` or `event.document.blocked.v1` | `ClassificationResult`, `GapAnalysis`, citations | `GeneratedDocument` |

## Worker Rule

Every worker must be idempotent by message idempotency key and must write audit events for state-changing output.


## Phase 5.5 Worker Trigger Rule

Legal matching consumes `event.reconciliation.verified-profile-ready.v1` and produces `event.legal-matching.completed.v1` or `event.legal-matching.failed.v1`. Classification consumes `event.legal-matching.completed.v1` only. Classification must not consume `event.reconciliation.verified-profile-ready.v1` directly.
