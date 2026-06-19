# LCSP Validation Execution Plan

## Purpose

Tài liệu này biến `validation-plan.md` thành kế hoạch kiểm chứng thực tế cho ba assumption rủi ro cao A1-A3 trước khi LCSP được phép chuyển sang implementation backlog.

Mục tiêu:

- Xác định validation nào chạy trước.
- Xác định ai thực hiện và ai review.
- Chuẩn bị scenario/test case cần dùng.
- Chuẩn hóa cách ghi kết quả validation.
- Định nghĩa acceptance threshold cụ thể.
- Ghi rõ fail thì phải cập nhật PRD, Architecture hoặc ADR như thế nào.
- Ghi rõ điều kiện duy nhất để unblock backlog.

Tài liệu này không tạo backlog, không tạo implementation task, không viết code và không giả định A1-A3 đã pass.

## Input Documents

| Document | Vai trò |
| --- | --- |
| `docs/product/validation-plan.md` | Nguồn chính cho owner, method, threshold của A1-A3 |
| `docs/product/prd.md` | Conditional PRD và functional requirements cần validate |
| `docs/product/product-brief.md` | Product positioning và quyết định nền |
| `docs/architecture/architecture-review-checklist.md` | Hiện trạng readiness: ready for architecture review, blocked for backlog |
| `docs/architecture/architecture.md` | Conditional architecture và dependency A1-A3 |
| `LCSP_Technical_Specification.html` | Technical baseline: Wizard, scanner, RAG, LangGraph, no raw source to LLM |

## Validation Objectives

| Assumption | Objective | Why it matters |
| --- | --- | --- |
| A1 - Wizard simplicity vs completeness | Kiểm chứng Manager hiểu và hoàn tất Wizard mà không cần Developer, đồng thời WizardProfile đủ field cho Reconciliation và Risk Classification | Nếu WizardProfile sai hoặc thiếu, toàn pipeline downstream bị lệch |
| A2 - Legal corpus / rule reliability | Kiểm chứng legal rules có source/citation/version, risk output trace được về rule_id, và scanner + AIUsageFlow map đúng usage purpose sang legal rule/corpus | Nếu rule/citation yếu hoặc usage-purpose mapping sai, classification không có căn cứ pháp lý |
| A3 - Human attestation abuse risk | Kiểm chứng attestation không biến thành bypass cho scanner/evidence | Nếu attestation bị lạm dụng, LCSP mất định vị evidence-based |

## Execution Order

| Order | Validation | Reason | Can run in parallel? |
| ---: | --- | --- | --- |
| 1 | A1 Wizard scenario walkthrough and user test | A1 quyết định WizardProfile fields, ảnh hưởng evidence threshold và reconciliation input | No, should start first |
| 2 | A2 legal rule inventory and trace test | A2 có thể chuẩn bị song song sau khi có scenario set từ A1 | Yes, with A1 scenarios as fixtures |
| 3 | A3 attestation abuse test | A3 cần dùng conflict/evidence examples từ A1/A2 để test đúng abuse surface | Partially |
| 4 | Cross-assumption review | Kiểm tra A1-A3 có tạo thay đổi PRD/Architecture/ADR không | No |
| 5 | Backlog unblock decision | Chỉ sau khi A1-A3 có result và update cần thiết đã hoàn tất | No |

Recommended execution sequence:

```text
Prepare scenarios
-> Run A1 Wizard validation
-> Run A2 rule/citation trace validation
-> Run A3 attestation abuse validation
-> Record results
-> Update PRD/Architecture/ADR if needed
-> Decide backlog unblock
```

## Roles & Responsibilities

| Role | Responsibility |
| --- | --- |
| Product Manager | Owns validation execution, result recording, PRD update decision |
| UX / Domain Reviewer | Reviews Wizard language, comprehension, progressive disclosure and Manager usability |
| Legal / Domain Rule Owner | Reviews legal rule source, citation, version and rule trace |
| Governance / Compliance Reviewer | Reviews attestation abuse cases and audit/disclosure requirements |
| Architect | Reviews whether validation result changes architecture or ADR |
| Manager-like test participant | Attempts Wizard scenarios without Developer explanation |
| Developer-like reviewer | Reviews technical truth boundaries and attestation claim restrictions |

Decision authority:

| Decision | Owner |
| --- | --- |
| A1 pass/fail | Product Manager, with UX/Domain Reviewer input |
| A2 pass/fail | Product Manager, with Legal/Domain Rule Owner input |
| A3 pass/fail | Product Manager, with Governance Reviewer input |
| PRD update required | Product Manager |
| Architecture/ADR revisit required | Architect |
| Backlog unblock | Product Manager + Architect jointly |

