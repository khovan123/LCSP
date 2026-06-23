# LCSP Event Catalog

## Purpose

Canonical command and event names for the A-to-Z runnable MVP.

## Rules

- Commands use `command.<domain>.<action>.v1` on `lcsp.commands.v1`.
- Events use `event.<domain>.<fact>.v1` on `lcsp.events.v1`.
- Payloads contain IDs, versions, statuses, hashes, and metadata references only.
- Every message includes message ID, schema version, correlation ID, causation ID, aggregate reference, timestamp, and idempotency key.
- Exhausted messages route to the matching DLQ.

## Commands and Queues

| Command | Queue | Producer | Consumer |
|---|---|---|---|
| `command.scan.requested.v1` | `lcsp.scan-worker.v1` | Backend API outbox | Python Scanner Worker |
| `command.technical-profile.requested.v1` | `lcsp.technical-profile-worker.v1` | scan projection | Technical Profile Worker |
| `command.ai-usage-flow.requested.v1` | `lcsp.ai-usage-flow-worker.v1` | profile projection | AI Usage Flow Worker |
| `command.reconciliation.requested.v1` | `lcsp.reconciliation-worker.v1` | flow/resolution projection | Reconciliation Worker |
| `command.legal-source.ingest.requested.v1` | `lcsp.legal-source-ingest.v1` | Internal Legal Operations API | Legal Ingestion Worker |
| `command.embedding-build.requested.v1` | `lcsp.embedding-build.v1` | corpus approval outbox | Embedding Index Worker |
| `command.legal-matching.requested.v1` | `lcsp.legal-matching-worker.v1` | verified-profile projection | Legal Matching Worker |
| `command.classification.requested.v1` | `lcsp.classification-worker.v1` | legal-matching projection | Classification Worker |
| `command.gap-analysis.requested.v1` | `lcsp.gap-analysis-worker.v1` | classification projection | Gap Analysis Worker |
| `command.document.requested.v1` | `lcsp.document-worker.v1` | gap/document request projection | Document Worker |

## Completion and Failure Events

| Domain | Success/Fact Event | Failure/Blocked Event |
|---|---|---|
| Scan | `event.scan.completed.v1` | `event.scan.failed.v1` |
| Technical Profile | `event.technical-profile.completed.v1` | `event.technical-profile.failed.v1` |
| AI Usage Flow | `event.ai-usage-flow.completed.v1` | `event.ai-usage-flow.failed.v1` |
| Reconciliation | `event.reconciliation.verified-profile-ready.v1` | `event.reconciliation.conflict-detected.v1` |
| Legal Source | `event.legal-source.ingest.completed.v1` | `event.legal-source.ingest.failed.v1` |
| Embedding Index | `event.embedding-build.completed.v1` | `event.embedding-build.failed.v1` |
| Legal Matching | `event.legal-matching.completed.v1` | `event.legal-matching.failed.v1` |
| Classification | `event.classification.completed.v1` | `event.classification.blocked.v1` |
| Gap Analysis | `event.gap-analysis.completed.v1` | `event.gap-analysis.blocked.v1`, `event.gap-analysis.failed.v1` |
| Document | `event.document.generated.v1` | `event.document.blocked.v1` |

## Event Guards

| Event | Required Guard |
|---|---|
| `event.scan.completed.v1` | quality-valid report persisted, ScanJob completed, workspace cleanup verified |
| `event.reconciliation.verified-profile-ready.v1` | no unresolved material conflict |
| `event.legal-source.ingest.completed.v1` | source validated, snapshot/hash persisted, document staged in DRAFT corpus |
| `event.embedding-build.completed.v1` | corpus approved and FTS/vector metadata verified |
| `event.legal-matching.completed.v1` | LegalRuleMatch records and retrieval audit persisted |
| `event.classification.completed.v1` | VerifiedProfile and citation-backed legal basis exist |
| `event.gap-analysis.completed.v1` | valid classification and legal basis exist |
| `event.document.generated.v1` | gap/classification/citation/output guards pass and artifact metadata exists |

## Domain Events

- `ASSESSMENT_CREATED`
- `WIZARD_PROFILE_SAVED`
- `REPOSITORY_CONNECTED`
- `SNAPSHOT_CREATED`
- `SCAN_REQUESTED`
- `SCAN_STARTED`
- `TECHNICAL_PROFILE_CREATED`
- `AI_USAGE_FLOW_CREATED`
- `RECONCILIATION_CONFLICT_DETECTED`
- `RECONCILIATION_RESOLVED`
- `VERIFIED_PROFILE_CREATED`
- `STRUCTURED_ATTESTATION_SUBMITTED`
- `STRUCTURED_ATTESTATION_REJECTED`
- `LEGAL_SOURCE_VALIDATED`
- `LEGAL_SOURCE_INGESTED`
- `LEGAL_SOURCE_INGEST_FAILED`
- `LEGAL_CORPUS_APPROVED`
- `LEGAL_CORPUS_REJECTED`
- `LEGAL_CORPUS_SUPERSEDED`
- `EMBEDDING_INDEX_BUILT`
- `EMBEDDING_INDEX_FAILED`
- `LEGAL_MATCHING_COMPLETED`
- `CLASSIFICATION_COMPLETED`
- `CLASSIFICATION_BLOCKED`
- `GAP_ANALYSIS_COMPLETED`
- `GAP_ANALYSIS_BLOCKED`
- `DOCUMENT_GENERATED`
- `DOCUMENT_BLOCKED`
- `AUDIT_EXPORT_GENERATED`
- `SECURITY_EVENT`

Internal Legal Operator produces source-validation and corpus approval/rejection/supersession events through internal API/CLI. These are not Manager/Developer customer tasks.

## Orchestration

```text
event.scan.completed.v1
-> command.technical-profile.requested.v1
-> event.technical-profile.completed.v1
-> command.ai-usage-flow.requested.v1
-> event.ai-usage-flow.completed.v1
-> command.reconciliation.requested.v1
-> event.reconciliation.verified-profile-ready.v1
-> command.legal-matching.requested.v1
-> event.legal-matching.completed.v1
-> command.classification.requested.v1
-> event.classification.completed.v1
-> command.gap-analysis.requested.v1
-> event.gap-analysis.completed.v1
-> command.document.requested.v1
```

Internal legal preparation:

```text
command.legal-source.ingest.requested.v1
-> event.legal-source.ingest.completed.v1
-> internal approval
-> command.embedding-build.requested.v1
-> event.embedding-build.completed.v1
```

## Idempotency and Failure

- Duplicate delivery is a no-op or safe resume from persisted state.
- Retryable failures use bounded backoff and DLQ.
- Domain guard failures persist blocked/failed state without unnecessary retries.
- Completed artifacts are immutable and are not silently overwritten.

```text
CANONICAL_EVENT_NAMES_NORMALIZED
PYTHON_SCANNER_EVENT_OWNERSHIP_ALIGNED
INTERNAL_LEGAL_OPERATOR_EVENT_BOUNDARY_LOCKED
```