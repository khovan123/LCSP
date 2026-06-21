# Story STORY-04-01 — Scan Job Lifecycle and Idempotency

## Metadata
- Epic ID: EPIC-04
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-03-02
- Intended implementation order: 9
- Prototype-only classification: Controlled MVP prototype async scan orchestration story

## User Story
As a Manager, I want scan requests to run asynchronously so the API remains responsive and scan progress is trackable.

## Business Value
Enables repository evidence workflow without blocking user requests.

## Authorization and Scope Boundary
Prototype scan orchestration only. It does not implement parser accuracy, A2-b2 or production scanner claims.

## In Scope
- RepositoryScanJob lifecycle.
- Queue job envelope by refs.
- Idempotency and duplicate scan handling.
- Scan status reporting.

## Out of Scope
- Inline scan execution in API.
- Parser/scanner implementation.
- Production queue topology.

## Dependencies
- STORY-03-02.

## Architecture and Module References
- `docs/implementation/queue-jobs-retry-idempotency.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/specs/static-analysis-scanner-contract.md`

## Domain, Data, Event, and API Contract References
- Entity: RepositoryScanJob.
- Events: REPOSITORY_SCAN_REQUESTED, STARTED, COMPLETED, FAILED.
- Queue payload uses assessment/repository/commit/scanner/ruleset refs.

## Acceptance Criteria
1. API creates `RepositoryScanJob` only for valid Manager-owned repository snapshot.
2. Queue envelope includes assessment, repository, commit, scanner version and ruleset version refs.
3. Duplicate scan requests use idempotency rules.
4. Progress states expose requested, started, completed, failed and blocked.

## Technical Implementation Notes
- API enqueues; Worker consumes.
- Job payloads must not contain raw source.

## Security and Privacy Constraints
- Queue messages use refs/hashes only.
- Manager authorization required.

## Auditability and Observability Expectations
- Audit scan requested/started/completed/failed.
- Correlate job_id, assessment_id, repository_id and commit_sha.

## Error Handling and Failure-Safe Behavior
- Queue failure records safe blocked state.
- Duplicate job returns existing status or idempotent response.

## Test Expectations
- Unit tests: idempotency key behavior.
- Integration tests: API creates queue job, does not run scan inline.
- Manual verification: progress states.
- Explicit non-testable conditions: production queue scaling deferred.

## Validation and Risk-Acceptance Limitations
Async orchestration does not prove runtime scanner accuracy.

## Explicit Non-Claims
No A2-b2 completion, production scanner benchmark, production deployment or formal legal validation.

## Definition of Done
Scan request lifecycle is async, idempotent, auditable and source-safe.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-04-01-scan-job-lifecycle-and-idempotency.md`
