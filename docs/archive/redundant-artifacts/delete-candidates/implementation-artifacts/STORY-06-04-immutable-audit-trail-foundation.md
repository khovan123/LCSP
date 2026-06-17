# Story STORY-06-04 — Immutable Audit Trail Foundation

## Metadata
- Epic ID: EPIC-06
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-01-02
- Intended implementation order: 19
- Prototype-only classification: Controlled MVP prototype audit foundation story

## User Story
As an auditor, I want critical workflow transitions recorded so the prototype has traceability for evidence, conflicts and outputs.

## Business Value
Supports later validation and governance review.

## Authorization and Scope Boundary
Prototype audit persistence only. It is not production immutable log infrastructure.

## In Scope
- Append-oriented audit event model.
- Critical transition inventory.
- Safe audit metadata.
- Fail-closed behavior for critical audit write failure.

## Out of Scope
- Immutable production log infrastructure.
- Audit export certification.
- Raw source/prompt/secret logging.

## Dependencies
- STORY-01-02.

## Architecture and Module References
- `docs/implementation/audit-observability-implementation.md`
- `docs/security/threat-model.md`
- `docs/design/non-functional-requirements.md`

## Domain, Data, Event, and API Contract References
- Entity: AuditEvent.
- Events: all critical auth, repo, scan, evidence, AIUsageFlow, reconciliation, VerifiedProfile, legal, classification, document transitions.

## Acceptance Criteria
1. Audit events include actor, action, target, timestamp and safe metadata.
2. Critical transitions include auth, GitHub, scan, gates, AIUsageFlow, reconciliation, conflict, VerifiedProfile, legal retrieval, classification shell and document shell.
3. Audit records exclude raw source, full prompt, secrets and raw provider tokens.
4. Critical audit failure fails closed or records explicit recovery state.

## Technical Implementation Notes
- Append-oriented model.
- Correlation IDs should align API/worker events.

## Security and Privacy Constraints
- Redaction before audit write.
- No silent edit/delete of material events.

## Auditability and Observability Expectations
- This story defines shared audit expectations for all later stories.

## Error Handling and Failure-Safe Behavior
- Critical audit write failure blocks critical transition.

## Test Expectations
- Unit tests: audit event schema.
- Integration tests: critical transition emits event.
- Manual verification: no sensitive data in audit sample.
- Explicit non-testable conditions: production immutability certification deferred.

## Validation and Risk-Acceptance Limitations
A3 may tighten governance expectations.

## Explicit Non-Claims
No production audit certification, compliance certification or production deployment.

## Definition of Done
Prototype critical transitions can be audited safely and append-oriented.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-06-04-immutable-audit-trail-foundation.md`