## A1 Execution Plan — Wizard Simplicity vs Completeness

### Why A1 is high risk

Manager is LCSP's entry point. If Wizard asks technical questions, Manager will stall or depend on Developer too early. If Wizard is too shallow, WizardProfile will miss business/legal truth needed by Reconciliation, VerifiedProfile and Risk Classification.

### Data to validate

| Data | Required |
| --- | --- |
| Draft Wizard questions | Yes |
| WizardProfile field mapping | Yes |
| Critical field checklist | Yes |
| Scenario answers | Yes |
| Participant comprehension notes | Yes |
| Fields requiring Developer help | Yes |

Critical fields that must be captured:

```text
purpose
sector
data_type
user_group
user_impact
decision_role
human_oversight
external_llm_usage
biometric_or_high_impact_use
```

### Method

1. Review every Wizard question for Manager-friendly language.
2. Map every important question to one or more WizardProfile fields.
3. Run scenario walkthrough with Product Manager and UX/Domain Reviewer.
4. Run user test with 2-3 Manager-like participants who are not expected to understand source code.
5. Record confusion points, fields marked unknown, and where Developer explanation was needed.
6. Decide whether PRD must change Wizard scope, wording, progressive disclosure, field model or readiness behavior.

### A1 Test Scenarios

#### Scenario A1-S1 — Internal AI Chatbot

| Field | Detail |
| --- | --- |
| Scenario description | Internal employee chatbot uses an LLM to answer HR/policy questions from company documents. It is not customer-facing and does not approve/reject requests. |
| Expected critical fields | purpose, sector, user group, data type, external LLM usage, human oversight, decision role |
| Wizard questions to test | What is the system used for? Who uses it? Does it process employee/customer data? Does AI output trigger a decision? Is there human review? Is an external LLM used? |
| Pass criteria | Manager identifies internal assistant purpose, low/no decision role, internal users, external LLM usage if applicable, and data type without Developer help |
| Fail criteria | Manager cannot distinguish assistant output from business decision; external LLM or data type not captured; question uses code/vendor terms without explanation |
| PRD update notes if fail | Add examples for assistant vs decision-making system; adjust WizardProfile fields for user-facing/internal distinction; improve progressive disclosure |

#### Scenario A1-S2 — Credit Scoring / Loan Approval

| Field | Detail |
| --- | --- |
| Scenario description | AI model produces a risk score used in loan approval workflow. Loan officer may review the result before final approval. |
| Expected critical fields | purpose, sector, data type, affected rights/benefits, decision role, human oversight, user impact, sensitive/personal data |
| Wizard questions to test | Does the AI output affect approval/rejection? What data is used? Who is affected? Is human review mandatory? Can human override AI recommendation? |
| Pass criteria | Manager captures finance sector, loan approval impact, personal/financial data, AI-assisted or automated decision role, human oversight status |
| Fail criteria | Manager answers only “analytics” without capturing approval impact; human review ambiguity not captured; data type too vague |
| PRD update notes if fail | Add targeted follow-up questions for finance/credit workflows; require explicit decision_role and human_oversight fields |

#### Scenario A1-S3 — HR Screening / Recruitment AI

| Field | Detail |
| --- | --- |
| Scenario description | AI ranks applicants or filters CVs for recruiter review. Recruiter may decide who moves to interview. |
| Expected critical fields | purpose, sector/domain, user impact, data type, decision role, human oversight, affected group |
| Wizard questions to test | Does AI rank, filter or recommend candidates? Does a human review all rejected candidates? What personal data is used? Can the AI output affect employment opportunity? |
| Pass criteria | Manager captures recruitment impact, candidate data, AI ranking/filtering role and human review process |
| Fail criteria | Manager treats ranking as harmless recommendation without capturing applicant impact; human oversight unclear; sensitive data not captured |
| PRD update notes if fail | Add examples for “recommendation that affects opportunity”; add mandatory human oversight clarification for HR workflows |

### A1 Acceptance Threshold

| Threshold | Required |
| --- | --- |
| Manager comprehension | 100% critical questions understood without Developer explanation in scenario walkthrough |
| Critical field coverage | 100% listed critical fields captured or explicitly marked unknown |
| Question mapping | 100% important Wizard questions map to WizardProfile fields |
| Technical language | 0 critical questions rely on code/scanner terminology without plain-language explanation |
| Unknown handling | Unknown critical fields must not become final classification input |

### A1 Failure Conditions

- Manager cannot answer critical questions without Developer explanation.
- Wizard misses purpose, sector, data type, user group, user impact, decision role, human oversight or external LLM usage.
- Important question cannot map to WizardProfile.
- Wizard uses technical implementation terms as the primary wording.
- Unknown critical fields are treated as final facts.

