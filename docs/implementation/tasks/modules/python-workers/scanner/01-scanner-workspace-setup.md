---
task_id: MW-scan-py-001
module: python-workers/scanner
runtime: lcsp-python-workers
priority: P0
status: READY_FOR_DEV
epic_story: 3.4
depends_on:
  - python-workers/platform/01-worker-platform-bootstrap.md
---

# Scanner Workspace Setup and Materialization

## Outcome

Materialize a pinned `RepositorySnapshot` into a restricted temporary workspace directory for static analysis. Workspace is isolated, size-bounded, and cleaned up after scan regardless of success or failure. No raw source is persisted long-term.

## Module Files

| File | Action | Notes |
|---|---|---|
| `lcsp-python-workers/src/lcsp_workers/scanner/__init__.py` | Create | Package init |
| `lcsp-python-workers/src/lcsp_workers/scanner/workspace.py` | Create | Workspace lifecycle: create, materialize, cleanup |
| `lcsp-python-workers/src/lcsp_workers/scanner/github_fetcher.py` | Create | GitHub API file materialization (no git clone — archive download) |
| `lcsp-python-workers/src/lcsp_workers/scanner/scan_consumer.py` | Create | `ConsumerBase` subclass for `scan.triggered` events |

## Workspace Constraints

| Constraint | Value | Notes |
|---|---|---|
| Max total workspace size | 500 MB | Abort if exceeded |
| Max single file size | 10 MB | Skip file, log as coverage-limited |
| Workspace path | `/tmp/lcsp-scanner/<job_id>/` | Isolated per job |
| Cleanup policy | Always — on success, failure, or timeout | Verified after scan |

## Materialization Method

- Download repository archive (`.tar.gz`) from GitHub API using installation access token fetched per-request.
- Extract to workspace directory.
- Raw source is available only within the worker process for the duration of the scan — not sent externally, not persisted to DB.
- Installation access token: used only for download, discarded immediately after.

## Business Rules

1. Listen on RabbitMQ queue `scan.triggered`.
2. Fetch scan job details from NestJS API via GET `/internal/scan-jobs/:id`.
3. Materialize snapshot: download archive + extract. Log workspace ID, snapshot ID, size.
4. If total size > 500 MB: abort scan, report `status = partial`, mark coverage-limited.
5. Skip files > 10 MB individually — log as coverage-limited, continue.
6. Do NOT execute any code, install dependencies, run builds, docker commands, or probe endpoints.
7. After scan complete: verify cleanup of `/tmp/lcsp-scanner/<job_id>/`.
8. Log cleanup status (success or residual).
9. Raw source code must NOT be sent to NestJS API in scan callback — only metadata and findings.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Normal-sized repo | Workspace created, files extracted |
| T02 | File > 10 MB | File skipped, logged as coverage-limited |
| T03 | Total size > 500 MB | Scan aborted, `status = partial` |
| T04 | Cleanup after success | `/tmp/lcsp-scanner/<job_id>/` removed |
| T05 | Cleanup after failure | Directory still removed |
| T06 | Raw source not in callback payload | Callback inspection |
| T07 | Installation token discarded after download | No token in memory logs after materialization |

## Definition of Done

- Workspace size-bounded (500 MB total, 10 MB per file).
- Cleanup verified after every scan outcome.
- Raw source never sent to API or logged.
- Installation token discarded immediately after archive download.
