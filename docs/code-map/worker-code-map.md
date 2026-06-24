# Worker Code Map

## Purpose

Define asynchronous worker ownership for the A-to-Z runnable MVP.

## Runtime Layout

```text
lcsp-python-workers/                 # Python Worker Platform
  src/lcsp_workers/
    scan_trigger/
    scanner/
    technical_profile/
    ai_usage_flow/
    reconciliation/
    legal_ingestion/
    legal_index/
    legal_matching/
    classification/
    gap_analysis/
    document/

tools/ts-js-analyzer/                # bounded Node.js CLI only

apps/worker/src/                    # SUPERSEDED_FOR_ACTIVE_MVP for downstream domain workers
```

There is no active Node.js scanner lifecycle worker or downstream domain worker. Python Worker Platform owns all asynchronous domain workloads. Node.js remains only for NestJS API, web/tooling and bounded TS/JS analyzer CLI.

Canonical MVP topology is one Python worker monorepo: `lcsp-python-workers/`. The historical standalone scanner package name is superseded for active planning.

## Worker Ownership

| Worker | Runtime | Consumes | Produces | Reads | Writes |
|---|---|---|---|---|---|
| Scan Trigger Worker | Python | `command.scan-trigger.resolve-context.v1` | trigger ready/pending/blocked/waiting/rejected events | trigger context, policy, repository mappings | TrustedScanTrigger, ScanMappingResolution, audit, outbox |
| Python Scanner Worker | Python | `command.scan.requested.v1` | `event.scan.completed.v1`, `event.scan.failed.v1` | scan job and snapshot | scanner evidence, audit, outbox |
| Technical Profile Worker | Python | `command.technical-profile.requested.v1` | technical-profile completed/failed events | accepted report and findings | TechnicalProfile, audit, outbox |
| AI Usage Flow Worker | Python | `command.ai-usage-flow.requested.v1` | AIUsageFlow completed/failed events | WizardProfile, TechnicalProfile, findings | flow, claims, audit, outbox |
| Reconciliation Worker | Python | `command.reconciliation.requested.v1` | verified-profile-ready or conflict-detected event | WizardProfile, TechnicalProfile, AIUsageFlow | conflict or VerifiedProfile, audit, outbox |
| Legal Ingestion Worker | Python | `command.legal-source.ingest.requested.v1` | `event.legal-source.ingest.completed.v1`, `event.legal-source.ingest.failed.v1` | validated source request | legal source/document/items, audit, outbox |
| ChromaDB Legal Index Worker | Python | `command.legal-index-build.requested.v1` | `event.legal-index-build.completed.v1`, `event.legal-index-build.failed.v1` | approved legal hierarchy and chunks | ChromaDB records, metadata/xref index, audit, outbox |
| Legal Matching Worker | Python | `command.legal-matching.requested.v1` | legal-matching completed/failed events | VerifiedProfile and approved index | LegalRuleMatch, retrieval audit, audit, outbox |
| Classification Worker | Python | `command.classification.requested.v1` | classification completed/blocked events | VerifiedProfile and legal matches | RiskClassification, model metadata, audit, outbox |
| Gap Analysis Worker | Python | `command.gap-analysis.requested.v1` | gap-analysis completed/blocked/failed events | classification and legal matches | GapAnalysis, audit, outbox |
| Document Worker | Python | `command.document.requested.v1` | document generated/blocked events | classification, gaps, citations | GeneratedDocument, model metadata, audit, outbox |

## Canonical Legal Operations Chain

```text
command.legal-source.ingest.requested.v1
-> event.legal-source.ingest.completed.v1
-> internal review and approval
-> command.legal-index-build.requested.v1
-> event.legal-index-build.completed.v1
-> corpus available to legal matching
```

## Rules

- Workers are idempotent by canonical key.
- State changes and OutboxEvent creation occur in one database transaction.
- Workers consume commands; projections consume events and stage the next command.
- Queue payloads contain references and redacted metadata only.
- Scan success requires report gates and verified workspace cleanup.
- Legal matching uses only approved immutable corpus versions with completed indexes.
- External model calls go through LLM Gateway.
- Internal Legal Operator approval remains an internal API/CLI operation for MVP.
