# LCSP MVP Implementation Decision Lockdown

## Archived Status

This document is archived after Phase 6.2A decision integration.

It is no longer an active source of truth. The controlled MVP implementation decisions from this document have been merged into:

- `docs/specs/scanner-spec.md`
- `docs/implementation/scanner-implementation.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`
- `docs/implementation/backend-implementation.md`
- `docs/implementation-readiness-certification.md`

Use the active documents above for implementation. This archive remains only as historical decision context.

## 1. Scanner Sandbox Decision

Decision:

```text
SCANNER_SANDBOX:
RESTRICTED_TEMPORARY_LOCAL_WORKSPACE
```

The controlled MVP scanner uses a restricted temporary workspace on the local filesystem. It does not use an isolated container sandbox in the controlled MVP.

| Item | Locked MVP Decision |
|---|---|
| Workspace root | `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}` under the local repository or configured local runtime root. |
| Workspace naming | `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}`. |
| Allowed contents | Temporary cloned or materialized repository files for the selected snapshot only. |
| Cleanup policy | Delete the workspace immediately after scan completion or terminal scan failure. |
| Cleanup verification | Write cleanup status to scan audit metadata and emit a redacted cleanup verification audit event. |
| Cleanup failure behavior | Mark scan as failed with `SCANNER_WORKSPACE_CLEANUP_FAILED`; do not continue downstream; alert as security-sensitive failure. |
| May be persisted | Paths, hashes, sizes, language/support metadata, evidence refs, graph node/edge metadata, findings, reports and redacted failure codes. |
| Must never be persisted | Raw source bodies, full AST bodies, secrets, raw prompts, provider tokens, repository credentials or full repository archives. |
| Audit event | `SECURITY_EVENT` for cleanup failure; `SCAN_COMPLETED` or `SCAN_FAILED` audit metadata includes cleanup result. |

Rationale: local restricted workspace is sufficient for controlled MVP coding and smoke verification. Container sandboxing remains a production-hardening option, not an MVP prerequisite.

## 2. Scanner Runtime Decision

Decision:

```text
SCANNER_RUNTIME:
TYPESCRIPT_FIRST_NODE_WORKER
```

Locked stack:

- Node.js / TypeScript worker.
- npm workspaces.
- Tree-sitter for syntax parsing.
- ts-morph for TypeScript/JavaScript semantic analysis.
- graphology for in-memory scanner graph.
- PostgreSQL for persisted metadata, refs, hashes and paths.
- No Python worker in the controlled MVP scanner implementation.
- No NetworkX in the controlled MVP scanner implementation.
- No runtime source-code execution.
- No scanner-initiated npm install, build, test, Docker, CI, API probing or package script execution.
- No raw TypeScript Compiler API direct implementation unless hidden behind ts-morph.

Historical Python worker and NetworkX references are architecture history only and are not active controlled MVP scanner guidance.

## 3. Graph Persistence Decision

Decision:

```text
GRAPH_PERSISTENCE:
METADATA_ONLY_POSTGRES_GRAPH_WITH_EMBEDDED_EVIDENCE_PATH
```

The controlled MVP persists graph metadata using the active Prisma models `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding` and `TechnicalEvidenceReport`. `ScannerEvidencePath` is not a separate Prisma table in the MVP. It is a structured JSON contract stored under `TechnicalFinding.metadata.evidencePath`.

### CodeGraphNode

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | UUIDv7 | Yes | Node identity. |
| `scanJobId` | UUIDv7 | Yes | Relation owner: `RepositoryScanJob`. |
| `nodeType` | string | Yes | File, function, class, import, call, provider, model, decision point or output-use node type. |
| `filePath` | string | No | Relative path only. |
| `symbolRef` | string | No | Symbol/function/class reference. |
| `lineStart`, `lineEnd` | int | No | Location metadata only. |
| `evidenceHash` | string | Yes | Hash of normalized metadata, not source. |
| `metadata` | Json | No | Redacted metadata only. |
| `confidence` | float | Yes | 0..1. |

Indexes: `(scanJobId, nodeType)`, `(scanJobId, symbolRef)`.

Retention/privacy: retain with scan evidence metadata for 12 months in controlled MVP; no raw source or full AST.

