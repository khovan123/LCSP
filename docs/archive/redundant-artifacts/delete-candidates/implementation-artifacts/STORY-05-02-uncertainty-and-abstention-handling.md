# Story STORY-05-02 — Uncertainty and Abstention Handling

## Metadata
- Epic ID: EPIC-05
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-05-01
- Intended implementation order: 14
- Prototype-only classification: Controlled MVP prototype uncertainty story

## User Story
As a Manager, I want unclear AI usage purpose or downstream action to be marked explicitly so the system blocks unsupported classification.

## Business Value
Prevents false certainty.

## Authorization and Scope Boundary
Prototype uncertainty handling only. Does not validate runtime coverage accuracy.

## In Scope
- Unknown/unclear usage purpose.
- `SCAN_COVERAGE_LIMITATION` and `UNSUPPORTED_DYNAMIC_FLOW`.
- Abstention behavior for dynamic, generated, minified, unsupported or provider-only paths.

## Out of Scope
- Guessing from variable names alone.
- LLM raw source inspection.
- Final classification.

## Dependencies
- STORY-05-01.

## Architecture and Module References
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`

## Domain, Data, Event, and API Contract References
- AIUsageFlow uncertainty fields.
- Coverage limitation evidence refs.
- Blocked classification reason codes.

## Acceptance Criteria
1. Dynamic prompt/runtime dependency emits unknown/unclear or coverage limitation.
2. Generated/minified/unsupported source emits coverage limitation.
3. Provider SDK-only fixture does not trigger high-impact inference.
4. Unknown critical usage fields block/degrade final classification or route to Manager clarification.

## Technical Implementation Notes
- Use explicit uncertainty reasons.
- Do not upgrade low-confidence claims to legal-rule eligibility.

## Security and Privacy Constraints
- LLM cannot receive raw source/full prompts to resolve uncertainty.

## Auditability and Observability Expectations
- Audit uncertainty state and blocked reason.

## Error Handling and Failure-Safe Behavior
- Unknown critical purpose/downstream action blocks unsupported classification.

## Test Expectations
- Unit tests: uncertainty reason mapping.
- Integration tests: unknown critical usage blocks classification shell.
- Manual verification: blocked reason visible.
- Explicit non-testable conditions: empirical scanner coverage is A2-b2.

## Validation and Risk-Acceptance Limitations
A2-b1 mapping review can check design behavior only.

## Explicit Non-Claims
No runtime coverage accuracy, scanner accuracy, legal classification or A2-b2 completion.

## Definition of Done
Unclear/dynamic/unsupported paths abstain or block instead of overclaiming.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-05-02-uncertainty-and-abstention-handling.md`
