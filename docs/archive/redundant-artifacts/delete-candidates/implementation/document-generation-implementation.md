# Document Generation Implementation

## Purpose

Define implementation guidance for generating LCSP compliance documents and readiness-only outputs.

## Scope

Document generation runs only after the final report gate passes. It maps approved assessment results, citations, gaps and evidence summaries into controlled templates.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Legal Rule Citation Contract](../specs/legal-rule-citation-contract.md)
- [API and Async Event Contracts](api-and-async-event-contracts.md)

## Implementation Boundaries

Document generation is asynchronous through Queue + Worker + Orchestrator. It must not create final compliance output when prerequisites are missing.

## Final Report Gate

Document generation is allowed only when:

- `VerifiedProfile` exists.
- No unresolved conflict exists.
- Risk classification is valid.
- Required citations exist.
- Gap analysis is available.
- Output Guardrail passes.

## Input Contract

| Input | Required |
| --- | ---: |
| Assessment id and workflow run id | Yes |
| VerifiedProfile snapshot/version | Yes |
| RiskClassificationResult with citations | Yes |
| GapAnalysisResult | Yes |
| Legal corpus version and citation refs | Yes |
| Audit refs and evidence appendix refs | Yes |
| Template id/version | Yes |

## Template and Data Mapping

| Section | Source |
| --- | --- |
| Assessment summary | Assessment + WizardProfile + VerifiedProfile |
| Technical basis | TechnicalProfile + TechnicalEvidenceReport metadata |
| AI usage purpose | AIUsageFlow claims |
| Legal basis | Legal rules and citations |
| Risk classification | RiskClassificationResult |
| Compliance gaps | GapAnalysisResult |
| Evidence appendix | Evidence refs, report hash, scanner version |
| Limitations | Uncertainty, coverage limits, blocked/degraded notes |

## Citation Rendering

Each legal conclusion in the generated document must include citation metadata or be omitted/degraded according to guardrail policy. Generated prose must not imply official legal advice.

## Object Storage Metadata

Persist generated artifact metadata such as document id, assessment id, template version, document hash, storage ref, created by workflow run, corpus version, classification run id and retention policy.

## Versioning and Regeneration

Regenerate a new document version when VerifiedProfile, classification, gaps, template, corpus version or citations change. Do not mutate prior generated documents silently.

## State / Error / Failure Handling

| Failure | Behavior |
| --- | --- |
| Missing VerifiedProfile | Block document generation |
| Unresolved conflict | Block final report |
| Missing citation | Block/degrade output |
| Object storage failure | Mark generation failed and allow retry |
| Output guardrail fail | Block final output and audit |

## Security and Privacy Considerations

Generated documents must not include raw source, secrets, full prompts or internal model prompts. Evidence appendix uses refs, hashes and summaries.

## Audit Requirements

Audit document requested, blocked, generated, failed, regenerated, downloaded and storage artifact hash.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Final template set | Template selection/versioning required | Implementation |
| Readiness-only export content | Allowed when final report blocked | Implementation/product validation |