### CodeGraphEdge

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | UUIDv7 | Yes | Edge identity. |
| `scanJobId` | UUIDv7 | Yes | Relation owner: `RepositoryScanJob`. |
| `sourceNodeId` | UUIDv7 | Yes | Source `CodeGraphNode`. |
| `targetNodeId` | UUIDv7 | Yes | Target `CodeGraphNode`. |
| `edgeType` | string | Yes | `IMPORTS`, `CALLS`, `RETURNS`, `FEEDS`, `WRAPS`, `CONTAINS`, `CONDITIONS`, `UPDATES_STATE`. |
| `evidenceHash` | string | Yes | Hash of normalized metadata. |
| `metadata` | Json | No | Redacted edge metadata only. |
| `confidence` | float | Yes | 0..1. |

Indexes: `(scanJobId, edgeType)`, `sourceNodeId`, `targetNodeId`.

Retention/privacy: retain with scan evidence metadata for 12 months in controlled MVP; no raw source or full AST.

### ScannerEvidencePath

Physical shape:

```text
TechnicalFinding.metadata.evidencePath
```

Canonical JSON fields:

| Field | Type | Required | Rule |
|---|---|---:|---|
| `pathType` | string | Yes | Example: `MODEL_INVOCATION_TO_DECISION_FLOW`. |
| `nodeIds` | UUIDv7[] | Yes | Ordered graph node refs. |
| `edgeIds` | UUIDv7[] | Yes | Ordered graph edge refs. |
| `evidenceRefIds` | UUIDv7[] | Yes | Evidence refs used by the path. |
| `confidence` | number | Yes | Path confidence. |
| `coverageLimitations` | string[] | No | Limitations affecting path certainty. |

Indexes: none in MVP beyond `TechnicalFinding` indexes. Query paths through `reportId`, `findingType` and evidence refs.

Retention/privacy: retain with `TechnicalFinding`; metadata only.

### EvidenceReference

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | UUIDv7 | Yes | Evidence reference identity. |
| `assessmentId` | UUIDv7 | Yes | Tenant/assessment scope. |
| `scanJobId` | UUIDv7 | No | Scanner-produced refs should include it. |
| `sourceFileId` | UUIDv7 | No | Refers to `SourceFile` when file-scoped. |
| `sourceType` | enum | Yes | `STATIC_SCAN`, `WIZARD_DECLARATION`, `MANAGER_RESOLUTION`, `LEGAL_CORPUS`, `SYSTEM_DERIVED`. |
| `filePath` | string | No | Relative path only. |
| `symbolRef` | string | No | Redacted symbol reference. |
| `lineStart`, `lineEnd` | int | No | Location metadata only. |
| `evidenceHash` | string | Yes | Unique hash of normalized metadata. |
| `redactionStatus` | string | Yes | `NO_SOURCE_STORED` or `REDACTED_METADATA_ONLY`. |
| `metadata` | Json | No | Redacted metadata only. |

Indexes/constraints: unique `evidenceHash`, index `(assessmentId, sourceType)`.

Retention/privacy: retain 12 months for MVP evidence traceability; no raw source, prompt or secret.

### TechnicalFinding Metadata

| Field | Type | Required | Rule |
|---|---|---:|---|
| `id` | UUIDv7 | Yes | Finding identity. |
| `reportId` | UUIDv7 | Yes | Relation owner: `TechnicalEvidenceReport`. |
| `evidenceRefId` | UUIDv7 | Yes | Primary evidence ref. |
| `findingType` | enum | Yes | Canonical `FindingType`. |
| `confidence` | float | Yes | 0..1. |
| `severity` | string | Yes | Scanner severity label. |
| `metadata` | Json | Yes | Redacted details, including optional `evidencePath`. |

Indexes: `(reportId, findingType)`, `evidenceRefId`.

Retention/privacy: retain 12 months with TechnicalEvidenceReport; immutable and metadata-only.

## 4. Scanner Parser Foundation Decision

Decision:

```text
SCANNER_PARSER_FOUNDATION:
PHASE_5_5A_CONTRACTS_LOCKED_FOR_MVP
```

### Adapter Keys

