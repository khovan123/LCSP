# LCSP Documentation Governance

## Purpose

Prevent documentation explosion by enforcing a small active documentation set and a time-limited archive.

## Active Layers

```text
docs/product/
docs/specs/
docs/architecture/
docs/developer-execution-blueprints/
docs/implementation/
```

## Target Structure

```text
docs/
  product/
    prd.md
    business-rules.md
    validation-plan.md
  specs/
    scanner-spec.md
    assessment-lifecycle-spec.md
    legal-classification-spec.md
    document-generation-spec.md
  architecture/
    architecture.md
    multi-agent-system-architecture.md
    adr/
  developer-execution-blueprints/
    end-to-end-execution.md
    scanner-data-journey.md
    ai-usage-flow-blueprint.md
    reconciliation-blueprint.md
    classification-blueprint.md
    gap-analysis-blueprint.md
  implementation/
    scanner-implementation.md
    backend-implementation.md
    persistence-implementation.md
    queue-implementation.md
    llm-gateway-implementation.md
  archive/
    decisions/
    redundant-artifacts/delete-candidates/
```

## Ownership Rules

| Question | Source of Truth |
|---|---|
| Why does this exist? | `product/` |
| What is the domain contract? | `specs/` |
| What components exist and why? | `architecture/` |
| What happens at runtime? | `developer-execution-blueprints/` |
| How is it built/run/operated? | `implementation/` |

## Strict Rules

- One concept has one authoritative document.
- Architecture must not contain queue topology, DB schema, retry strategy, or packaging detail.
- Implementation owns technology decisions and build/run details.
- Execution blueprints own user/API/service/DB/queue/worker/object flow.
- Archive is not a knowledge base.
- Redundant artifacts must be eligible for deletion after 30 days if merged, unreferenced, and decision-free.
