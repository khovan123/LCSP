# Worker Code Map

## Purpose

Define asynchronous worker ownership for the A-to-Z runnable MVP.

## Runtime Layout

```text
lcsp-scanner-worker/                 # Python scanner runtime
  src/lcsp_scanner/
    main.py
    queue/
    workspace/
    parsers/
    analyzers/
    graph/
    evidence/
    reports/
    persistence/
    audit/

apps/worker/src/                    # Node.js downstream workers
  workers/
    technical-profile.worker.ts
    ai-usage-flow.worker.ts
    reconciliation.worker.ts
    legal-ingestion.worker.ts
    embedding-index.worker.ts
    legal-matching.worker.ts
    classification.worker.ts
    gap-analysis.worker.ts
    document.worker.ts
```

There is no active Node.js scanner lifecycle worker. The standalone Python Worker is the sole consumer of the scan command.

## Worker Ownership

| Worker | Runtime | Consumes | Produces | Reads | Writes |
|---|---|---|---|---|---|
| Python Scanner Worker | Python | `command.scan.requested.v1` | `event.scan.completed.v1`, `event.scan.failed.v1` | scan job and snapshot | scanner evidence, audit, outbox |
| Technical Profile Worker | Node/TS | `command.technical-profile.requested.v1` | technical-profile completed/failed events | accepted report and findings | TechnicalProfile, audit, outbox |
| AI Usage Flow Worker | Node/TS | `command.ai-usage-flow.requested.v1` | AIUsageFlow completed/failed events | WizardProfile, TechnicalProfile, findings | flow, claims, audit, outbox |
| Reconciliation Worker | Node/TS | `command.reconciliation.requested.v1` | verified-profile-ready or conflict-detected event | WizardProfile, TechnicalProfile, AIUsageFlow | conflict or VerifiedProfile, audit, outbox |
| Legal Ingestion Worker | Node/TS | `command.legal-source.ingest.requested.v1` | `event.legal-source.ingest.completed.v1`, `event.legal-source.ingest.failed.v1` | validated source request | legal source/document/items, audit, outbox |
| Embedding Index Worker | Node/TS | `command.embedding-build.requested.v1` | `event.embedding-build.completed.v1`, `event.embedding-build.failed.v1` | approved corpus chunks | FTS/vector data, model metadata, audit, outbox |
| Legal Matching Worker | Node/TS | `command.legal-matching.requested.v1` | legal-matching completed/failed events | VerifiedProfile and approved index | LegalRuleMatch, retrieval audit, audit, outbox |
| Classification Worker | Node/TS | `command.classification.requested.v1` | classification completed/blocked events | VerifiedProfile and legal matches | RiskClassification, model metadata, audit, outbox |
| Gap Analysis Worker | Node/TS | `command.gap-analysis.requested.v1` | gap-analysis completed/blocked/failed events | classification and legal matches | GapAnalysis, audit, outbox |
| Document Worker | Node/TS | `command.document.requested.v1` | document generated/blocked events | classification, gaps, citations | GeneratedDocument, model metadata, audit, outbox |

## Canonical Legal Operations Chain

```text
command.legal-source.ingest.requested.v1
-> event.legal-source.ingest.completed.v1
-> internal review and approval
-> command.embedding-build.requested.v1
-> event.embedding-build.completed.v1
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