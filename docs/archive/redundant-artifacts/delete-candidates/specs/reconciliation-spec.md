# Reconciliation Spec

## Status

AUTHORITATIVE

## Merged From

- `docs/specs/reconciliation-policy.md`
- Reconciliation invariants from `docs/specs/implementation-contract.md`

## Purpose

Single source of truth for WizardProfile, TechnicalProfile, AIUsageFlow comparison and Manager conflict resolution behavior.

---

# LCSP Reconciliation Policy

## Purpose

Defines how LCSP compares WizardProfile with TechnicalProfile and AIUsageFlow to decide whether a conflict exists, pause workflow when needed, and create VerifiedProfile after conflict resolution.

## Comparison Scope

Reconciliation compares critical fields including WizardProfile declarations, TechnicalProfile facts and AIUsageFlow interpretation:

- ai_usage
- purpose
- sector
- data_type
- user_group
- user_impact
- decision_role
- human_oversight
- external_llm_usage
- biometric_or_high_impact_use
- production_scope
- business_process
- ai_purpose
- ai_input_types
- ai_output_types
- downstream_action
- affected_subjects
- automation_level
- potential_harm_categories

## MVP Reconciliation Decision

| Decision | Meaning | Workflow Result |
| --- | --- | --- |
| `NO_CONFLICT_FOUND` | Không phát hiện mâu thuẫn giữa khai báo nghiệp vụ, evidence kỹ thuật và usage-flow facts | Tạo VerifiedProfile |
| `CONFLICT_FOUND` | Có ít nhất một điểm không khớp giữa WizardProfile và TechnicalProfile/AIUsageFlow | Pause workflow, tạo Manager conflict resolution task, giữ classification locked |

## AI Usage Flow Analysis

AI Usage Flow Analysis phân tích AI đang được dùng vào mục đích gì trong luồng nghiệp vụ, output AI ảnh hưởng tới quyết định nào, ai bị ảnh hưởng và có khả năng gây hại hay không. Reconciliation phải dùng AIUsageFlow để tránh kết luận rủi ro chỉ vì repo có AI provider/model/framework.

AIUsageFlow claims must preserve claim-level evidence from the static scanner contract:

```text
claim.value
claim.confidence
claim.evidence_refs[]
claim.uncertainty_reason
claim.source_type = scanner-derived | manager-declared | reconciled
```

Claims without evidence refs cannot be used as scanner-derived facts during reconciliation. If the scanner emits `SCAN_COVERAGE_LIMITATION` or `UNSUPPORTED_DYNAMIC_FLOW` for a critical claim, reconciliation must treat the claim as unknown/unclear and create Manager clarification/conflict when material to classification.

Examples:

| Wizard says | Repository/Usage Flow says | Conflict |
| --- | --- | --- |
| AI chỉ dùng để hỗ trợ nội bộ | AI output dùng để approve/reject customer | Có mâu thuẫn |
| Có human review | Code flow không thấy human review, có auto approve | Có mâu thuẫn |
| Không xử lý dữ liệu nhạy cảm | Data flow có medical_record / biometric_data | Có mâu thuẫn |
| AI chỉ là chatbot hỗ trợ | Prompt/code cho thấy scoring/ranking user | Có mâu thuẫn |

## Conflict Types

| Conflict type | Example | Primary resolver |
| --- | --- | --- |
| Technical evidence conflict | Scanner finding may be false positive | Manager in MVP; optional delegated Developer clarification post-MVP |
| Scope/provenance conflict | Wrong repo/branch/commit scanned | Manager in MVP; optional delegated Developer clarification post-MVP |
| Business/legal meaning conflict | Wizard purpose/user impact incorrect | Manager |
| Cross-boundary conflict | Auto decision, data type, human oversight, AI purpose or downstream impact mismatch across WizardProfile, TechnicalProfile and AIUsageFlow | Manager |
| Usage purpose uncertainty | AIUsageFlow cannot determine purpose/downstream action/affected subject with enough confidence | Manager if material to classification |

## Optional Conflict Details

Optional field:

```text
conflict_details.severity
```

Severity is informational in MVP and does not create separate workflow branches. MVP does not route by severity level.

## Conflict Score

Conflict Score may be retained as explanatory/supporting context for reviewers and audit. It does not create multiple workflow routes in MVP.

## MVP Resolution Rules

| Claim / Conflict | MVP required resolver |
| --- | --- |
| Business/legal truth | Manager |
| Technical evidence conflict | Manager reviews evidence and may request re-scan/correction |
| auto_decision | Manager |
| ai_assisted_decision | Manager |
| human_oversight | Manager |
| sensitive_data_usage | Manager |
| user-facing external LLM | Manager |
| biometric/high-impact use | Manager |
| Cross-boundary conflict involving business/legal and technical/usage-flow facts | Manager |

Post-MVP, Manager may delegate a scoped technical clarification task to Developer. Developer clarification is input only and does not finalize conflict resolution. Delegation never removes Manager permissions.

Manager resolution must remain evidence-based. Manager may confirm business meaning, update WizardProfile fields, accept/reject an interpretation with recorded rationale, or request re-scan/correction. Manager must not arbitrarily override scanner evidence without traceable confirmation, updated information, evidence references and audit.

## VerifiedProfile Creation Rule

VerifiedProfile can be created only when:

- WizardProfile submitted.
- Technical evidence accepted for reconciliation.
- Schema and quality gates pass or valid supplemental evidence is accepted.
- AIUsageFlow exists with evidence refs, or unclear usage-flow fields have been resolved/confirmed where material.
- Critical AIUsageFlow claims used by legal matching have claim-level evidence refs or reconciled Manager clarification.
- No unresolved conflict remains.
- Manager conflict resolution is recorded for any conflict that existed.

## Block Conditions

- Any unresolved conflict exists.
- Manager resolution is missing for an existing conflict.
- Evidence insufficient and no valid supplemental evidence.

## MVP Flow

```text
WizardProfile + TechnicalProfile + AIUsageFlow
-> Reconciliation Agent
-> Conflict exists?
   -> No: Build VerifiedProfile
   -> Yes: Pause workflow and create Manager conflict-resolution task
-> Manager reviews WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs
-> Manager resolves, updates information or requests re-scan/correction
-> Re-run reconciliation if needed
-> VerifiedProfile only when no unresolved conflict remains
```
