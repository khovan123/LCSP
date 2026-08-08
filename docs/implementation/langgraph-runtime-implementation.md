# LangGraph Runtime Implementation

## Purpose

Define the authoritative runtime pattern for real LCSP business orchestration that uses LangChain and LangGraph inside the Python Worker Platform.

## Scope

This document applies to worker-owned runtime flows that need multi-step stateful orchestration with deterministic processing, retrieval, validation, and controlled LLM-assisted reasoning.

In MVP, the primary candidate flows are:

- `AIUsageFlow` claim assembly with uncertainty preservation
- Citation-backed classification
- Document generation after classification and gap-analysis gates

## Runtime Ownership

- Graph runtime lives in `lcsp-python-workers`.
- Each graph is owned by a bounded worker module, not by the API layer.
- Queue events remain the entry point.
- Persisted domain artifacts remain the handoff contract between stages.

## Canonical Flow Pattern

```text
queue command/event
-> load immutable input artifact versions
-> deterministic normalization and policy gates
-> optional retrieval/composition steps
-> optional LLM-assisted reasoning node(s) through LLM Gateway
-> schema validation and deterministic guardrail checks
-> persist output artifact or blocked/degraded state
-> emit next event
```

## Node Taxonomy

| Node type | Allowed behavior | Forbidden behavior |
| --- | --- | --- |
| Deterministic node | Load inputs, normalize evidence, compute rule-based fields, enforce gates, assemble persistence payloads | Calling providers directly, inventing unsupported evidence |
| Retrieval node | Fetch approved legal/material context by IDs, metadata filters, allowlists | Returning unapproved corpus content or bypassing citation policy |
| LLM-assisted node | Use sanitized structured inputs, approved prompt/template ref, schema-constrained output, fallback policy | Reading raw source, overriding deterministic evidence, persisting raw prompt/provider secret |
| Guardrail node | Validate schema, citations, uncertainty thresholds, workflow gates, state transitions | Silently downgrading failed outputs into success |
| Persistence node | Store immutable artifact versions and audit metadata, emit next event | Mutating prior authoritative artifacts in place |

## Required State Contract

Each LangGraph workflow run must carry:

- `assessment_id`
- `workflow_run_id`
- `artifact_versions`
- `node_name`
- `attempt`
- `sanitized_inputs`
- `guardrail_status`
- `llm_run_refs` when model nodes are used
- `blocked_or_degraded_reason` when applicable

The state contract must be serializable for checkpoint/retry/replay and must exclude raw source, secrets, full prompts, and full AST bodies.

## LangChain and LLM Gateway Integration

- LangChain may be used for prompt templating, structured output adapters, and retrieval composition helpers.
- LangChain provider wrappers must not call external providers directly from worker code.
- All external model invocations must traverse the LLM Gateway contract defined in `docs/implementation/llm-gateway-implementation.md`.
- Gateway metadata returned from a model call must be recorded in graph state by reference, not by raw prompt/body persistence.

## AIUsageFlow Guidance

- AIUsageFlow may use LangGraph to coordinate evidence loading, claim drafting, uncertainty analysis, and abstention checks.
- Deterministic evidence-derived facts remain the authority for what was technically observed.
- LLM-assisted reasoning, if used, is limited to mapping evidence-backed facts plus Wizard declarations into business-meaning claim proposals with explicit uncertainty handling.
- Provider/framework/package presence alone must never become a material business claim without supporting evidence and guardrail approval.

## Classification Guidance

- Classification graphs consume VerifiedProfile plus approved legal retrieval results only.
- Deterministic precedence rules and citation guardrails must run before and after any model-assisted reasoning node.
- Provider failure, schema-invalid output, or citation gaps must end in blocked/degraded classification states.

## Document Generation Guidance

- Document graphs start only after classification and gap-analysis completion.
- They may use LLM-assisted drafting nodes, but document claims must remain traceable to approved upstream artifacts.
- If required basis is missing, the graph fails closed.

## Operational Requirements

- Every graph needs idempotency keys tied to workflow run and artifact version inputs.
- Retry policy must be node-specific and bounded.
- DLQ replay must rehydrate the same graph state contract or explicitly start a new versioned run.
- Observability must record graph start, node transition, retry, blocked/degraded outcome, and completion without sensitive payload leakage.

## Authority Notes

- This document defines runtime shape, not product scope.
- Story-level implementation artifacts must align to this runtime pattern when they introduce LangChain/LangGraph behavior.
- Older deterministic-only task documents that conflict with this authority must be revised or explicitly marked superseded during story implementation.
