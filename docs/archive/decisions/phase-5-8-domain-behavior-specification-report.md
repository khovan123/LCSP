# Phase 5.8 Domain Behavior Specification Report

## Scope

Phase 5.8 completed domain behavior specifications for the three remaining implementation-blocking domain areas:

- AIUsageFlow domain behavior.
- Legal Matching domain behavior.
- LCSP domain state machines.

No implementation guide, story, backlog, validation artifact, architecture rewrite, code, migration or test artifact was created.

## Source Documents Used

- `docs/product/system-context.md`
- `docs/product/business-capability-map.md`
- `docs/specs/domain-model.md`
- `docs/specs/event-catalog.md`
- `docs/specs/user-task-flows.md`
- `docs/specs/scanner-spec.md`
- `docs/specs/assessment-lifecycle-spec.md`
- `docs/specs/legal-classification-spec.md`
- `docs/specs/document-generation-spec.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`

External pattern research was used only for document structure: Event Storming command/event/aggregate framing, DMN-style deterministic rule documentation, and guard/action state-machine tables.

## Files Created

| File | Purpose |
|---|---|
| `docs/specs/ai-usage-flow-domain-spec.md` | Defines how technical evidence and Manager declarations become AIUsageFlow claims, confidence, abstention and conflicts. |
| `docs/specs/legal-matching-domain-spec.md` | Defines how VerifiedProfile facts become citation-backed LegalRuleMatch records and legal matching handoff. |
| `docs/specs/domain-state-machines.md` | Defines domain state transitions, guards, invalid transitions, failure transitions, recovery transitions and event mapping. |
| `docs/archive/decisions/phase-5-8-domain-behavior-specification-report.md` | Records Phase 5.8 completion and adversarial review result. |

## AIUsageFlow Behavior Locked

`docs/specs/ai-usage-flow-domain-spec.md` now defines:

- Inputs: TechnicalProfile, WizardProfile and TechnicalEvidenceReport.
- Outputs: AIUsageFlow, AIUsageFlowClaim and AIUsageFlowSummary.
- Claim taxonomy and claim lifecycle.
- Deterministic confidence formula and thresholds.
- Claim generation rules for provider, invocation, output, downstream action, automation, human review, prompt, personal data, training, RAG and document generation.
- Abstention rules for provider-only, dynamic, unsupported, missing evidence and missing source conditions.
- Conflict generation rules for WizardProfile / TechnicalProfile / AIUsageFlow mismatches.
- Reconciliation handoff.
- A worked loan approval example.

## Legal Matching Behavior Locked

`docs/specs/legal-matching-domain-spec.md` now defines:

- Inputs: VerifiedProfile, Legal Corpus, Legal Rule and Citation.
- Outputs: LegalRuleMatch, CitationCoverage and LegalMatchingResult.
- Legal matching workflow from VerifiedProfile loading to classification handoff.
- Rule applicability model for required, optional, blocking and unknown facts.
- Citation requirements: NO_CITATION, PARTIAL_CITATION and COMPLETE_CITATION.
- Deterministic match confidence formula.
- Coverage calculation and citation gap handling.
- Failure modes and classification handoff.
- A worked loan approval legal matching example.

## Domain State Machines Locked

`docs/specs/domain-state-machines.md` now defines state behavior for:

- Assessment.
- ScanJob.
- TechnicalEvidenceReport.
- TechnicalProfile.
- AIUsageFlow.
- Conflict.
- VerifiedProfile.
- LegalRuleMatch.
- ClassificationResult.
- GeneratedDocument.

Each state machine includes states, transition table, invalid transitions, failure transitions, recovery transitions, event mapping and example journey.

## Cross-Document Consistency

| Rule | Result |
|---|---|
| No new actors | Passed. Existing Manager, Developer and System roles only. |
| No new capabilities | Passed. Existing capabilities from `business-capability-map.md` only. |
| No new queues | Passed. Canonical `command.*` and `event.*` names only. |
| No alternate lifecycle for assessment | Passed. Assessment state sequence follows active system context and persistence enum. |
| No provider/model/framework-only legal risk | Passed. Repeated in AIUsageFlow and Legal Matching behavior. |
| No classification before VerifiedProfile and LegalRuleMatch | Passed. Locked in Legal Matching and State Machines. |
| No final output without citation traceability | Passed. Locked in Legal Matching and GeneratedDocument state machine. |

## Adversarial Review

### Can a developer implement AIUsageFlowWorker without inventing business behavior?

Yes. Required inputs, outputs, claim taxonomy, rule behavior, confidence calculation, abstention, conflicts, lifecycle and reconciliation handoff are defined. Implementation choices such as class/file structure remain intentionally outside this domain spec and belong to implementation docs.

### Can a developer implement LegalMatchingWorker without inventing business behavior?

Yes. VerifiedProfile fact extraction boundary, candidate rule evaluation, required/optional/blocking/unknown fact behavior, citation statuses, confidence, coverage, failure modes and classification handoff are defined.

### Can a developer implement ClassificationWorker without inventing business behavior?

Yes for domain gating and prerequisites. ClassificationWorker must consume only after `event.legal-matching.completed.v1`, must evaluate VerifiedProfile plus LegalRuleMatch, and must block on unresolved conflict, missing citation, unknown critical usage or provider-only basis. Detailed risk-level scoring remains governed by `docs/specs/legal-classification-spec.md` and future implementation docs, but no behavior gate is missing.

### Can a developer explain every state transition without opening implementation docs?

Yes. `docs/specs/domain-state-machines.md` maps all required domain state transitions to current states, triggers, guards, actions, next states, invalid transitions, failure transitions, recovery transitions and canonical events.

## Remaining Non-Blocking Notes

- Legal corpus content, real citations and legal rule records remain outside this phase and must come from approved corpus artifacts.
- Physical Prisma schema remains authoritative in `docs/implementation/persistence-implementation.md`.
- Queue topology remains authoritative in `docs/implementation/queue-implementation.md`.
- These specs do not claim formal legal reliability validation, compliance certification or production readiness.

## Final Decision

DOMAIN_BEHAVIOR_SPECIFICATION_COMPLETED

AI_USAGE_FLOW_DOMAIN_BEHAVIOR_LOCKED

LEGAL_MATCHING_DOMAIN_BEHAVIOR_LOCKED

DOMAIN_STATE_MACHINES_LOCKED

NO_CRITICAL_BEHAVIOR_QUESTIONS_REMAIN

DEVELOPER_IMPLEMENTABLE_DOMAIN_ACHIEVED

NO_APPLICATION_CODE_CREATED