## A2 Execution Plan — Legal Corpus / Rule Reliability

### Why A2 is high risk

LCSP cannot claim evidence-based classification if classification is based on LLM inference without versioned legal rules and citations. Technical evidence can be strong while legal conclusion remains weak.

### Data to validate

| Data | Required |
| --- | --- |
| Legal source inventory | Yes |
| Rule inventory | Yes |
| `rule_id` for each critical rule | Yes |
| Legal document version/effective date where applicable | Yes |
| Citation mapping | Yes |
| AIUsageFlow fixtures and expected labels | Yes |
| Expected usage-purpose to legal-rule mapping | Yes |
| Expected risk output per sample | Yes |
| Degraded/blocked behavior when rule missing | Yes |

### Method

1. Build a small rule inventory for the validation samples.
2. For each rule, record legal source, citation, version/effective date if available and `rule_id`.
3. Run trace test from expected risk output to `rule_id`.
4. Run reverse trace from `rule_id` to legal source/citation/version.
5. Check whether any sample would require unsupported legal inference.
6. Record degraded/blocked behavior when required rule/citation is missing.
7. Run A2-b usage-purpose mapping test: compare scanner + AIUsageFlow output against expected business process, AI purpose, automation level, affected subjects and expected legal rule family/corpus.
8. Verify unclear usage purpose is marked uncertain and blocks/degrades classification or routes to confirmation.

### A2 Validation Samples

#### Sample A2-S1 — Low-risk / Internal Assistant

| Field | Detail |
| --- | --- |
| Scenario | Internal AI assistant answers employee policy questions and does not make decisions |
| Expected legal rule mapping | Rules covering AI usage disclosure, data handling, internal use, non-decision support if applicable |
| Required citation | Legal source/citation for relevant low-risk or obligation criteria |
| Rule trace requirement | `risk_output -> rule_id -> legal source/citation -> corpus version` |
| Pass criteria | Every classification reason maps to rule_id and citation; no unsupported legal conclusion |
| Fail criteria | Output says low risk without cited criteria; LLM fills missing rule by inference |
| Degraded/blocked behavior | If low-risk criteria missing, output cannot be final; mark classification degraded or blocked |
| A2-b usage-flow expectation | AIUsageFlow identifies internal assistant/summarization or non-decision support; must not map to automated decision/high-impact rule solely because AI provider is present |

#### Sample A2-S2 — AI-assisted Decision

| Field | Detail |
| --- | --- |
| Scenario | AI score or recommendation influences a business decision, but human review is claimed |
| Expected legal rule mapping | Rules for AI-assisted decision, human oversight, affected rights/benefits, accountability |
| Required citation | Citation for decision-impact criteria and human oversight requirement |
| Rule trace requirement | Each decision-role conclusion traces to `rule_id` and legal source |
| Pass criteria | Classification explains why decision impact matters and cites rule_id/source |
| Fail criteria | Output relies on generic legal reasoning without retrieved rule; human oversight lowers risk without hard-rule check |
| Degraded/blocked behavior | If human oversight rule/citation missing, classification cannot be final |
| A2-b usage-flow expectation | AIUsageFlow detects decision_support or AI-assisted decision, downstream recommendation/action, affected subject and human review status; maps to decision-impact and oversight rule family |

#### Sample A2-S3 — High-impact or Sensitive Data

| Field | Detail |
| --- | --- |
| Scenario | AI system uses sensitive/personal/financial or employment-related data in high-impact workflow |
| Expected legal rule mapping | Rules for sensitive data, high-impact sector/use case, decision rights, required controls |
| Required citation | Citation for high-impact/sensitive data criteria and obligations |
| Rule trace requirement | Risk result and each obligation maps to rule_id |
| Pass criteria | 100% critical rules have source/citation/version and risk output trace |
| Fail criteria | Missing citation for high-impact determination; LLM creates obligation not present in rule inventory |
| Degraded/blocked behavior | Missing high-impact rule must block final classification |
| A2-b usage-flow expectation | AIUsageFlow identifies sensitive/high-impact domain, affected subjects, data types and potential harm categories; maps to high-impact/sensitive-data rule family |

### A2-b Execution Plan — Scanner + AI Usage Flow Mapping Accuracy

Objective:

```text
Validate whether scanner + AI Usage Flow Analysis can accurately map AI usage purpose to the correct legal rule/corpus.
```

Test fixtures:

