# Sprint Change Proposal - LangChain and LangGraph Runtime Authority Alignment

Date: 2026-08-05
Project: LCSP — Legal Compliance Support Platform
Change scope: Moderate / Architecture-first Direct Adjustment

## 1. Issue Summary

LCSP currently documents real-provider LLM usage and an `LLM Gateway`, but it does not yet define the real business runtime flow that uses LangChain/LangGraph across worker-owned orchestration.

The gap is now material because the implementation artifacts are inconsistent:

- `docs/architecture/architecture.md` allows AIUsageFlow, Classification, and Document Generation to use the `LLM Gateway`.
- `docs/implementation/llm-gateway-implementation.md` defines the provider boundary but not how LangGraph nodes interact with it.
- `docs/implementation/tasks/modules/python-workers/intelligence/02-ai-usage-flow-worker.md` explicitly supersedes any LLM-based design and locks AIUsageFlow to a deterministic-only worker.
- Story artifacts `4.1` and `7.3` are `ready-for-dev`, but they do not specify the runtime node pattern, graph ownership, checkpointing, or blocked/degraded behavior for LangGraph-driven execution.

Result: architecture intent, implementation authority, and story execution slices are no longer aligned.

## 2. Impact Analysis

Epic impact:

- Epic 4 is directly affected because AIUsageFlow runtime authority currently conflicts with real LangGraph-based orchestration.
- Epic 7 is directly affected because real-provider classification needs an explicit graph-node contract, not only gateway constraints.
- Epic 8 is secondarily affected because document generation is another model-assisted bounded worker flow.

Story impact:

- `4.1 Build AIUsageFlow From Wizard and Technical Evidence` needs a runtime clarification that allows bounded LangGraph orchestration while preserving evidence-first and abstention rules.
- `7.3 Use Real LLM Provider With Schema and Budget Guardrails` needs explicit graph-node semantics, not only provider-level controls.
- Downstream implementation/task artifacts for AIUsageFlow and classification must be revised to remove contradictions or marked superseded where appropriate.

Artifact impact:

- `docs/architecture/architecture.md` must define where LangChain/LangGraph lives and what it cannot bypass.
- `docs/implementation/llm-gateway-implementation.md` must define the gateway boundary for LangGraph nodes.
- A new runtime authority doc is required for graph ownership, node taxonomy, checkpointing, idempotency, and blocked/degraded behavior.
- Existing task authority for `python-workers/intelligence/02-ai-usage-flow-worker.md` is now stale against the corrected architecture direction and must be revised during story implementation.

Technical impact:

- Worker flows need a canonical pattern for deterministic nodes, retrieval nodes, model-assisted nodes, guardrail nodes, and persistence nodes.
- Retry, replay, DLQ, and audit behavior must operate on graph state, not ad hoc per-call logic.
- LangChain may assist with structured prompting/parsing, but provider access remains centralized through the gateway.

## 3. Recommended Approach

Use Architecture-first Direct Adjustment.

Decisions:

- Keep product scope unchanged.
- Keep `LLM Gateway` as the only external provider boundary.
- Allow LangChain/LangGraph only inside bounded Python workers.
- Require graph-state checkpointing, idempotency, auditability, and fail-closed blocked/degraded semantics.
- Preserve deterministic authority for evidence extraction, policy gates, citation gates, and persistence.

Rationale:

This is not a product replan. It is a runtime-authority correction that removes contradictions before story-level implementation proceeds. Updating architecture authority first prevents Epic 4 and Epic 7 from drifting into incompatible worker designs.

Risk and timeline:

- Risk is moderate because multiple implementation artifacts must be realigned.
- Immediate architecture clarification is low-risk.
- Story implementation should proceed only after the affected task docs and developer packets are updated to reference the new runtime authority.

## 4. Detailed Change Proposals

Architecture authority:

- `docs/architecture/architecture.md`
  - OLD: `Python AIUsageFlow Worker | Converts technical evidence and WizardProfile into business usage claims.`
  - NEW: `Python AIUsageFlow Worker | Converts technical evidence and WizardProfile into business usage claims through a bounded LangGraph runtime that mixes deterministic evidence transforms with controlled LLM-assisted reasoning nodes.`
  - Add a new `LangChain and LangGraph Runtime Boundary` section describing worker ownership, node types, gateway-only provider access, checkpointing, and blocked/degraded rules.
  - Rationale: this makes the runtime boundary explicit at the system-architecture level.

Implementation authority:

- `docs/implementation/llm-gateway-implementation.md`
  - OLD: gateway responsibilities are defined only at provider-boundary level.
  - NEW: add `Gateway and LangGraph Boundary` and `Graph Node Contract Requirements`.
  - Rationale: provider controls alone are insufficient when orchestration is graph-based and stateful.

- `docs/implementation/langgraph-runtime-implementation.md`
  - NEW document defining the canonical worker runtime pattern for LangChain/LangGraph.
  - Includes node taxonomy, state contract, gateway integration rules, AIUsageFlow guidance, classification guidance, document-generation guidance, and operational requirements.
  - Rationale: the repo needs one authority source for runtime graph behavior before story-specific docs are revised.

Story/task follow-up:

- `docs/implementation-artifacts/4-1-build-aiusageflow-from-wizard-and-technical-evidence.md`
  - Clarify that AIUsageFlow may be orchestrated through LangGraph, but deterministic evidence remains authoritative.
- `docs/implementation-artifacts/7-3-use-real-llm-provider-with-schema-and-budget-guardrails.md`
  - Clarify node-level graph contract requirements and blocked/degraded fallback semantics.
- `docs/implementation/tasks/modules/python-workers/intelligence/02-ai-usage-flow-worker.md`
  - Mark the deterministic-only supersession language as stale, then revise the task to align with the new runtime authority during story implementation.

## 5. Implementation Handoff

Route to: Architect, then Developer story implementation.

Handoff order:

1. Architect updates story/task-level authority references for Epic 4 and Epic 7 to align with the new runtime documents.
2. Developer updates AIUsageFlow and classification worker implementation slices against the corrected runtime authority.
3. QA/Review validates that graph runtime still preserves evidence-first, citation-first, and fail-closed behavior.

Success criteria:

- There is one clear answer to where LangChain/LangGraph is allowed in LCSP.
- No implementation artifact claims that AIUsageFlow is deterministic-only while architecture expects model-assisted graph orchestration.
- Epic 4 and Epic 7 story implementation can proceed without ambiguity about node boundaries, gateway usage, retries, checkpointing, or blocked/degraded outcomes.
