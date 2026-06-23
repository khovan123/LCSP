# Worker Code Map

## Purpose

Define asynchronous worker ownership for the A-to-Z runnable MVP before creating files.

## Runtime Layout

```text
lcsp-scanner-worker/                 # Python runtime; sole scan consumer
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

apps/worker/src/                    # Node.js/TypeScript downstream workers
  main.ts
  messaging/
    consumer-registry.ts
    retry-policy.ts
    message-envelope.ts
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

There is no active `apps/worker/src/workers/scanner.worker.ts`. Repository Scan lifecycle belongs to the standalone Python Worker.

## Worker Ownership

| Worker | Runtime | Consumes | Produces | Reads | Writes |
|---|---|---|---|---|---|
| Python Scanner Worker | Python | `command.scan.requested.v1` | `event.scan.completed.v1` or `event.scan.failed.v1` | `RepositoryScanJob`, `RepositorySnapshot` | `SourceFile`, `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding`, `TechnicalEvidenceReport`, `AuditEvent`, `OutboxEvent` |
| Technical Profile Worker | Node/TS | `command.technical-profile.requested.v1` | completed/failed technical-profile event | accepted report/findings | `TechnicalProfile`, audit/outbox |
| AI Usage Flow Worker | Node/TS | `command.ai-usage-flow.requested.v1` | completed/failed AIUsageFlow event | WizardProfile, TechnicalProfile, findings | `AIUsageFlow`, claims, evidence links, audit/outbox |
| Reconciliation Worker | Node/TS | `command.reconciliation.requested.v1` | verified-profile-ready or conflict-detected event | WizardProfile, TechnicalProfile, AIUsageFlow | `ReconciliationConflict` or `VerifiedProfile`, audit/outbox |
| Legal Ingestion Worker | Node/TS | `command.legal-source.ingest-requested.v1` | ingestion completed/failed event | approved source request | `LegalSource`, `LegalDocument`, `LegalCorpusItem`, audit/outbox |
| Embedding Index Worker | Node/TS | `command.legal-corpus.index-requested.v1` | index completed/failed event | approved corpus chunks | `LegalDocumentChunk.embedding`, `ModelRunMetadata`, audit/outbox |
| Legal Matching Worker | Node/TS | `command.legal-matching.requested.v1` | completed/failed legal-matching event | VerifiedProfile, approved corpus/index | `LegalRuleMatch`, `RetrievalAuditLog`, audit/outbox |
| Classification Worker | Node/TS | `command.classification.requested.v1` | completed/blocked event | VerifiedProfile, LegalRuleMatch[] | `RiskClassification`, `ModelRunMetadata`, audit/outbox |
| Gap Analysis Worker | Node/TS | `command.gap-analysis.requested.v1` | completed/blocked/failed event | RiskClassification, LegalRuleMatch[] | `GapAnalysis`, audit/outbox |
| Document Worker | Node/TS | `command.document.requested.v1` | generated/blocked event | classification, gap analysis, citations | `GeneratedDocument`, `ModelRunMetadata`, audit/outbox |

## Choreography

```text
scan completed
-> technical profile
-> AI usage flow
-> reconciliation
-> legal matching
-> classification
-> gap analysis
-> document generation
```

Internal legal operations use a separate precondition chain:

```text
legal source ingest
-> internal review/approval
-> immutable corpus version
-> embedding/FTS index build
-> corpus available to legal matching
```

## Worker Rules

- Every worker is idempotent by canonical idempotency key.
- State-changing writes and `OutboxEvent` creation occur in one database transaction.
- Workers consume commands only; projection/orchestrator handlers consume events and stage the next command.
- Reference-only queue payloads are mandatory; no raw source, full prompt, secret, document bytes, or full AST body enters RabbitMQ.
- Python Scanner Worker publishes scan success only after report gates and workspace cleanup verification.
- Legal matching uses only approved immutable corpus versions.
- External model calls go through LLM Gateway.
- Internal Legal Operator approval is an internal API/CLI operation for MVP, not a customer-facing worker/UI flow.