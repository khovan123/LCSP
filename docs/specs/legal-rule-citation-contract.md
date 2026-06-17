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

## Degraded / Blocked Behavior

| Condition | Behavior |
| --- | --- |
| Non-critical citation missing | Degrade output and flag review |
| Critical rule citation missing | Block final classification |
| Rule exists but version unknown | Degrade or block depending criticality |
| LLM proposes unsupported legal conclusion | Reject output and require retrieved rule/citation |

## No Unsupported Legal Conclusion Rule

LLM must not create legal conclusions unless grounded in retrieved legal rule/citation. Hard rules take precedence over LLM interpretation.
