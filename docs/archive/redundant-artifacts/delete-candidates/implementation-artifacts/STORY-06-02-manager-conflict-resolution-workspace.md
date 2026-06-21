# Story STORY-06-02 — Manager Conflict Resolution Workspace

## Metadata
- Epic ID: EPIC-06
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-06-01
- Intended implementation order: 17
- Prototype-only classification: Controlled MVP prototype Manager resolution story

## User Story
As a Manager, I want to resolve conflicts with evidence context so I remain the final MVP resolver.

## Business Value
Preserves Manager-owned MVP path.

## Authorization and Scope Boundary
Prototype conflict resolution only. Manager resolution cannot erase scanner facts.

## In Scope
- Manager review of WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs.
- Manager confirm/update/request rescan/correction actions.
- Separate conflict resolution records.

## Out of Scope
- Developer final resolver.
- Silent scanner evidence overwrite.
- Raw source exposure.

## Dependencies
- STORY-06-01.

## Architecture and Module References
- `docs/specs/reconciliation-policy.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/security/threat-model.md`

## Domain, Data, Event, and API Contract References
- Entities: ConflictRecord, ConflictResolution, AuditEvent.
- Events: CONFLICT_RESOLVED, MANAGER_CONFLICT_RESOLUTION_REQUIRED.

## Acceptance Criteria
1. Manager can review WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs.
2. Manager can confirm, update declaration or request rescan/correction.
3. Manager cannot silently delete or overwrite scanner evidence.
4. Developer absence never blocks conflict completion.

## Technical Implementation Notes
- Store Manager resolution separately from original scanner facts.
- Preserve original evidence references.

## Security and Privacy Constraints
- No raw source/secret in conflict record.

## Auditability and Observability Expectations
- Audit actor, action, previous refs, new refs and resolution rationale.

## Error Handling and Failure-Safe Behavior
- Unresolved conflict keeps classification locked.
- Invalid resolution fails closed.

## Test Expectations
- Unit tests: resolution state rules.
- Integration tests: scanner evidence immutable.
- Manual verification: Manager can resolve without Developer.
- Explicit non-testable conditions: final A3 governance outcome pending.

## Validation and Risk-Acceptance Limitations
A3 may tighten abuse controls.

## Explicit Non-Claims
No production governance certification, compliance certification or classification unlock without resolved conflict.

## Definition of Done
Manager can resolve conflicts audibly while scanner evidence remains immutable.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-06-02-manager-conflict-resolution-workspace.md`
