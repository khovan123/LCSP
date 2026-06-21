# Story STORY-04-02 — Synthetic Fixture-driven Scanner Prototype

## Metadata
- Epic ID: EPIC-04
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-04-01
- Intended implementation order: 10
- Prototype-only classification: Controlled MVP prototype synthetic scanner story

## User Story
As a QA reviewer, I want the scanner prototype to consume approved synthetic fixtures so A2-b1 mapping-design validation can exercise expected evidence shapes.

## Business Value
Supports controlled prototype without claiming production scanner accuracy.

## Authorization and Scope Boundary
A2-b1 mapping-design support only. A2-b2 empirical scanner acceptance remains post-implementation.

## In Scope
- Synthetic fixture input handling.
- TechnicalFinding and graph-path metadata emission from approved fixture specs.
- Coverage limitation behavior for dynamic/unsupported fixtures.

## Out of Scope
- Runtime parser correctness.
- AST extraction accuracy.
- Empirical false-positive/false-negative rates.
- Performance benchmarks.

## Dependencies
- STORY-04-01.

## Architecture and Module References
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/validation/fixtures/specs/`

## Domain, Data, Event, and API Contract References
- TechnicalFinding.
- EvidenceReference.
- Scanner/ruleset version metadata.

## Acceptance Criteria
1. Scanner prototype can emit TechnicalFinding and graph-path metadata from approved A2-b1 fixture specs.
2. Findings include scanner/ruleset version, confidence and evidence refs.
3. Dynamic/unsupported fixtures emit coverage limitations or unsupported flow.
4. Provider-only fixture cannot emit automated/high-impact decision finding.

## Technical Implementation Notes
- Fixture-driven output may simulate scanner signals only.
- Keep static-analysis-only boundary visible.

## Security and Privacy Constraints
- Fixtures are synthetic and contain no customer source/secrets.
- No raw source to LLM.

## Auditability and Observability Expectations
- Evidence report includes fixture id/hash and generation metadata.

## Error Handling and Failure-Safe Behavior
- Unsupported fixture path emits explicit limitation, not inferred certainty.

## Test Expectations
- Unit tests: fixture-to-finding mapping.
- Integration tests: provider-only fixture does not overclaim.
- Manual verification: A2-b1 fixture expectations.
- Explicit non-testable conditions: real scanner accuracy is A2-b2.

## Validation and Risk-Acceptance Limitations
A2-b1 does not prove runtime scanner accuracy.

## Explicit Non-Claims
No parser correctness, AST accuracy, production scanner behavior, A2-b2 completion or formal legal validation.

## Definition of Done
Synthetic fixtures can produce traceable prototype evidence without overclaiming runtime scanner accuracy.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-04-02-synthetic-fixture-driven-scanner-prototype.md`
