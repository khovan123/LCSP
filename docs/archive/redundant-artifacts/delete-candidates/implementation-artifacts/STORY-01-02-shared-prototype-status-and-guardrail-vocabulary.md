# Story STORY-01-02 — Shared Prototype Status and Guardrail Vocabulary

## Metadata
- Epic ID: EPIC-01
- Priority: P0
- Document status: DOCUMENTED
- Dependency status: BLOCKED_BY_DEPENDENCY until STORY-01-01 is implemented
- Intended implementation order: 2
- Prototype-only classification: Controlled MVP prototype guardrail story

## User Story
As a product owner, I want prototype status constants and blocked-state labels so users and developers do not confuse prototype output with validated compliance output.

## Business Value
Prevents false confidence while enabling controlled MVP prototype work under owner risk acceptance.

## Authorization and Scope Boundary
This story is documentation-ready only. It does not authorize implementation until separately selected. It remains inside controlled MVP prototype scope and does not change `IMPLEMENTATION_NOT_READY`.

## In Scope
- Shared prototype/readiness status vocabulary.
- Blocked-state labels for evidence, VerifiedProfile, citation and validation limitations.
- Developer-facing and future UI/API-safe wording for prototype boundaries.

## Out of Scope
- Production readiness flags.
- Validation pass/fail result recording.
- Risk-classification implementation.
- Production CI/CD, Docker or infrastructure.

## Dependencies
- STORY-01-01.

## Architecture and Module References
- `docs/specs/state-machine.md`
- `docs/implementation/repository-and-module-layout.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation-readiness.md`

## Domain, Data, Event, and API Contract References
- Shared vocabulary belongs in `packages/shared`.
- Configurable prototype labels belong in `packages/config`.
- Future API responses must expose safe reason codes, not raw evidence content.

## Acceptance Criteria
1. Vocabulary includes `IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE`, `CONTROLLED_MVP_PROTOTYPE_BACKLOG_AUTHORIZED`, and `CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE`.
2. Blocked labels distinguish missing evidence, insufficient evidence, unresolved conflict, missing citation, output guardrail failure and validation limitation.
3. Status labels never imply production readiness, compliance certification or validation completion.
4. Classification remains blocked before VerifiedProfile and citation traceability.

## Technical Implementation Notes
- Reuse canonical state names from `state-machine.md`.
- Keep labels deterministic and centrally defined.
- Avoid hardcoding provider/vendor choices.

## Security and Privacy Constraints
- Status text must not reveal raw source, full prompts, secrets or raw AST bodies.
- Manager-only conflict state must not imply Developer dependency.

## Auditability and Observability Expectations
- Future status transitions should map to audit event names and reason codes.
- Material blocked states require auditable reason metadata.

## Error Handling and Failure-Safe Behavior
- Unknown state must fail closed and show a generic safe blocked reason.
- Inconsistent readiness state must not unlock classification or document generation.

## Test Expectations
- Unit tests: status enum/label mapping when implemented.
- Integration tests: API returns safe blocked reasons.
- Manual verification: inspect labels against readiness docs.
- Explicit non-testable conditions: production validation claims are policy constraints, not runtime behavior in this story.

## Validation and Risk-Acceptance Limitations
Real validation remains incomplete. This story does not convert simulated validation into evidence.

## Explicit Non-Claims
No production deployment, validated release, formal legal reliability, runtime scanner accuracy, A2-b2 completion or compliance certification.

## Definition of Done
All prototype and blocked-state vocabulary is centrally represented, safe, traceable and aligned with canonical readiness/status docs.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-01-02-shared-prototype-status-and-guardrail-vocabulary.md`
