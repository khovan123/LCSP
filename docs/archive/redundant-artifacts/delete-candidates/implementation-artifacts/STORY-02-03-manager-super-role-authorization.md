# Story STORY-02-03 — Manager Super-role Authorization

## Metadata
- Epic ID: EPIC-02
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-02-01
- Intended implementation order: 6
- Prototype-only classification: Controlled MVP prototype authorization story

## User Story
As a Manager, I want all active MVP actions authorized to my role so I can complete the prototype flow without Developer assignment.

## Business Value
Preserves the canonical Manager-owned MVP path.

## Authorization and Scope Boundary
Prototype authorization only. Developer delegation remains optional/post-MVP and cannot reduce Manager authority.

## In Scope
- Manager permission checks for active MVP transitions.
- Server-side authorization for assessment ownership/scope.
- Optional future Developer grant placeholder boundaries.

## Out of Scope
- Developer final compliance authority.
- Enterprise IAM.
- Production RBAC certification.

## Dependencies
- STORY-02-01.

## Architecture and Module References
- `docs/specs/implementation-contract.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/auth-oauth-mfa-rbac-implementation.md`

## Domain, Data, Event, and API Contract References
- Entities: User, Organization, Assessment, PermissionGrant (Post-MVP), AuditEvent.
- Permission constants live in `packages/shared`.

## Acceptance Criteria
1. Manager can perform every active MVP transition without Developer assignment.
2. No MVP transition is blocked because Developer is absent.
3. Server-side authorization enforces Manager ownership/scope.
4. Developer grant model is optional/future and scoped/revocable/audited.

## Technical Implementation Notes
- Centralize permission checks in API boundary.
- UI gating is not sufficient; server must enforce.

## Security and Privacy Constraints
- Authorization fails closed.
- Developer cannot approve VerifiedProfile, finalize conflict or trigger final compliance document by default.

## Auditability and Observability Expectations
- Audit permission denial and critical Manager actions.

## Error Handling and Failure-Safe Behavior
- Missing/invalid permission blocks action with safe reason.
- Developer absence must not create workflow deadlock.

## Test Expectations
- Unit tests: permission matrix.
- Integration tests: Manager can reach all MVP actions; Developer cannot perform final Manager actions.
- Manual verification: Manager-only path.
- Explicit non-testable conditions: post-MVP delegation governance may evolve.

## Validation and Risk-Acceptance Limitations
A3 may tighten governance, but cannot make Developer required for MVP completion.

## Explicit Non-Claims
No production IAM certification, enterprise SSO, compliance certification or production deployment.

## Definition of Done
Manager super-role is enforceable server-side and Developer optionality remains intact.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-02-03-manager-super-role-authorization.md`
