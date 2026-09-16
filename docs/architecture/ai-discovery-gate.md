# Scanner/PGE → Initial Interview AI Discovery Gate

## Authority boundary

Scanner and the Program Evidence Graph own technical facts: invocation-shaped SDK calls,
outbound API candidates, call/data/control/config provenance, source anchors, coverage and
unresolved technical frontiers. Initial Interview owns Customer/runtime/business context.
Interview answers may supplement operational facts but never rewrite contradictory PGE
evidence. Legal applicability and compliance classification remain downstream.

The persisted Scanner projection is `evidence_payload.ai_discovery` with evidence states
`CONFIRMED_AI_CALL`, `POSSIBLE_AI_CALL`, `AI_PROVIDER_REFERENCE`, and
`UNRESOLVED_DYNAMIC`, and gate states `AI_CONFIRMED`, `AI_UNKNOWN`, and
`AI_ABSENT_CONFIRMED`. Provider/package/config presence alone is not model invocation.

## Gate

`AI_CONFIRMED` requires governed invocation/API evidence. A model invocation whose runtime
guard cannot be resolved remains technically observed but operationally `AI_UNKNOWN` until
the Customer supplies the deployment fact. `AI_UNKNOWN` also covers AI-capable custom
gateways, provider references that still need technical resolution, material dynamic
frontiers, and non-READY technical coverage.

`AI_ABSENT_CONFIRMED` is legal only when PGE coverage is `READY` and there is no confirmed
or possible AI call, provider reference requiring clarification, or material AI dynamic
frontier. A missing signal under `PARTIAL`/`UNAVAILABLE` coverage is never absence proof.

Technical/resolvable uncertainty routes to targeted reanalysis. Customer-owned runtime or
business uncertainty becomes one bounded Interview question. Confirmed invocation skips
the redundant “is this AI?” question and asks purpose + Web/Mobile/API feature/module and
workflow context. An unresolved custom outbound candidate uses `Yes / No / Unsure`; a Yes
answer may provide the customer-hosted/provider identity as free text.

## Source snippets

PGE does not persist unrestricted source for Interview display. Each AI finding may persist
only a `snippet_ref`: pinned `snapshot_id`, `commit_sha`, `file_path`, optional symbol,
bounded `start_line`/`end_line`, `evidence_hash`, and
`PINNED_SNAPSHOT_BOUNDED_REDACTED_V1`. A UI must retrieve source on demand through the
governed snapshot/evidence boundary, verify the pinned version/hash, cap context, redact
secret-looking values, and return only the authorized range. API keys, tokens, passwords,
credentials, or unrelated source are never requested or displayed.

## Idempotency

Clarification identity is derived from the pinned assessment/snapshot evidence identity and
clarification kind. Existing Interview session revision and answer-request idempotency then
prevent retry/resume from creating duplicate questions or context revisions.
