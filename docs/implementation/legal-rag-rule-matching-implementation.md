# Legal RAG and Rule Matching Implementation

## Purpose

Define implementation guidance for legal corpus retrieval, rule matching, citation traceability and legal guardrails.

## Scope

Legal Rule Matching uses `VerifiedProfile + AIUsageFlow + legal corpus version` to retrieve applicable rules and citations. It must not classify legal risk from AI provider/model/framework presence alone.

## Dependencies / Source References

- [AI Usage Rule Mapping Spec](../specs/ai-usage-rule-mapping-spec.md)
- [Legal Rule Citation Contract](../specs/legal-rule-citation-contract.md)
- [Scoring Model](../specs/scoring-model.md)

## Implementation Boundaries

- Legal RAG retrieves and grounds; it does not bypass citation requirements.
- Risk classification requires `VerifiedProfile`.
- Claims without evidence refs cannot drive legal rule matching or final classification.
- Missing citation blocks or degrades legal output according to policy.

## Corpus Lifecycle

| Stage | Contract |
| --- | --- |
| Ingestion | Legal source metadata, jurisdiction, version, effective date and provenance recorded |
| Chunking | Chunks retain document/version/rule/citation refs |
| Rule extraction | `LegalRule` records map obligations/risk criteria to corpus refs |
| Approval | Corpus/rule version must be approved before active use |
| Pinning | Each classification pins corpus version and retrieved citation refs |
| Update | New corpus version does not silently change past results |

## Rule Matching Inputs

| Input | Use |
| --- | --- |
| `business_process` | Domain/legal context |
| `ai_purpose` | Assistive, chatbot, scoring, ranking, decision support or automated decision |
| `ai_input_types` | Personal/sensitive/data-category obligations |
| `ai_output_types` | Risk and transparency implications |
| `downstream_action` | User impact and decision consequence |
| `automation_level` | Oversight/automated decision analysis |
| `affected_subjects` | Rights and impacted party analysis |
| `human_review` | Oversight mitigation or risk factor |
| `potential_harm_categories` | Harm-focused rule retrieval |
| `evidence_refs` | Traceability and legal eligibility |

## Retrieval Query Construction

Construct retrieval context from normalized labels and evidence-backed claims only. Include corpus version, jurisdiction/context filters where available, AIUsageFlow claim ids and VerifiedProfile snapshot id. Do not include raw source code or full prompts.

## Citation Requirement

Each legal conclusion must trace to:

- legal document/version;
- rule id or chunk id;
- citation text/reference metadata;
- retrieval run id;
- classification run id;
- evidence-backed profile/AIUsageFlow claims.

## Missing Citation Behavior

| Condition | Behavior |
| --- | --- |
| No applicable citation found | Block or degrade legal conclusion |
| Citation invalid/unversioned | Block output and audit |
| Evidence claim lacks refs | Exclude from legal matching |
| Usage purpose unclear | Block final classification or request Manager clarification |

## RAG Evaluation Fixtures

Use A2/A2-b fixtures for internal summarization, loan approval, HR ranking, customer chatbot, human-reviewed decision, auto-approve, provider-only signal and unresolved downstream path.

## Corpus Poisoning and Provenance Controls

- Only approved corpus versions are active.
- Store source provenance and ingestion hash.
- Separate admin/legal update workflow remains Future/Enterprise unless otherwise activated.
- Audit corpus version used for every classification.

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| VerifiedProfile | Retrieval context |
| AIUsageFlow claim set | Rule family candidates |
| Legal corpus version | Retrieved rules/citations |
| Citation guardrail result | Allowed/degraded/blocked classification basis |

## Security and Privacy Considerations

Legal RAG must not receive raw source, secrets or full prompts. Use claim labels, evidence ids and profile metadata.

## Audit Requirements

Audit retrieval query metadata, corpus version, retrieved rule ids, citation validation, missing citation and classification block/degrade decision.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Legal corpus inventory and rule coverage | Versioned corpus required; A2 validation pending | Implementation/backlog unblock |
| Production vector database configuration | Vector store behind Legal RAG boundary | Implementation configuration |