| Adapter Key | Runtime |
|---|---|
| `typescript` | Tree-sitter TypeScript/TSX parser adapter. |
| `javascript` | Tree-sitter JavaScript/JSX/MJS/CJS parser adapter. |
| `python` | Tree-sitter Python syntax-only adapter. |
| `unsupported` | Non-throwing unsupported adapter. |

### Language Mapping

| Extension / Condition | Language | Support Level | Adapter Key |
|---|---|---|---|
| `.ts`, `.tsx` | `TYPESCRIPT` | `FULL_STATIC` | `typescript` |
| `.js`, `.jsx`, `.mjs`, `.cjs` | `JAVASCRIPT` | `FULL_STATIC` | `javascript` |
| `.py` | `PYTHON` | `SYNTAX_ONLY` | `python` |
| `.java`, `.kt`, `.go`, `.cs`, `.rs` | matching language | `BASIC_SIGNAL_ONLY` | `unsupported` |
| binary, minified, generated, oversized, unknown | `UNKNOWN` | `UNSUPPORTED` | `unsupported` |

Ignored directories: `node_modules`, `dist`, `build`, `coverage`, `.git`, `.next`, `out`, `vendor`, `generated`.

Thresholds:

- Max source file size: 1 MB.
- Minified: average line length greater than 500 or single-line file greater than 50 KB.
- Generated: path contains `generated`, `auto-generated`, `.gen.`, or first lines contain generated marker.

### Unsupported Behavior

- Unsupported adapter never throws for unsupported language.
- Returns `treeAvailable: false`.
- Adds `UNSUPPORTED_LANGUAGE` issue with severity `INFO`.
- Adds `UNSUPPORTED_LANGUAGE` coverage limitation.
- TreeSitterAstExtractor returns empty fact arrays with propagated issues/limitations.

### Parse Failure Behavior

- Adapter returns `SCANNER_PARSE_FAILED` issue with severity `ERROR`.
- Adds `PARSE_FAILURE` coverage limitation.
- Scanner may continue with other files.
- If report quality cannot pass because parse failures affect critical coverage, TechnicalEvidenceReport becomes insufficient/failed according to evidence gate.

### Generated/Minified/Oversized Behavior

- LanguageMapper marks generated/minified/oversized as `UNSUPPORTED` with adapter key `unsupported`.
- Add severity `WARN` issue: `SCANNER_GENERATED_FILE_SKIPPED`, `SCANNER_MINIFIED_FILE_SKIPPED` or `SCANNER_FILE_TOO_LARGE`.
- Add matching coverage limitation.
- Do not read or persist full body beyond supplied content sample.

## 5. Queue Retry and DLQ Decision

Decision:

```text
QUEUE_RETRY_POLICY:
BOUNDED_EXPONENTIAL_BACKOFF_WITH_JITTER
```

Retry schedule uses seconds after failure: `30s`, `120s`, `600s`, then DLQ when max attempts are exhausted. Add jitter of plus/minus 20 percent. Non-retryable domain guard failures do not consume retry budget; they persist a blocked/failed domain state and publish the corresponding failure/blocked event when applicable.

| Worker | Queue | DLQ | Max Attempts | Backoff | Terminal Failure Behavior |
|---|---|---|---:|---|---|
| Scan worker | `lcsp.scan-worker.v1` | `lcsp.scan-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Persist `event.scan.failed.v1`, mark ScanJob `FAILED`, audit redacted failure. |
| TechnicalProfile worker | `lcsp.technical-profile-worker.v1` | `lcsp.technical-profile-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Publish `event.technical-profile.failed.v1`, block downstream, audit. |
| AIUsageFlow worker | `lcsp.ai-usage-flow-worker.v1` | `lcsp.ai-usage-flow-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Publish `event.ai-usage-flow.failed.v1`, block reconciliation, audit. |
| Reconciliation worker | `lcsp.reconciliation-worker.v1` | `lcsp.reconciliation-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Persist conflict/blocked state when possible; otherwise audit worker failure. |
| LegalMatching worker | `lcsp.legal-matching-worker.v1` | `lcsp.legal-matching-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Publish `event.legal-matching.failed.v1`, block/degrade classification, audit. |
| Classification worker | `lcsp.classification-worker.v1` | `lcsp.classification-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Publish `event.classification.blocked.v1` or failed audit record depending on failure type. |
| Document worker | `lcsp.document-worker.v1` | `lcsp.document-worker.dlq.v1` | 3 | 30s, 120s, 600s + jitter | Publish `event.document.blocked.v1` or failed audit record depending on failure type. |