| Fixture | Expected AIUsageFlow | Expected legal rule/corpus mapping |
| --- | --- | --- |
| Internal summarization / internal assistant | `ai_purpose=summarization` or `chatbot`, `automation_level=assistive`, internal affected subjects, no approve/reject action | Internal/non-decision support rules; no automated decision/high-impact mapping from provider presence alone |
| Loan approval / credit scoring | `ai_purpose=scoring` or `decision_support`, downstream approve/reject or risk score, customer affected, financial/personal data | Automated/AI-assisted decision, financial service, affected-person and human oversight rules |
| HR screening / recruitment ranking | `ai_purpose=ranking` or `classification`, candidate/employee affected, employment opportunity impact | Employment/recruitment, high-impact, human oversight and discrimination-risk rules |
| Customer-facing chatbot without decision | `ai_purpose=chatbot`, customer affected, no approve/reject/ranking action, human escalation if present | Customer communication/data handling rules, not automated decision rules unless downstream action exists |

Execution steps:

1. Prepare repository/evidence fixtures or structured scanner output representing each fixture.
2. Run or simulate scanner findings for AI usage-flow signals.
3. Derive AIUsageFlow with evidence refs and confidence.
4. Run Legal Rule Matching using AIUsageFlow fields.
5. Compare selected legal rule family/corpus against expected mapping.
6. Record false positive, false negative and unclear cases.
7. Verify uncertain cases do not produce final classification.

A2-b acceptance threshold:

| Threshold | Required |
| --- | --- |
| High-impact mapping | 100% high-impact fixtures map to correct rule family/corpus or block as uncertain |
| Provider-only false positive | 0 internal-assistant/summarization cases mapped to automated-decision/high-impact rules only because provider/framework exists |
| Evidence trace | 100% usage-purpose claims used for rule matching have evidence_refs |
| Uncertainty handling | 100% unclear usage-purpose cases are marked uncertain and routed to confirmation or blocked/degraded |
| Rule matching inputs | 100% rule matching decisions use AIUsageFlow fields, not only model/provider/dependency |

A2-b failure conditions:

- Internal summarization is mapped to high-impact/automated-decision rule family without evidence.
- Loan approval, credit scoring, HR ranking or other impact workflow is mapped as generic internal assistant.
- Rule matching ignores `business_process`, `ai_purpose`, `automation_level`, `affected_subjects`, `data_types`, `human_review` or `potential_harm_categories`.
- AIUsageFlow critical claim lacks evidence refs.
- Unclear usage purpose still produces final classification.

### A2 Acceptance Threshold

| Threshold | Required |
| --- | --- |
| Critical rule source | 100% critical classification rules have legal source |
| Citation | 100% critical classification rules have citation |
| Versioning | 100% critical rules have corpus/rule version and effective date if applicable |
| Rule trace | 100% risk outputs in validation samples trace to `rule_id` |
| Reverse trace | 100% `rule_id` trace to legal source/citation/version |
| LLM guardrail | 0 final legal conclusions without retrieved legal rule/citation |
| Missing citation behavior | 100% missing critical citation cases are degraded or blocked, not final |
| A2-b usage-purpose mapping | 100% high-impact fixtures map correctly or block as uncertain; 0 provider/model-only mappings accepted |

### A2 Failure Conditions

- Critical rule lacks source, citation, version or `rule_id`.
- Risk output cannot trace to `rule_id`.
- Rule cannot trace back to legal document/version.
- LLM creates legal conclusion without retrieved legal rule/citation.
- Final classification is produced despite missing critical citation.
- Scanner + AIUsageFlow maps usage purpose to wrong legal rule/corpus without blocking.
- Classification relies on model/provider/dependency presence instead of AIUsageFlow fields.

## A3 Execution Plan — Human Attestation Abuse Risk

### Why A3 is high risk

Structured attestation or Manager clarification can help when scanner evidence has uncertainty, dynamic/wrapper/runtime boundaries or business context gaps. But if it can unlock classification without strict controls, it becomes a bypass path and undermines LCSP's evidence-based position.

### Data to validate

| Data | Required |
| --- | --- |
| Attestation schema draft | Yes |
| Role-claim matrix | Yes |
| Critical claim list | Yes |
| Forbidden metadata list | Yes |
| Abuse test cases | Yes |
| Expected audit event model | Yes |
| Report disclosure rule | Yes |

### Method

1. Review attestation schema for required fields.
2. Review Manager-owned conflict resolution and optional Developer clarification boundaries.
3. Run abuse cases against expected policy behavior.
4. Verify Manager resolution is traceable and cannot silently erase scanner evidence.
5. Verify attestation cannot replace machine-generated metadata.
6. Verify report/audit disclosure when attestation contributes to unlock classification.

### A3 Abuse Test Cases

