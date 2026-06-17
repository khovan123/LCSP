# AI Usage Rule Mapping Specification

## Purpose

Tài liệu này mô tả cách `AIUsageFlow` được dùng để retrieve/match legal rule/corpus cho LCSP. Đây là specification ở mức design, không phải implementation code hoặc final rule engine.

Mục tiêu là đảm bảo Risk Classification dựa trên usage purpose và legal citation, không dựa trên việc repository có provider/model/framework AI.

## Why Rule Matching Needs AIUsageFlow

Legal Rule Matching cần biết AI được dùng vào việc gì trong business flow:

- Internal summarization có rule applicability khác loan approval.
- Customer chatbot có rule applicability khác automated decision.
- HR ranking có affected subject, harm potential và oversight requirements khác content generation.
- Model/provider presence là technical signal, không phải legal applicability criterion đầy đủ.

Do đó, Legal Rule Matching phải nhận `VerifiedProfile + AIUsageFlow + legal corpus version` làm input chính.

## Mapping Inputs

| AIUsageFlow Field | Purpose |
| --- | --- |
| `business_process` | xác định lĩnh vực/ngữ cảnh |
| `ai_purpose` | xác định AI làm tác vụ gì |
| `automation_level` | xác định mức tự động |
| `affected_subjects` | xác định ai bị ảnh hưởng |
| `ai_input_types` | xác định dữ liệu đầu vào |
| `ai_output_types` | xác định output |
| `downstream_action` | xác định tác động |
| `human_review` | xác định oversight |
| `potential_harm_categories` | xác định harm |
| `evidence_refs` | traceability |
| `claim_evidence` | claim-level value/confidence/evidence_refs/source_type |

Additional inputs:

| Input | Purpose |
| --- | --- |
| `WizardProfile` via VerifiedProfile | Manager-declared business/legal truth |
| `TechnicalProfile` via VerifiedProfile | Accepted technical facts |
| `Legal corpus version` | Rule/citation reproducibility |
| `jurisdiction` if available | Scope filtering |
| `sector` if available | Rule family filtering |

## Rule Family Mapping

Rule family is a routing category for legal retrieval. It is not itself a legal conclusion.

| Usage Pattern | Candidate Rule Family |
| --- | --- |
| Internal summarization / internal assistant | internal AI governance, data handling, transparency if applicable |
| Customer-facing chatbot | user-facing AI transparency, consumer communication, data handling |
| Loan approval / credit scoring | automated/AI-assisted decision, financial service, affected person, oversight/documentation |
| HR screening / candidate ranking | employment/recruitment, discrimination risk, human oversight, transparency |
| Healthcare triage / medical summary | healthcare/safety, sensitive data, clinical oversight |
| Student grading / education ranking | education, affected student rights, oversight |
| Public service eligibility | public service, citizen rights, denial of service, high-impact decision |
| Content generation | content governance, misinformation, IP/disclosure if applicable |
| RAG legal/compliance decision support | legal advice/decision support, citation trace, professional review |

No rule family may be selected solely from provider/model/framework presence.

## Retrieval Query Construction

Legal retrieval query should be structured and auditable.

Query context should include:

```text
business_process
ai_purpose
automation_level
affected_subjects
ai_input_types
ai_output_types
downstream_action
human_review
potential_harm_categories
sector
jurisdiction if available
legal corpus version
```

Query should also include evidence refs as metadata, not raw source:

```text
evidence_refs=[finding_ai_decision_flow_002, finding_sensitive_data_004]
```

Eligibility rule:

- Scanner-derived claim must have claim-level `evidence_refs[]`.
- Manager-declared claim may supplement business context but must be distinguishable from scanner-derived evidence.
- Reconciled claim must preserve source refs used to resolve scanner/Wizard mismatch.
- Claim without evidence refs cannot be used to select legal rule family or final classification rule.

Retrieval output must include:

```text
rule_id
legal_source
citation
version
effective_date if applicable
rule_family
applicability_reason
retrieval_confidence
```

