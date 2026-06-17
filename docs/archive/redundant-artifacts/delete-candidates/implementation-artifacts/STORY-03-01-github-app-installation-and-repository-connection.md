# Story STORY-03-01 — GitHub App Installation and Repository Connection

## Metadata
- Epic ID: EPIC-03
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-02-03
- Intended implementation order: 7
- Prototype-only classification: Controlled MVP prototype repository authorization story

## User Story
As a Manager, I want to connect a GitHub repository through a GitHub App so LCSP can request read-only scan access.

## Business Value
Establishes the MVP technical evidence path.

## Authorization and Scope Boundary
Prototype GitHub App connection only. OAuth/OIDC login remains LCSP identity auth and does not grant repository access.

## In Scope
- GitHub App installation/connection boundary.
- Selected read-only repository scope.
- Repository connection metadata.
- Scan blocking when installation/access is invalid.

## Out of Scope
- GitHub OAuth as repository authorization.
- Local/CI/manual evidence upload.
- API probing.
- Production GitHub permission certification.

## Dependencies
- STORY-02-03.

## Architecture and Module References
- `docs/implementation/github-app-repository-scan-implementation.md`
- `docs/specs/implementation-contract.md`
- `docs/security/source-code-privacy-policy.md`

## Domain, Data, Event, and API Contract References
- Entity: GitHubRepositoryConnection.
- API group: GitHub Repository.
- Audit events: repository connected/disconnected/access denied.

## Acceptance Criteria
1. GitHub App connection is separate from OAuth/OIDC login.
2. Repository access is limited to selected read-only repository scope.
3. Invalid or missing installation blocks scan requests.
4. Connection metadata persists without raw repository source.

## Technical Implementation Notes
- API owns GitHub App integration boundary.
- Web never receives raw GitHub App token.

## Security and Privacy Constraints
- Least privilege selected repository access.
- No raw GitHub token in UI, logs or audit export.

## Auditability and Observability Expectations
- Audit connection, disconnection, access denied and scan authorization failure.

## Error Handling and Failure-Safe Behavior
- Missing installation blocks Repository Scan.
- Repository access mismatch fails closed.

## Test Expectations
- Unit tests: authorization boundary and metadata validation.
- Integration tests: OAuth login does not grant repo access.
- Manual verification: selected repo scope.
- Explicit non-testable conditions: production GitHub certification deferred.

## Validation and Risk-Acceptance Limitations
Repository scan remains the only active MVP technical evidence path; real validation remains incomplete.

## Explicit Non-Claims
No production deployment, customer onboarding, runtime scanner accuracy, formal legal validation or A2-b2 completion.

## Definition of Done
Manager can create a repository connection boundary without OAuth/GitHub confusion and without raw source persistence.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-03-01-github-app-installation-and-repository-connection.md`