#### Case A3-C1 — Manager tries to minimize AI impact despite scanner evidence

| Field | Detail |
| --- | --- |
| Abuse case | Manager states AI has no decision impact while scanner evidence shows AI output flows into approve/reject, ranking or status-change path |
| Expected system behavior | Create or keep conflict unresolved; require traceable Manager update/confirmation with evidence refs; do not erase scanner evidence |
| Should accept/reject/block? | Block final classification/report until reconciliation has no unresolved conflict |
| Required audit event | Manager conflict resolution attempt, evidence refs, previous/new declaration, conflict status, assessment_id, timestamp |
| PRD/architecture update trigger if fail | Tighten reconciliation and Manager conflict-resolution policy |

#### Case A3-C2 — Manager claims human review without supporting process evidence

| Field | Detail |
| --- | --- |
| Abuse case | Manager states `human_review = present` but no process evidence, queue state, approval step or policy reference supports it |
| Expected system behavior | Accept only as Manager declaration with uncertainty; keep claim unclear unless traceable evidence or confirmation supports it |
| Should accept/reject/block? | Block final classification if human review is a critical legal/risk claim |
| Required audit event | Human-review claim, evidence refs, uncertainty reason, resolution status |
| PRD/architecture update trigger if fail | Strengthen human-review evidence and uncertainty requirements |

#### Case A3-C3 — Manager tries to remove technical evidence during resolution

| Field | Detail |
| --- | --- |
| Abuse case | Manager attempts to resolve conflict by deleting, hiding or overriding scanner-derived finding instead of updating business context or requesting re-scan |
| Expected system behavior | Reject destructive evidence override; preserve scanner evidence refs and audit trail |
| Should accept/reject/block? | Block VerifiedProfile until resolution is traceable and non-destructive |
| Required audit event | Attempted evidence override, actor, evidence refs, rejected action, conflict status |
| PRD/architecture update trigger if fail | Add explicit non-destructive conflict-resolution guardrail |

#### Case A3-C4 — Manager leaves conflict unresolved but requests classification

| Field | Detail |
| --- | --- |
| Abuse case | Manager requests Risk Classification while reconciliation conflict remains unresolved |
| Expected system behavior | Reject classification request and show conflict-required state |
| Should accept/reject/block? | Block classification and final document generation |
| Required audit event | Classification blocked, unresolved conflict refs, actor, assessment_id, timestamp |
| PRD/architecture update trigger if fail | Strengthen state machine and classification precondition |

#### Case A3-C5 — Manager changes declaration after TechnicalProfile creation

| Field | Detail |
| --- | --- |
| Abuse case | Manager changes a material Wizard declaration after TechnicalProfile and AIUsageFlow exist |
| Expected system behavior | Invalidate affected VerifiedProfile/classification snapshots, re-run reconciliation if needed and preserve audit trail |
| Should accept/reject/block? | Block final classification until updated reconciliation passes |
| Required audit event | Declaration changed, previous/new value, affected claims, reconciliation rerun requirement |
| PRD/architecture update trigger if fail | Strengthen profile versioning and invalidation rules |

#### Case A3-C6 — Manager requests final document with missing citation or unresolved conflict

| Field | Detail |
| --- | --- |
| Abuse case | Manager requests final compliance document while legal citation is missing or conflict remains unresolved |
| Expected system behavior | Block or degrade output according to citation/output guardrail; do not generate final compliance output |
| Should accept/reject/block? | Block final document or generate only explicitly degraded/non-final output if policy permits |
| Required audit event | Document generation blocked, missing citation/conflict refs, actor, assessment_id, timestamp |
| PRD/architecture update trigger if fail | Strengthen document-generation final gate |

### A3 Acceptance Threshold

| Threshold | Required |
| --- | --- |
| Schema completeness | 100% accepted attestations include role, claim, reason, scope, timestamp, assessment_id |
| Audit | 100% accepted/rejected attestation attempts create audit event |
| Manager resolution traceability | 100% material conflict resolutions have confirmation/update, evidence refs and audit trail |
| Developer optionality | 0 MVP transitions require Developer confirmation to resume workflow |
| Metadata replacement | 0 attestations replace machine-generated metadata |
| Disclosure | 100% classification/report outputs disclose attestation use when attestation contributed to unlock |

### A3 Failure Conditions

- Free-text attestation unlocks classification.
- Manager can silently erase, hide or overwrite scanner evidence.
- Developer confirmation is required to resume an MVP workflow.
- Critical claim resolves without traceable Manager confirmation/update and evidence refs.
- Attestation replaces report hash, scanner version, ruleset version, scan timestamp, repo/commit metadata, legal corpus version, evidence report integrity or machine-generated privacy flags.
- Report fails to disclose attestation-assisted classification.

