# LCSP Deep-Agent Flow and Tool Boundaries

This document defines the first v3 Deep-Agent boundary slice for `LCSP-241`.

The goal is not to move every historical worker/module into an LLM tool. The goal
is to expose the smallest stable agent-facing surface required by the canonical
assessment flow while preserving deterministic LCSP authority.

## Canonical flow

```text
plan
  ↓
investigate
  ↓
material fact unresolved?
  ├── no ────────────────────────────────┐
  │                                      ↓
  └── yes → NEEDS_INPUT → resolve → resume
                         ↑              │
                         └──────────────┘
                                        ↓
                              deterministic gate
                                        ↓
                                      gap
                                        ↓
                                     report
```

`NEEDS_INPUT` and `resume` are orchestration states, not free-standing LLM tools.
The deterministic gate is not delegated to a subagent.

## Agent roles

| Owner | Responsibility | Model-callable LCSP tools |
|---|---|---|
| Root orchestrator | Delegate to bounded subagents and request approved recovery actions | `request_targeted_reanalysis` |
| Planner | Select technical investigation scope only | common context/search tools + `get_scan_coverage` |
| Investigator | Collect provenance-backed graph evidence | graph query/trace/inspection tools |
| Resolver | Resolve one exact `NEEDS_INPUT` condition | assessment context + `compare_wizard_claim` |
| Deterministic runtime | Validate claims and evaluate EngineeringRules | none |
| Application runtime | Gap/report persistence and guarded artifact generation | none in this slice |

## Tool hierarchy

Agent-authored tools follow the Managed Deep Agents project convention while
adding an LCSP node boundary:

```text
deepagents/
  agent.py
  flow.py
  harness.py
  subagents.py
  tools/
    common/
      <tool-name>/
        __init__.py
        code.py
    planner/
      <tool-name>/
        __init__.py
        code.py
    investigator/
      <tool-name>/
        __init__.py
        code.py
    resolver/
      <tool-name>/
        __init__.py
        code.py
    orchestration/
      <tool-name>/
        __init__.py
        code.py
```

Historical implementation modules under `tools/graph`, `tools/legal`,
`tools/engineer_rule`, and similar packages remain internal engines during the
migration. They are not automatically agent-callable.

## Fixed LCSP tool sets

### Common

- `get_assessment_context`
- `get_legal_corpus_readiness`
- `retrieve_legal_basis`
- `search_program_graph`

### Planner

Common tools plus:

- `get_scan_coverage`

### Investigator

- `get_assessment_context`
- `retrieve_legal_basis`
- `search_program_graph`
- `trace_static_flow`
- `inspect_data_path`
- `inspect_decision_path`
- `inspect_human_review_path`
- `get_symbol_context`
- `find_provider_invocations`

### Resolver

- `get_assessment_context`
- `compare_wizard_claim`

### Orchestration

- `request_targeted_reanalysis` — human interrupt required

## Deep Agents harness tools

Deep Agents adds harness tools on top of authored `tools=[...]`. LCSP treats
these as framework capabilities, not application/domain tools.

The v3 boundary is:

- keep `task` so the root orchestrator can delegate to exactly the configured
  `planner`, `investigator`, and `resolver` subagents;
- keep `read_file` only for Managed Skills progressive disclosure;
- permit `read_file` only under `/skills/**`;
- hide `ls`, `write_file`, `edit_file`, `delete`, `glob`, `grep`, and `execute`;
- disable the auto-added `general-purpose` subagent;
- keep `sandbox = None`, so this slice has no shell execution backend.

The filesystem is therefore not a repository-reading escape hatch. Repository
and source evidence must enter through governed LCSP graph/evidence tools.

## Explicitly not exposed to the model

- generic `invoke_lcsp_boundary`
- `list_lcsp_invocation_boundaries`
- `resume_waiting_runs`
- deterministic `EngineeringRuleEvaluator`
- arbitrary scanner execution
- arbitrary shell/application boundary invocation
- unrestricted filesystem access
- the default `general-purpose` Deep Agents subagent

The generic invocation APIs may remain internally for compatibility, but they are
not part of the root Deep-Agent tool surface.

## LangChain boundary alignment

This structure follows the Managed Deep Agents requirements:

- one root `agent.py`;
- authored application tools below `tools/`;
- tools imported into the agent/subagent definitions;
- sensitive actions gated with `interrupt_on`;
- specialized subagents receive explicit minimal `tools` lists rather than the
  entire root tool catalog;
- filesystem access is constrained with `permissions`;
- harness built-ins that are outside the LCSP flow are removed with a
  `HarnessProfile`;
- the auto-added general-purpose subagent is disabled so delegation cannot leave
  the declared LCSP flow roles.

LCSP additionally applies its own stronger rule: the model can investigate and
propose evidence claims, but deterministic code owns validation, policy gates,
and the final EngineeringRule result.
