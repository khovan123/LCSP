# Story STORY-05-03 — Human Review and Automation Level Mapping

## Metadata
- Epic ID: EPIC-05
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-05-01
- Intended implementation order: 15
- Prototype-only classification: Controlled MVP prototype automation mapping story

## User Story
As a compliance reviewer, I want human review and automation level represented carefully so automated decisions are not over- or under-claimed.

## Business Value
Supports correct conflict and legal eligibility behavior.

## Authorization and Scope Boundary
Prototype mapping design only. It does not make formal legal classification.

## In Scope
- Human review states: present, absent with bounded-path evidence, unclear.
- Automation-level claims.
- Automated decision guard: AI output + decision rule + state-changing action + no evidenced review step.

## Out of Scope
- Legal classification.
- Runtime scanner empirical accuracy.
- Whole-repository unrestricted data-flow analysis.

## Dependencies
- STORY-05-01.

## Architecture and Module References
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/static-analysis-scanner-contract.md`

## Domain, Data, Event, and API Contract References
- AIUsageFlowClaim: human_review, automation_level, downstream_action.
- Evidence refs for decision and review signals.

## Acceptance Criteria
1. Human review supports present, bounded-path absent and unclear.
2. Fully automated decision requires output, decision rule, state-changing action and no evidenced review step.
3. HR ranking remains distinct from automated hiring decision unless downstream automation is proven.
4. Human-reviewed loan maps to supported decision_support/semi_automated behavior.

## Technical Implementation Notes
- Generic `review()` naming alone is insufficient.
- Bounded-path absent review requires evidence.

## Security and Privacy Constraints
- No raw source snippets in findings review.

## Auditability and Observability Expectations
- Audit human-review uncertainty and automation-level evidence refs.

## Error Handling and Failure-Safe Behavior
- Unclear review status blocks unsupported automated-decision classification.

## Test Expectations
- Unit tests: automation-level rules.
- Integration tests: human-reviewed fixture does not become fully automated.
- Manual verification: A2-b1 fixture behavior.
- Explicit non-testable conditions: empirical false positive/negative rates are A2-b2.

## Validation and Risk-Acceptance Limitations
A2-b1 mapping design only; A2-b2 remains post-implementation.

## Explicit Non-Claims
No formal legal classification, runtime scanner accuracy, A2-b2 completion or production scanner benchmark.

## Definition of Done
Human review and automation claims are evidence-backed and avoid unsupported high-impact inference.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-05-03-human-review-and-automation-level-mapping.md`