## Test Scenario Matrix

| ID | Assumption | Scenario / Case | Primary Owner | Supporting Reviewer | Expected Output |
| --- | --- | --- | --- | --- | --- |
| A1-S1 | A1 | Internal AI chatbot | Product Manager | UX/Domain Reviewer | Wizard comprehension and field coverage result |
| A1-S2 | A1 | Credit scoring / loan approval | Product Manager | UX/Domain Reviewer | Critical field coverage and ambiguity notes |
| A1-S3 | A1 | HR screening / recruitment AI | Product Manager | UX/Domain Reviewer | WizardProfile mapping and wording issues |
| A2-S1 | A2 | Low-risk/internal assistant | Product Manager | Legal/Domain Rule Owner | Rule/citation trace result |
| A2-S2 | A2 | AI-assisted decision | Product Manager | Legal/Domain Rule Owner | Decision-impact rule trace result |
| A2-S3 | A2 | High-impact or sensitive data | Product Manager | Legal/Domain Rule Owner | High-impact/sensitive rule trace result |
| A2-b-S1 | A2-b | Internal summarization / internal assistant mapping | Product Manager | Legal/Domain Rule Owner + AI Usage Flow Reviewer | Usage-purpose to rule/corpus mapping result |
| A2-b-S2 | A2-b | Loan approval / credit scoring mapping | Product Manager | Legal/Domain Rule Owner + AI Usage Flow Reviewer | Decision-impact rule family mapping result |
| A2-b-S3 | A2-b | HR screening / recruitment ranking mapping | Product Manager | Legal/Domain Rule Owner + AI Usage Flow Reviewer | Employment/high-impact rule family mapping result |
| A2-b-S4 | A2-b | Customer-facing chatbot without decision mapping | Product Manager | Legal/Domain Rule Owner + AI Usage Flow Reviewer | Chatbot/non-decision rule family mapping result |
| A3-C1 | A3 | Manager minimizes AI impact despite scanner evidence | Product Manager | Governance Reviewer | Conflict remains unresolved or traceably resolved; audit event |
| A3-C2 | A3 | Manager claims human review without supporting process evidence | Product Manager | Governance Reviewer | Uncertainty/blocking behavior and audit event |
| A3-C3 | A3 | Manager tries to remove technical evidence | Product Manager | Governance Reviewer | Rejected evidence override and audit event |
| A3-C4 | A3 | Manager requests classification with unresolved conflict | Product Manager | Governance Reviewer | Classification block result |
| A3-C5 | A3 | Manager changes declaration after TechnicalProfile creation | Product Manager | Governance Reviewer | Reconciliation rerun/invalidation result |
| A3-C6 | A3 | Manager requests final document with missing citation/conflict | Product Manager | Governance Reviewer | Document-generation block/degrade result |

## Evidence to Collect During Validation

| Evidence | Applies to | Purpose |
| --- | --- | --- |
| Wizard question list | A1 | Check wording and mapping |
| WizardProfile field mapping | A1 | Confirm critical field coverage |
| User test notes | A1 | Capture confusion and Developer-dependency |
| Scenario answer sheets | A1/A2 | Compare expected vs actual captured facts |
| Legal rule inventory | A2 | Verify source/citation/version/rule_id |
| Rule trace table | A2 | Trace risk output to legal source |
| AIUsageFlow fixture outputs | A2-b | Validate usage purpose, input/output, automation level, affected subjects and evidence refs |
| Usage-purpose to rule/corpus mapping table | A2-b | Verify rule family/corpus selection |
| Missing rule test result | A2 | Verify degraded/blocked behavior |
| Attestation schema examples | A3 | Check schema completeness |
| Abuse test logs | A3 | Verify rejection/block behavior |
| Audit event samples | A3 | Verify who/what/when/why traceability |
| PRD/Architecture impact notes | A1-A3 | Track required document updates |

## Result Recording Format

Use this template for every scenario/case:

| Assumption | Test Case | Expected Result | Actual Result | Status | Required Update | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| A1/A2/A3 | Scenario or case ID | Expected behavior from this plan | Observed result | PASS / FAIL / PARTIAL / NEEDS_MORE_DATA | PRD / Architecture / ADR / None | Named owner |

Allowed statuses:

```text
PASS
FAIL
PARTIAL
NEEDS_MORE_DATA
```

Status definitions:

| Status | Meaning |
| --- | --- |
| PASS | Meets acceptance threshold with no blocking update required |
| FAIL | Violates acceptance threshold and blocks backlog until resolved |
| PARTIAL | Mostly works but requires PRD/Architecture/ADR update before backlog |
| NEEDS_MORE_DATA | Test evidence is insufficient; rerun or add scenario before decision |