DLQ routing uses `lcsp.deadletter.v1` and the matching DLQ queue. Payloads remain reference-only.

## 6. Retention Decision

Decision:

```text
MVP_RETENTION_POLICY:
NO_RAW_SOURCE_LONG_TERM_PERSISTENCE
```

| Artifact | MVP Retention | Rule |
|---|---:|---|
| Raw temporary scanner workspace | Delete immediately after scan completion/failure; maximum 24 hours only for crashed-process cleanup recovery. | No raw source long-term persistence. |
| SourceFile metadata | 12 months | Path/hash/size/language/support metadata only. |
| EvidenceReference | 12 months | Metadata/hash/path/symbol refs only. |
| TechnicalFinding | 12 months | Metadata only; immutable. |
| TechnicalEvidenceReport | 12 months | Report metadata/findings/coverage only. |
| CodeGraphNode/CodeGraphEdge | 12 months | Metadata-only graph. |
| ScannerEvidencePath embedded metadata | 12 months | Stored inside TechnicalFinding metadata only. |
| AuditEvent | 12 months minimum for controlled MVP. | Redacted context only; no raw source/secrets/full prompts. |
| GeneratedDocument metadata | 12 months | Metadata/hash/storage ref only. |
| Generated artifact | 12 months or until manual deletion in local MVP. | Artifact body may contain generated report content; no production compliance claim. |
| OutboxEvent | 30 days after `PUBLISHED`; 90 days for `FAILED`. | Payload reference-only. |

## 7. Local Development Decision

Decision:

```text
LOCAL_DEV_COMMAND_CONTRACT:
NPM_WORKSPACE_COMMANDS
```

Run order and expected outputs:

| Command | Expected Output |
|---|---|
| `npm install` | npm workspace dependencies installed from lockfile. |
| `npm run db:generate` | Prisma client generated successfully. |
| `npm run db:migrate` | Local PostgreSQL schema migrated. |
| `npm run dev:api` | API starts and reports ready state without logging secrets. |
| `npm run dev:worker` | Worker starts, initializes queue bindings and logs `worker.ready`. |
| `npm run dev:web` | Web app starts and can reach API health endpoint. |
| `npm run test` | Unit and contract test suite passes. |
| `npm run test:scanner` | Scanner parser/language/extractor tests pass. |
| `npm run smoke:scan-fixture` | Synthetic scan fixture creates ScanJob, OutboxEvent, TechnicalEvidenceReport or explicit blocked reason. |

Smoke scan expected behavior:

1. Seed organization, Manager, assessment, WizardProfile and RepositorySnapshot.
2. Send `POST /api/v1/assessments/:assessmentId/scans`.
3. Confirm `RepositoryScanJob` status `REQUESTED`.
4. Confirm `OutboxEvent.routingKey = command.scan.requested.v1`.
5. Run worker.
6. Confirm `TechnicalEvidenceReport` is created or scan failed with redacted reason.
7. Confirm `event.scan.completed.v1` or `event.scan.failed.v1` outbox event.
8. Confirm TechnicalProfile and AIUsageFlow commands are enqueued or blocked with explicit reason.

## 8. OAuth/OIDC Provider Decision for MVP

Decision:

```text
AUTH_PROVIDER_MVP:
LOCAL_MOCK_OIDC_WITH_PROVIDER_AGNOSTIC_INTERFACE
```

The controlled MVP uses a local mock OIDC provider by default. Production provider selection is not required for MVP coding.

Required provider interface inputs:

- `OIDC_ISSUER_URL`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET_REF`
- `OIDC_CALLBACK_URL`
- `OIDC_MOCK_ENABLED`
- `SESSION_SECRET_REF`

MVP behavior:

- Mock provider issues local development identity claims only.
- Backend validates state, nonce, issuer, audience and callback shape even in mock mode.
- Provider tokens are never logged or exposed to the frontend.
- Real provider configuration remains an environment integration task.
- No production authentication claim is made from mock mode.

## 9. LLM Provider Decision for MVP

Decision:

```text
LLM_PROVIDER_MVP:
DETERMINISTIC_MOCK_LLM_GATEWAY_BY_DEFAULT
```

Model-backed calls are disabled by default. The MVP implements a provider adapter interface and deterministic mock responses for local workflow development.

Required configuration:

- `LLM_MODE=mock|provider`
- `LLM_PROVIDER_NAME`
- `LLM_MODEL_NAME`
- `LLM_API_KEY_REF`
- `LLM_TIMEOUT_MS`
- `LLM_MAX_OUTPUT_TOKENS`

MVP behavior:

- `mock` mode is default.
- Mock outputs are deterministic and schema-validated.
- Mock outputs cannot be used to claim legal advice, compliance certification or formal legal reliability.
- Provider mode requires explicit environment configuration and remains non-production until separately approved.
- Legal/classification/document outputs still require citation traceability and guardrails.

## 10. Legal Corpus Seed Decision

Decision:

```text
LEGAL_CORPUS_MVP:
LOCAL_JSONL_SEED_WITH_CITATION_REQUIRED_FIELDS
```

Minimum local seed format:

```json
{
  "corpusVersion": "LCSP-MVP-LOCAL-CORPUS-v0.1.0",
  "ruleId": "rule-local-001",
  "documentTitle": "Local MVP citation fixture",
  "issuer": "LOCAL_FIXTURE",
  "documentIdentifier": "LOCAL-001",
  "publicationDate": "2026-01-01",
  "effectiveDate": "2026-01-01",
  "retrievalDate": "2026-06-21",
  "citationTextHash": "sha256-normalized-citation-text",
  "sectionRef": "fixture-section-1",
  "ruleText": "Redacted local fixture rule text",
  "applicabilityFacts": ["AUTOMATED_DECISION", "FINANCIAL_CONTEXT"]
}
```

Required citation fields:

- `corpusVersion`
- `ruleId`
- `documentTitle`
- `issuer`
- `documentIdentifier`
- `retrievalDate`
- `citationTextHash`
- `sectionRef`
- `ruleText`
- `applicabilityFacts`

Missing corpus behavior:

- Legal matching emits `event.legal-matching.failed.v1` with `LEGAL_CORPUS_MISSING`.
- Classification remains blocked or degraded.
- Document generation must not produce final legal output without citation traceability.

## 11. Object Storage Decision

Decision:

```text
OBJECT_STORAGE_MVP:
LOCAL_FILESYSTEM_ARTIFACT_STORE_WITH_S3_COMPATIBLE_ADAPTER_BOUNDARY
```

The controlled MVP stores generated artifacts in a local filesystem artifact store by default and exposes an adapter boundary compatible with S3-style object storage later.

| Item | Locked MVP Decision |
|---|---|
| Local root | `${LCSP_ARTIFACT_STORE_ROOT:-.lcsp/artifacts}` |
| Artifact metadata | `documentId`, `assessmentId`, `classificationResultId`, `artifactType`, `storageRef`, `documentHash`, `mimeType`, `sizeBytes`, `createdAt`, `retentionUntil`. |
| Hash rule | SHA-256 over final generated artifact bytes. |
| Retention | 12 months or manual deletion in local MVP. |
| Failure behavior | Document worker retries transient write failure, then publishes `event.document.blocked.v1` or failed audit metadata. |
| Production limitation | Local filesystem store is not production storage and does not authorize customer deployment. |

## 12. MVP Non-Claims

The controlled MVP explicitly does not claim:

- production readiness;
- compliance certification;
- legal advice;
- formal legal validation;
- A2-b2 runtime scanner accuracy acceptance;
- customer deployment authorization;
- independent legal reliability validation;
- production authentication assurance from mock OIDC;
- production object-storage durability from local filesystem storage;
- production LLM/legal conclusion reliability from mock LLM responses.

## Final Lockdown Decision

MVP_IMPLEMENTATION_DECISIONS_LOCKED

NO_MORE_MVP_DECISION_DOCS_REQUIRED

ENGINEERING_EXECUTION_CAN_PROCEED

NEXT_ALLOWED_ACTIVITY:

bmad-agent-dev for TASK-001
