# Python Worker Implementation Specification

## Status

AUTHORITATIVE — A-to-Z Runnable MVP (Phase 5.2J)

New document per SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23). Standalone Python Worker process replaces the Node.js scanner worker for repository scan lifecycle management per ADR-023.

## Purpose

Defines the build specification and runtime guidelines for the standalone Python Worker process (`lcsp-scanner-worker`).

## Active References

- `docs/architecture/adr/adr-023-python-worker-scanner-runtime.md`
- `docs/specs/scanner-spec.md`
- `docs/specs/python-scanner-spec.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`

---

## Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Python 3.11+ | Execution environment |
| Dependency Manager | Poetry (`pyproject.toml`) | Dependency lock and virtual environment |
| Queue Client | `aio-pika` (async RabbitMQ client) | Queue command consumption and outbox publishing |
| AST Parser | `ast` (stdlib) + `libcst` | Python syntax analysis and CST traversal |
| Database Client | `prisma-client-py` (Prisma Python client) | PostgreSQL persistence sharing schema definition |
| Subprocess Runner | `asyncio.create_subprocess_exec` | Node.js subprocess invocation for TS/JS analysis |

---

## Process Boundary & Run Contract

The Python Worker runs as a standalone daemon process in the LCSP backend ecosystem.

### Execution Command
```bash
poetry run python -m lcsp_scanner_worker.main
```

### Process Lifecycle
1. **Initialize:** Load environment configuration; verify PostgreSQL and RabbitMQ connections.
2. **Listen:** Bind and consume from `lcsp.scan-worker.v1` queue.
3. **Execute Job:** For each `command.scan.requested.v1` payload:
   - Mark `RepositoryScanJob` status as `RUNNING`.
   - Setup a temporary restricted directory workspace.
   - Materialize the commit-pinned snapshot from GitHub.
   - Run Python static analysis (AST/CST parsers).
   - Spawn the TS/JS analyzer subprocess (Option A).
   - Combine results into a single `TechnicalEvidenceReport` metadata structure.
   - Persist findings to PostgreSQL as staged scan results.
   - Clean up the workspace and verify deletion.
   - Publish `event.scan.completed.v1` only after cleanup is verified, or publish `event.scan.failed.v1` when cleanup or any fatal stage fails.
4. **Shutdown:** Intercept SIGTERM/SIGINT, complete active jobs, verify workspace cleanup, and close connection pools.

---

## TS/JS Subprocess Analyzer Integration (Option A)

To support repository scans containing TS/JS code (e.g. multi-language AI repositories), the Python Worker spawns a lightweight Node.js CLI script:

- **Command Spawns:** `node dist/apps/scanner/ts-analyzer-cli.js --path <workspace_path>`
- **Output Protocol:** TS/JS analyzer writes findings array directly as a JSON string to `stdout`.
- **Parser Normalization:** Python worker captures `stdout`, validates the schema, and normalizes items into the `TechnicalFinding` database structure.

---

## Database Persistence & Outbox Integration

The Python Worker writes directly to PostgreSQL using `prisma-client-py` matching the shared NestJS API schema:

- **Tables Updated:** `RepositoryScanJob`, `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, `CodeGraphNode`, `CodeGraphEdge`.
- **Completion Ordering:** Scan results must be persisted before cleanup, but `RepositoryScanJob.status = COMPLETED` and `event.scan.completed.v1` must be written only after workspace cleanup is verified. Cleanup failure is a terminal scan failure even if analysis and report staging succeeded.
- **Success Outbox Write:** After cleanup verification, mark the job complete and publish the completed event within a single database transaction:
  ```python
  await cleanup_workspace(workspace_path)
  async with db.tx() as tx:
      await tx.repositoryscanjob.update(where={"id": job_id}, data={"status": "COMPLETED"})
      await tx.outboxevent.create(data={
          "id": uuid7(),
          "eventType": "event.scan.completed.v1",
          "payload": {
              "scanJobId": job_id,
              "technicalEvidenceReportId": report_id,
              "cleanupVerifiedAt": cleanup_verified_at
          }
      })
  ```
- **Cleanup Failure Outbox Write:** If cleanup cannot be verified, leave the staged report unavailable for downstream workflow, mark the job failed, write the security audit event, and publish `event.scan.failed.v1` with `SCANNER_WORKSPACE_CLEANUP_FAILED`.

---

## Ephemeral Workspace Lifecycle & Security

To prevent source code leakage (NFR-013) and protect prompt/secret privacy (NFR-012, NFR-015):

1. **Restricted Workspace:** Materialize repository snapshots strictly inside the configured workspace root `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}`.
2. **Name Isolation:** Folder path structured as `{scanJobId}-{repositorySnapshotId}-{shortCommitSha}`.
3. **Workspace Redaction:** Perform inline regex checks to strip API keys, password constants, and connection strings before compiling findings.
4. **Mandatory Cleanup:** Force recursion delete of the directory block immediately after report generation, regardless of job outcome (success or failure).
5. **Fail-Closed Block:** If cleanup fails, write `SCANNER_WORKSPACE_CLEANUP_FAILED` security audit event and block subsequent workflow stages.

---

## Failure & Retry States

| Failure Mode | Status Code | Retries | Worker Action |
|---|---|---|---|
| Git snapshot retrieve error | `REPOSITORY_ACCESS_FAILED` | 3 (exponential backoff) | Terminate job, write audit, publish failed event |
| File parsing syntax error | `SCANNER_PARSE_FAILED` | 0 (non-retryable) | Record coverage limitation, skip file, continue scan |
| Worker crash / network drop | `WORKER_SHUTDOWN` | 3 (re-queued) | Re-delivered by broker, resumes from start idempotently |
| Workspace directory delete error | `SCANNER_WORKSPACE_CLEANUP_FAILED` | 0 (fatal) | Block downstream workflow, log critical security audit |