## Acceptance Threshold Summary

| Assumption | Minimum threshold to pass |
| --- | --- |
| A1 | Manager understands critical Wizard questions without Developer help; 100% critical fields captured or explicitly unknown; 100% important questions map to WizardProfile; no technical wording without explanation |
| A2 | 100% critical rules have source/citation/version/rule_id; 100% risk outputs trace to rule_id; A2-b usage-purpose mapping correct or blocked/uncertain; no final classification without required citation; no unsupported LLM legal conclusion |
| A3 | 100% conflict/attestation actions have schema/audit; Manager conflict resolution is traceable; Developer clarification is optional only; 0 role-bound claim violations; 0 metadata replacement; report discloses attestation use |

## Failure Handling

| Failure type | Immediate action | Product action | Architecture/ADR action |
| --- | --- | --- | --- |
| A1 critical field missing | Mark A1 FAIL | Update Wizard scope, WizardProfile fields, wording or readiness behavior | Revisit Wizard module, reconciliation input and state model |
| A1 Manager cannot understand question | Mark A1 FAIL or PARTIAL | Rewrite question, add examples/progressive disclosure | No architecture change unless field model changes |
| A2 missing critical citation | Mark A2 FAIL | Update legal corpus scope, rule inventory or classification blocking rules | Revisit RAG/rule contract and Risk Agent boundary |
| A2 LLM creates unsupported legal conclusion | Mark A2 FAIL | Strengthen PRD guardrail and acceptance criteria | Revisit agent boundary and rule precedence |
| A2-b usage-purpose maps to wrong legal corpus | Mark A2 FAIL or PARTIAL depending severity | Update AIUsageFlow requirements, scanner finding requirements or legal matching criteria | Revisit AI Usage Flow Node, RAG query construction and Risk Agent boundary |
| A3 attestation bypasses metadata | Mark A3 FAIL | Tighten attestation requirements or remove unlock path | Revisit ADR-008, Evidence Gate, Audit and Permission model |
| A3 conflict resolution lacks traceable Manager confirmation/update | Mark A3 FAIL | Add explicit traceable resolution and audit requirements | Revisit Reconciliation and State Model |

## PRD / Architecture / ADR Update Rules

| Validation result | Required update |
| --- | --- |
| A1 PASS | No PRD update required unless minor wording improvements are found |
| A1 PARTIAL | Update PRD Wizard requirements and possibly Architecture Wizard/Reconciliation sections |
| A1 FAIL | Update PRD before any backlog; revisit Architecture and ADR-001/004/007 if field model changes |
| A2 PASS | No PRD update required unless rule/citation format needs clarification |
| A2 PARTIAL | Update legal rule/citation requirements and blocked/degraded behavior |
| A2 FAIL | Update PRD and Architecture before backlog; revisit ADR-004 and Risk/RAG boundary |
| A3 PASS | Governance/conflict-resolution assumptions can remain conditionally accepted for MVP, subject to readiness checkpoint |
| A3 PARTIAL | Update attestation schema, permission model, audit and disclosure rules |
| A3 FAIL | Remove or restrict attestation unlock path; revisit ADR-008, Evidence Gate and Reconciliation architecture |

Document update order:

```text
Validation result
-> PRD update if product requirement changes
-> ADR revisit if decision status changes
-> Architecture update if module/gate/boundary changes
-> Architecture Review Checklist refresh
-> Backlog unblock decision
```

## Backlog Unblock Criteria

Implementation backlog may be requested only when all criteria are true:

| Criterion | Required |
| --- | --- |
| A1 validation result recorded | Yes |
| A2 validation result recorded | Yes |
| A3 validation result recorded | Yes |
| No critical FAIL unresolved | Yes |
| PARTIAL results resolved by PRD/Architecture/ADR update or explicit scope reduction | Yes |
| PRD updated for discovered requirement changes | Yes |
| Architecture/ADR revisited for design-impacting validation results | Yes |
| Architecture Review Checklist updated if readiness changes | Yes |

If any criterion is not met:

```text
Implementation backlog remains blocked.
```

## Final Recommendation

Validation Execution Plan là bước bắt buộc trước backlog.

Architecture hiện tại chỉ sẵn sàng cho review, chưa sẵn sàng cho implementation backlog.

Nếu A1-A3 pass hoặc được xử lý bằng PRD update, mới được yêu cầu backlog.

Nếu A1-A3 fail mà chưa xử lý, không được tạo implementation backlog.

## Phase 4.1 Validation Execution Preparation Packs