## Required Citation Fields

Every selected rule used for final classification must include:

| Field | Required |
| --- | ---: |
| `rule_id` | Yes |
| `legal_source` | Yes |
| `citation` | Yes for critical rule |
| `version` | Yes |
| `effective_date` | Required if available |
| `rule_family` | Yes |
| `applicability_reason` | Yes |
| `ai_usage_flow_refs` | Yes |

If required citation is missing:

```text
Critical rule missing -> classification blocked.
Non-critical support missing -> output degraded with explicit limitation.
```

## Uncertainty Handling

Uncertainty rule:

```text
If usage purpose is unclear, final classification must be blocked or marked as insufficient basis.
```

Do not overclaim.

Uncertainty cases:

| Condition | Required behavior |
| --- | --- |
| `business_process=unknown` and cannot infer from WizardProfile | Block/degrade classification or route to Manager confirmation |
| `downstream_action=unknown` for potential decision flow | Route to Developer/Manager confirmation |
| `human_review=unclear` in decision-impact context | Retrieve oversight rules cautiously; final classification may be blocked/degraded |
| Missing evidence refs for usage-purpose claim | Claim cannot be used for rule matching |
| Conflicting WizardProfile and AIUsageFlow | Reconciliation conflict; classification locked |

## Examples

### Example 1 - Internal Summarization

```text
AI purpose: summarization
Business process: internal productivity
Affected subjects: internal staff
Downstream action: display_to_user
Human review: present/irrelevant
```

Expected:

```text
Do not classify high-risk only because model/provider exists.
Retrieve low-impact/general AI governance obligations if applicable.
```

Candidate rule family:

```text
internal_ai_governance
data_handling
transparency_if_user_facing
```

### Example 2 - Loan Approval

```text
AI purpose: scoring
Business process: loan_approval
Affected subjects: customer
Downstream action: approve_reject
Data types: financial_data, personal_data
Human review: absent or unclear
```

Expected:

```text
Retrieve rules related to automated decision,
financial service,
affected person,
high-impact AI,
documentation/oversight obligations.
```

Candidate rule family:

```text
automated_decision
financial_service
affected_person_rights
human_oversight
documentation_obligation
```

### Example 3 - HR Screening

```text
AI purpose: ranking
Business process: recruitment
Affected subjects: candidate
Downstream action: rank
Data types: employment_data, personal_data
Human review: unclear
```

Expected:

```text
Retrieve rules related to employment/recruitment decision support,
discrimination risk,
human oversight,
transparency obligations.
```

Candidate rule family:

```text
employment_recruitment
high_impact_decision_support
discrimination_risk
human_oversight
transparency
```

### Example 4 - Customer Chatbot

```text
AI purpose: chatbot
Business process: customer_support
Affected subjects: customer
Downstream action: display_to_user
Human review: unclear
```

Expected:

```text
Do not automatically classify as high-risk unless chatbot gives decisions/advice in protected/high-impact domain.
Retrieve transparency/user-facing AI obligations if applicable.
```

Candidate rule family:

```text
user_facing_ai_transparency
customer_communication
data_handling
```

## Acceptance Criteria

- Legal Rule Matching receives `AIUsageFlow` as required input.
- Rule matching uses `business_process`, `ai_purpose`, `automation_level`, `affected_subjects`, `ai_input_types`, `ai_output_types`, `downstream_action`, `human_review` and `potential_harm_categories`.
- Provider/model/framework presence alone cannot select high-impact or automated-decision rule family.
- Every critical rule used in classification has `rule_id`, legal source, citation, version and AIUsageFlow refs.
- Internal summarization does not map to automated decision unless downstream decision evidence exists.
- Loan approval and HR ranking map to expected rule families when AIUsageFlow evidence supports them.
- Customer chatbot without decision path does not map to automated-decision rules by default.
- Unclear usage purpose blocks/degrades final classification or routes to confirmation.
- Missing critical citation blocks final classification.
