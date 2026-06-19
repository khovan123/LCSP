# Evidence Gates and Reconciliation Implementation

## Purpose

Define implementation guidance for Schema Gate, Quality Gate, TechnicalProfile construction, Reconciliation, Manager conflict resolution and VerifiedProfile creation.

## Scope

This document covers the evidence-to-profile path after Repository Scan and before Legal Rule Matching.

## Dependencies / Source References

- [Evidence Report Contract](../specs/evidence-report-contract.md)
- [Reconciliation Policy](../specs/reconciliation-policy.md)
- [State Machine](../specs/state-machine.md)
- [Implementation Contract](../specs/implementation-contract.md)

## Implementation Boundaries

- Repository Scan is the only active MVP technical evidence path.
- Schema Gate validates contract shape, version and required metadata.
- Quality Gate validates sufficiency, freshness, relevance and coverage limitations.
- Reconciliation compares `WizardProfile` with `TechnicalProfile + AIUsageFlow`.
- Manager is final conflict resolver in MVP.

## Pipeline

```text
TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> Manager Conflict Resolution Task if needed
-> VerifiedProfile
```

## Schema Gate Contract Checks

| Check | Failure Behavior |
| --- | --- |
| Report contract version supported | Reject report |
| Assessment/repository/commit/scanner metadata present | Reject report |
| Findings have valid ids, types, refs, confidence | Reject report or quarantine invalid findings |
| Evidence hashes and report hash valid | Reject report |
| Raw source/full prompt/secret absent | Security fail and reject |

## Quality Gate Sufficiency Checks

| Check | Failure Behavior |
| --- | --- |
| Scanner coverage acceptable for selected repo/commit | Request re-scan/correction |
| Required AI invocation/input/output/action signals present or marked uncertain | Block classification until clarified |
| Coverage limitations recorded | Allow only if non-critical or clarified |
| Evidence freshness and ruleset/scanner versions available | Block if stale/invalid |
| Static-analysis limitations transparent | Surface uncertainty |

## TechnicalProfile Construction

`TechnicalProfile` summarizes technical facts from normalized findings and gate results. It does not classify legal risk. It answers how AI is technically present and what technical evidence exists.

## Reconciliation Comparison

| Compared Source | Against | Conflict Example |
| --- | --- | --- |
| WizardProfile business purpose | AIUsageFlow business process | Internal assistant vs loan approval flow |
| WizardProfile data declaration | AIUsageFlow input categories | No sensitive data vs health/financial data signal |
| WizardProfile human review | AIUsageFlow human review | Review claimed vs bounded auto-approve path |
| WizardProfile technical claims | TechnicalProfile | No AI use vs model invocation evidence |

## Manager Conflict Resolution Task

When conflict exists:

```text
Reconciliation detects conflict
-> Orchestrator pauses workflow
-> System creates Manager Conflict Resolution Task
-> Manager reviews WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs
-> Manager updates or confirms traceable information
-> Reconciliation re-runs if needed
-> VerifiedProfile only when no unresolved conflict remains
```

Manager cannot arbitrarily override scanner facts. A resolution must be traceable as confirmation, business update, technical interpretation, re-scan request or accepted uncertainty with blocking effect.

## VerifiedProfile Lifecycle

| State | Meaning |
| --- | --- |
| Candidate | All gates passed and no unresolved conflict detected |
| Ready | Snapshot can be used for classification |
| Approved | Manager has reviewed/approved where policy requires |
| Invalidated | New scan, Wizard change, conflict, legal corpus change or evidence change invalidates snapshot |

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| TechnicalEvidenceReport | Schema gate result |
| Normalized findings | Quality gate result |
| TechnicalProfile + AIUsageFlow + WizardProfile | Conflict/no-conflict decision |
| Manager resolution | Re-run reconciliation and VerifiedProfile readiness |

## State / Error / Failure Handling

- Schema fail rejects report and keeps classification locked.
- Quality insufficient requests re-scan/correction and keeps classification locked.
- Any unresolved conflict keeps classification and final report locked.
- VerifiedProfile must be rebuilt or invalidated after evidence/profile changes.

## Security and Privacy Considerations

Evidence gates must reject raw source, full prompts, secrets and unsafe payloads. Conflict screens should show evidence summaries/refs, not raw source.

## Audit Requirements

Audit schema pass/fail, quality ready/insufficient, TechnicalProfile ready, conflict found, Manager conflict task created, resolution submitted, reconciliation re-run, VerifiedProfile created/approved/invalidated.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Quality Gate numeric thresholds | Defined by A2-b and scanner fixture validation | Implementation/backlog unblock |
| VerifiedProfile approval UI semantics | Manager approval required where workflow policy demands | Implementation |

