# Story STORY-09-02 — No Raw Source to LLM Boundary

## Metadata
- Epic ID: EPIC-09
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-05-01 and STORY-07-02
- Intended implementation order: 28
- Prototype-only classification: Controlled MVP prototype LLM privacy boundary story

## User Story
As a security reviewer, I want all LLM calls to pass only sanitized metadata through the LLM Gateway so source code and prompts remain private.

## Business Value
Enforces a core trust boundary.

## Authorization and Scope Boundary
Prototype LLM Gateway boundary only. Does not choose final provider or certify production privacy.

## In Scope
- LLM Gateway as only model boundary.
- Sanitized metadata inputs.
- Raw source/full prompt/secret/raw AST rejection.
- Deterministic gates override LLM output.

## Out of Scope
- Direct provider SDK calls from workflow nodes.
- Raw prompt/source logging.
- Production provider failover.

## Dependencies
- STORY-05-01.
- STORY-07-02.

## Architecture and Module References
- `docs/implementation/llm-gateway-implementation.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/security/source-code-privacy-policy.md`

## Domain, Data, Event, and API Contract References
- Entity: ModelRunMetadata.
- Fields: assessment_id, workflow_run_id, node_name, provider, model, prompt_version, input_reference, output_hash, status.

## Acceptance Criteria
1. LLM Gateway is the only LLM boundary.
2. LLM input contains sanitized metadata, evidence refs, route/service labels and retrieved rule refs only.
3. Raw source, full prompts, secrets and raw AST bodies are rejected.
4. LLM output cannot override deterministic gates.

## Technical Implementation Notes
- Store model metadata and output hash, not raw prompt/source.

## Security and Privacy Constraints
- Strict no raw-source/full-prompt/secrets policy.

## Auditability and Observability Expectations
- Audit model run metadata and blocked unsafe input.

## Error Handling and Failure-Safe Behavior
- Unsafe LLM input blocks call.
- Timeout/invalid output fails closed or degrades per workflow.

## Test Expectations
- Unit tests: sanitizer/rejection rules.
- Integration tests: workflow calls only Gateway.
- Manual verification: no raw source in model metadata.
- Explicit non-testable conditions: production provider reliability deferred.

## Validation and Risk-Acceptance Limitations
Prototype boundary does not certify production LLM privacy.

## Explicit Non-Claims
No production privacy certification, legal reliability, production deployment or compliance certification.

## Definition of Done
All model access is mediated by LLM Gateway and raw source/prompt/secret inputs are rejected.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-09-02-no-raw-source-to-llm-boundary.md`
