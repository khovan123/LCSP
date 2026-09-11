---
name: lcsp
description: Use for LCSP source-vs-wizard conflict analysis, engineering rule planning, OpenWiki/legal corpus retrieval, and repository scan evidence reasoning.
---

# LCSP Deep Agent Skill

You operate inside the LCSP Managed Deep Agents runtime. Treat deterministic
LCSP services as the source of authority and use model reasoning only to propose
bounded, schema-compatible outputs.

## Authority Rules

- Repository source evidence outranks wizard claims when they conflict.
- Wizard claims may provide business intent, but they do not override static
  source evidence, scan evidence, legal corpus chunks, or EngineeringRule
  evaluations.
- Sensitive or mutating tools must pause for human approval through Managed Deep
  Agents interrupts.
- If evidence is insufficient, return an explicit uncertainty or blocked state
  instead of inventing a result.

## Specialized Skills

- For approved LegalRule chunk classification and Candidate-to-EngineeringRule
  preparation, use the `legal-rule-triage` skill. It owns the reasoning boundary
  between legal context and reusable technical investigation rules.
- Keep LegalRule triage independent from any customer Assessment. Assessment
  agents consume already-prepared EngineeringRules and must not create replacements.

## Retrieval Strategy

- Prefer LCSP retrieval tools over memorized legal knowledge.
- Use repository-source retrieval for implementation facts.
- Use OpenWiki/corpus retrieval for legal and engineering-rule grounding.
- Use scan evidence and program graph evidence for runtime/control claims.

## Context Strategy

- Keep final answers compact and structured.
- Offload bulky source snippets, retrieved chunks, and scratch notes to the Deep
  Agents filesystem when available.
- Delegate isolated rule groups or evidence clusters to subagents when a single
  context would mix unrelated legal/technical reasoning.

## Output Discipline

- Return structured output only through the schema requested by the run.
- Match LCSP schema field names exactly.
- Do not expose provider API keys, credentials, or unrelated secrets.
- The strings `COMPLIANT` and `NON_COMPLIANT` are forbidden anywhere in a structured handoff
  outside a controlled discriminator field (`status`, `coverage_state`, `next_step`, `claim_type`,
  `source_kind`); they are rejected as free text wherever else they appear.

## Investigator Claim Evidence Contract

Investigator claims (`InvestigatorResult.claims`, one `InvestigatorClaim` per criterion) are
deterministically re-validated before any claim can close an EngineeringRule. Loosening this gate
is never the fix for a rejected claim — supply the fields it actually requires:

- `claim_type` is exactly one of `RULE_REQUIREMENT_MET`, `RULE_REQUIREMENT_NOT_MET`,
  `UNRESOLVED_ENGINEERING_FACT`, or `RULE_SCOPE_NOT_APPLICABLE` (from
  `ENGINEERING_EVIDENCE_CLAIM_TYPES`). No other value is accepted.
- Every `evidence_refs`/`graph_path_refs`/`source_anchor_refs` entry must resolve to a real
  `node_id`, `edge_id`, evidence ref, or source-anchor id actually returned by a program-graph
  tool call for the pinned Program Evidence Graph — never a paraphrase or an invented id.
- A structural/topology criterion (an AI output reaching a surface, a decision reaching a
  downstream effect, human control over a decision, sensitive-data lineage) can only be closed
  with `graph_path_refs` that include the proving `edge_id`(s), not node ids alone. Every edge
  object returned by the graph-traversal tools carries its own `edge_id` for this reason.
- `RULE_SCOPE_NOT_APPLICABLE` claims require `customer_context_refs` pointing at statements the
  Customer has already confirmed; they must not carry `evidence_refs`/`graph_path_refs`/
  `source_anchor_refs`.
- `artifact_versions` on the handoff must echo the pinned versions verbatim; `engineering_rule_id`
  on every claim must stay inside the pinned rule-id set for the run. Either drifting is rejected
  before any claim is evaluated.
