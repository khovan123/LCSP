# Story STORY-09-03 — Workspace Cleanup and Retention Boundary

## Metadata
- Epic ID: EPIC-09
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-04-01
- Intended implementation order: 29
- Prototype-only classification: Controlled MVP prototype source retention story

## User Story
As a security reviewer, I want temporary source workspaces cleaned and retention boundaries enforced so raw source is not retained.

## Business Value
Protects source privacy.

## Authorization and Scope Boundary
Prototype workspace lifecycle only. Does not certify production sandboxing.

## In Scope
- Temporary workspace lifecycle.
- Cleanup after scan completion/failure.
- Cleanup failure audit/security event.
- Persistent metadata-only rule.

## Out of Scope
- Production sandbox certification.
- Runtime scanner accuracy.
- Customer source retention.

## Dependencies
- STORY-04-01.

## Architecture and Module References
- `docs/security/source-code-privacy-policy.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/implementation/github-app-repository-scan-implementation.md`

## Domain, Data, Event, and API Contract References
- Events: workspace created, cleanup succeeded, cleanup failed.
- Stored refs: metadata, hashes, graph refs and findings only.

## Acceptance Criteria
1. Scanner workspace is temporary and linked to scan job.
2. Cleanup occurs after scan completion/failure.
3. Cleanup failure creates audit/security event and blocks downstream acceptance if privacy risk remains.
4. Persistent stores contain metadata, hashes, graph refs and findings only.

## Technical Implementation Notes
- For synthetic-fixture prototype, workspace behavior can be represented as controlled lifecycle state.

## Security and Privacy Constraints
- No long-term raw source storage.

## Auditability and Observability Expectations
- Audit workspace created and cleanup success/failure.

## Error Handling and Failure-Safe Behavior
- Cleanup failure is critical and fails closed if source may remain exposed.

## Test Expectations
- Unit tests: lifecycle state transitions.
- Integration tests: cleanup failure blocks downstream.
- Manual verification: no persistent raw source artifacts.
- Explicit non-testable conditions: production sandboxing deferred.

## Validation and Risk-Acceptance Limitations
Prototype cleanup proof may be simulated for synthetic fixtures only.

## Explicit Non-Claims
No production sandbox certification, runtime scanner accuracy, A2-b2 completion or production deployment.

## Definition of Done
Workspace lifecycle is temporary, auditable and metadata-only after cleanup.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-09-03-workspace-cleanup-and-retention-boundary.md`
