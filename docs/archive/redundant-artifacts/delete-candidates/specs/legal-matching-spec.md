# Legal Matching Spec

## Status

AUTHORITATIVE

## Merged From

- `docs/specs/legal-rule-citation-contract.md`

## Purpose

Single source of truth for legal retrieval, rule matching, citation traceability, and citation guardrails.

---

# Legal Rule and Citation Contract

## Purpose

Defines legal rule/citation requirements for evidence-based Risk Classification. This is a contract draft, not a final rule engine design.

A2 validation may change rule schema, citation format or degraded/blocked behavior.

## LegalRule Format

| Field | Purpose |
| --- | --- |
| rule_id | Stable identifier for traceability |
| title | Human-readable rule name |
| condition | Applicability criteria |
| outcome | Risk/obligation effect |
| legal_source | Source document reference |
| citation | Article/section/clause reference |
| version | Legal corpus/rule version |
| effective_date | Effective date if applicable |
| jurisdiction | Legal scope |
| rule_type | hard_rule, advisory, obligation |

## LegalCitation Format

| Field | Purpose |
| --- | --- |
| citation_id | Stable citation id |
| legal_source | Legal document/source |
| location | Article/section/clause/point |
| version | Source version |
| effective_date | Effective date if applicable |
| text_summary | Short summary, not full legal text |

## Classification Mapping

Risk output must trace:

```text
risk output -> rule_id -> legal source/citation -> legal document version -> assessment audit
```

## Rule Applicability

Rule applicability may depend on:

- purpose
- sector
- data_type
- user_group
- user_impact
- decision_role
- human_oversight
- external_llm_usage
- biometric_or_high_impact_use
- technical evidence findings
- AIUsageFlow.business_process
- AIUsageFlow.ai_purpose
- AIUsageFlow.automation_level
- AIUsageFlow.affected_subjects
- AIUsageFlow.ai_input_types
- AIUsageFlow.human_review
- AIUsageFlow.potential_harm_categories

## AI Usage Flow for Rule Matching

Legal RAG / Rule Matching must not rely only on model/provider/framework presence.

Incorrect:

```text
Repo has OpenAI API -> high risk
```

Correct:

```text
Repo has OpenAI API
+ AI used in loan approval
+ AI output creates a risk score
+ score is used to approve/reject customer
+ financial/personal data is processed
-> retrieve legal rules for automated decision, high-impact use, financial service and affected person protections
```

| AI Usage Flow Field | Legal Rule Matching Purpose |
| --- | --- |
| `business_process` | Xác định lĩnh vực áp dụng luật |
| `ai_purpose` | Xác định AI là assistive, recommendation, scoring hay decision |
| `automation_level` | Xác định mức tự động hóa |
| `affected_subjects` | Xác định ai bị ảnh hưởng |
| `ai_input_types` / data types | Xác định dữ liệu cá nhân/nhạy cảm |
| `human_review` | Xác định giảm/không giảm rủi ro |
| `potential_harm_categories` | Xác định rule/corpus về nguy hại |

## Degraded / Blocked Behavior

| Condition | Behavior |
| --- | --- |
| Non-critical citation missing | Degrade output and flag review |
| Critical rule citation missing | Block final classification |
| Rule exists but version unknown | Degrade or block depending criticality |
| LLM proposes unsupported legal conclusion | Reject output and require retrieved rule/citation |

## No Unsupported Legal Conclusion Rule

LLM must not create legal conclusions unless grounded in retrieved legal rule/citation. Hard rules take precedence over LLM interpretation.

Risk Classification output must cite legal rules selected from VerifiedProfile + AIUsageFlow context. If usage purpose is unclear or conflicts with WizardProfile, classification remains blocked until reconciliation resolves the uncertainty.
