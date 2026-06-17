# Story STORY-05-01 — AIUsageFlow Claim Model

## Metadata
- Epic ID: EPIC-05
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-04-04
- Intended implementation order: 13
- Prototype-only classification: Controlled MVP prototype AIUsageFlow story

## User Story
As a compliance reviewer, I want AIUsageFlow claims to carry values, confidence, evidence refs and source type so legal matching has traceable inputs.

## Business Value
Bridges technical evidence and legal rule matching safely.

## Authorization and Scope Boundary
Prototype claim model only. It does not generate legal conclusions.

## In Scope
- Claim-level fields for business process, purpose, inputs, outputs, downstream action, affected subjects, human review, automation level and harm categories.
- Evidence refs and confidence per material claim.
- Legal-rule eligibility flag for evidence-backed claims.

## Out of Scope
- Legal conclusion generation.
- Provider/model-only classification.
- Runtime scanner accuracy validation.

## Dependencies
- STORY-04-04.

## Architecture and Module References
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`

## Domain, Data, Event, and API Contract References
- Entities: AIUsageFlow, AIUsageFlowClaim, EvidenceReference.
- Events: AI_USAGE_FLOW_READY, AI_USAGE_FLOW_UNCLEAR.

## Acceptance Criteria
1. AIUsageFlow includes all required usage-flow claim categories.
2. Every material claim has value, confidence, evidence_refs, source_type and uncertainty reason when applicable.
3. Claims without evidence refs are ineligible for legal rule matching.
4. Provider/model/framework presence alone cannot populate high-impact purpose/action claims.

## Technical Implementation Notes
- Rule-first claim assembly.
- LLM, if later used, receives sanitized metadata only through LLM Gateway.

## Security and Privacy Constraints
- Claims contain metadata and evidence refs, not raw source.

## Auditability and Observability Expectations
- Audit AIUsageFlow generated/unclear and claim eligibility.

## Error Handling and Failure-Safe Behavior
- Missing evidence_refs blocks legal-rule eligibility.

## Test Expectations
- Unit tests: claim schema and eligibility.
- Integration tests: provider-only signal cannot classify.
- Manual verification: claim refs trace to evidence.
- Explicit non-testable conditions: confidence thresholds may be tuned.

## Validation and Risk-Acceptance Limitations
A2-b1 validates mapping design only; A2-b2 remains post-implementation.

## Explicit Non-Claims
No legal classification, formal legal reliability, runtime scanner accuracy or A2-b2 completion.

## Definition of Done
AIUsageFlow claims are evidence-backed, uncertainty-aware and legal-rule eligible only when evidence refs exist.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-05-01-aiusageflow-claim-model.md`