Phase 4.1 bổ sung execution packs để chuẩn bị chạy validation thật cho A1, A2, A2-b và A3. Các tài liệu này chỉ chuẩn bị protocol, fixture, evidence capture và decision rubric; chúng không ghi result và không tự unlock implementation backlog.

| Validation | Execution Pack | Purpose |
| --- | --- | --- |
| A1 | `docs/validation/a1-wizard-validation-execution-pack.md` | Chuẩn bị session với Manager-like users để kiểm chứng Wizard simplicity, completeness và blocked-state comprehension |
| A2 | `docs/validation/a2-legal-corpus-validation-execution-pack.md` | Chuẩn bị legal reviewer workflow, corpus provenance, citation verification và disagreement handling |
| A2-b | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md` | Chuẩn bị fixture review cho scanner, AIUsageFlow claim evidence, uncertainty, abstention và rule-mapping eligibility |
| A3 | `docs/validation/a3-human-attestation-validation-execution-pack.md` | Chuẩn bị governance abuse scenarios, Manager conflict authority checks, audit checks và blocking behavior |
| Common | `docs/validation/participant-and-reviewer-recruitment-plan.md` | Tách reviewer roles và participant criteria |
| Common | `docs/validation/consent-privacy-and-data-handling-plan.md` | Đảm bảo validation dùng synthetic/minimized data và không ghi raw source, secret hoặc raw prompt |
| Common | `docs/validation/validation-evidence-capture-template.md` | Chuẩn hóa evidence record cho mọi validation run |
| Common | `docs/validation/validation-decision-rubric.md` | Chuẩn hóa PASS / PASS_WITH_REQUIRED_UPDATES / INCONCLUSIVE / FAIL decisions |
| Common | `docs/validation/validation-fixture-release-register.md` | Theo dõi version, integrity reference và approval status của fixture |

Before validation execution, the team must still approve participant/reviewer counts, acceptance thresholds, fixture integrity references, evidence storage controls and retention/deletion schedule.

Implementation backlog remains blocked until A1, A2, A2-b and A3 have real recorded outcomes and all required PRD/spec/architecture/ADR/QA updates are completed.

## Phase 4.1.1 Decision Resolution Reference

Execution decisions are tracked in:

```text
docs/validation/validation-execution-decision-log.md
```

Current decision-resolution rule:

```text
Only APPROVED_FOR_EXECUTION rows remove execution blockers.
PENDING_OWNER_CONFIRMATION rows still block the affected validation stream.
```

Phase 4.1.1 records proposed defaults for A1, A2, A2-b1 and A3 but does not start validation execution.

A2-b scope is split as:

| Stream | Scope |
| --- | --- |
| A2-b1 | Pre-Implementation Mapping Design Validation for scanner-rule design, expected evidence graph, AIUsageFlow claim model, uncertainty, reconciliation and legal-rule eligibility |
| A2-b2 | Post-Implementation Empirical Scanner Acceptance Validation, only after scanner prototype exists |

A2-b1 must not be treated as runtime scanner accuracy validation.

## Phase 4.1.2 Validation Approval Normalization

Phase 4.1.2 normalizes the latest Project Lead confirmation in `DEC-VAL-2026-001`.

| Decision | Normalized Status | Execution Meaning |
| --- | --- | --- |
| D-01 Reviewer roster | APPROVED_FOR_EXECUTION with A2 formal legal limitation | A1, A2-b1 and A3 reviewer inputs may be rechecked; A2 formal legal reliability remains pending |
| D-02 A1 session design | APPROVED_FOR_EXECUTION | A1 has owner-approved session design, thresholds and P0/P1/P2 rubric |
| D-03 A2 corpus/reviewer protocol | PENDING_OWNER_CONFIRMATION | Internal legal-rule review only; do not claim independent/formal/professional legal reliability validation |
| D-04 A2-b1 mapping-design validation | APPROVED_FOR_EXECUTION | A2-b1 scope and thresholds are approved, but fixture release remains blocked by D-07 |
| D-05 A3 governance thresholds | APPROVED_FOR_EXECUTION | A3 governance/security reviewer model and fail-closed thresholds may be rechecked |
| D-06 evidence storage/privacy | APPROVED_FOR_EXECUTION by owner attestation | GitHub private repository storage model may be rechecked; not an independent ACL audit |
| D-07 fixture release governance | PENDING_OWNER_CONFIRMATION | A2-b1 evidence collection remains blocked until fixture approver, finalized cards, hashes and `APPROVED_FOR_VALIDATION` status exist |

The only next workflow permission granted by Phase 4.1.2 is a Phase 4.2 readiness recheck. It does not authorize evidence collection by itself.
