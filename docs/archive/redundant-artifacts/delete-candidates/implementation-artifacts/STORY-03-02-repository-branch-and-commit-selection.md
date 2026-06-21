# Story STORY-03-02 — Repository, Branch, and Commit Selection

## Metadata
- Epic ID: EPIC-03
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-03-01
- Intended implementation order: 8
- Prototype-only classification: Controlled MVP prototype repository provenance story

## User Story
As a Manager, I want to choose repository, branch and commit so scan evidence is reproducible.

## Business Value
Creates traceable evidence provenance.

## Authorization and Scope Boundary
Prototype metadata/provenance only; no source scanning or raw source persistence in this story.

## In Scope
- Repository, branch/ref and commit selection.
- Repository snapshot metadata.
- Authorization check against connected GitHub App installation.

## Out of Scope
- Multi-provider repository support.
- Repository scan execution.
- Raw source storage.

## Dependencies
- STORY-03-01.

## Architecture and Module References
- `docs/specs/evidence-report-contract.md`
- `docs/implementation/github-app-repository-scan-implementation.md`
- `docs/security/source-code-privacy-policy.md`

## Domain, Data, Event, and API Contract References
- Entity: RepositorySnapshot.
- Fields: repository_id, branch/ref, commit_sha, connection_ref.
- Audit event: repository snapshot selected/changed.

## Acceptance Criteria
1. Manager can select repository, branch and commit from authorized connection.
2. Selection persists `repository_id`, branch/ref and `commit_sha`.
3. Scan is blocked if commit cannot be resolved or is outside authorized scope.
4. Selected commit appears in future scan job and evidence report metadata.

## Technical Implementation Notes
- Persist metadata only.
- Keep selected commit immutable per scan request unless Manager creates a new snapshot.

## Security and Privacy Constraints
- No repository source contents in persistence.
- GitHub App token remains server-side.

## Auditability and Observability Expectations
- Audit repository snapshot selected/changed and resolution failures.

## Error Handling and Failure-Safe Behavior
- Missing/invalid commit blocks scan creation.
- Access revocation blocks selection/scan.

## Test Expectations
- Unit tests: snapshot validation.
- Integration tests: unauthorized commit/repo blocked.
- Manual verification: commit appears in scan metadata.
- Explicit non-testable conditions: scanner accuracy is out of scope.

## Validation and Risk-Acceptance Limitations
Provenance metadata supports later evidence traceability but does not validate scanner output.

## Explicit Non-Claims
No runtime scanner accuracy, A2-b2 completion, production deployment or compliance certification.

## Definition of Done
Repository snapshot metadata is traceable, authorized and ready for scan job creation.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-03-02-repository-branch-and-commit-selection.md`
