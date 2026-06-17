# LCSP Validation Results Template

## Purpose

Template này dùng để ghi kết quả validation thực tế cho ba assumption rủi ro cao A1-A3 sau khi team chạy kiểm chứng.

Template này **chưa kết luận A1-A3 pass/fail**. Mặc định mọi test case ở trạng thái `NOT_RUN` cho đến khi có dữ liệu thực tế.

Không dùng template này để tạo backlog, implementation task, code, hoặc tự động sửa PRD/Architecture/ADR.

## Validation Status Summary

| Item | Current value |
| --- | --- |
| Validation run date | TBD |
| Validation owner | TBD |
| Overall A1 status | NOT_RUN |
| Overall A2 status | NOT_RUN |
| Overall A3 status | NOT_RUN |
| Critical unresolved FAIL count | TBD |
| Required PRD updates completed? | TBD |
| Required Architecture / ADR revisits completed? | TBD |
| Backlog status | BLOCKED |

Allowed test statuses:

```text
NOT_RUN
PASS
FAIL
PARTIAL
NEEDS_MORE_DATA
```

Allowed backlog decisions:

```text
BACKLOG_UNBLOCKED
BACKLOG_BLOCKED
BACKLOG_BLOCKED_PENDING_PRD_UPDATE
BACKLOG_BLOCKED_PENDING_ARCHITECTURE_REVISIT
```

Default backlog decision for this template:

```text
BACKLOG_BLOCKED
```

## Input Documents

| Document | Purpose |
| --- | --- |
| `docs/product/validation-execution-plan.md` | Source of executable test cases and thresholds |
| `docs/product/validation-plan.md` | Source of A1-A3 validation requirements |
| `docs/product/prd.md` | Conditional PRD and requirements affected by validation |
| `docs/architecture/architecture-review-checklist.md` | Current readiness state before validation results |
| `docs/architecture/architecture.md` | Conditional architecture affected by validation |

## How to Use This Template

1. Run validation according to `docs/product/validation-execution-plan.md`.
2. For each test case, record actual evidence in the relevant A1/A2/A3 section.
3. Use only the allowed statuses: `NOT_RUN`, `PASS`, `FAIL`, `PARTIAL`, `NEEDS_MORE_DATA`.
4. Do not mark an assumption as `PASS` unless all required test cases meet the acceptance threshold.
5. If any test case is `FAIL` or `PARTIAL`, record required PRD/Architecture/ADR updates.
6. Backlog can be unblocked only after all unblock criteria in this template are met.

Result matrix format:

| Assumption | Test Case | Expected Result | Actual Result | Status | Evidence / Notes | Required Update | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1/A2/A3 | Test case ID | Expected result | TBD | NOT_RUN | TBD | TBD | TBD |

## A1 — Wizard Simplicity vs Completeness Results

Overall A1 status:

```text
NOT_RUN
```

A1 objective:

- Manager có thể hiểu và hoàn tất Wizard mà không cần Developer.
- Wizard capture đủ business/legal truth.
- WizardProfile có đủ field cần cho Reconciliation và Risk Classification.

Critical fields to validate:

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

### A1-S1 — Internal AI Chatbot

| Check | Result |
| --- | --- |
| Scenario description | Internal AI chatbot |
| Manager hiểu câu hỏi không? | TBD |
| Có cần Developer giải thích không? | TBD |
| Wizard có capture đủ critical fields không? | TBD |
| Có câu hỏi nào quá kỹ thuật không? | TBD |
| Field nào thiếu? | TBD |
| Actual participant notes | TBD |
| PRD cần sửa gì nếu fail? | TBD |
| Status | NOT_RUN |

### A1-S2 — Credit Scoring / Loan Approval

| Check | Result |
| --- | --- |
| Scenario description | Credit scoring / loan approval |
| Manager hiểu câu hỏi không? | TBD |
| Có cần Developer giải thích không? | TBD |
| Wizard có capture đủ critical fields không? | TBD |
| Có câu hỏi nào quá kỹ thuật không? | TBD |
| Field nào thiếu? | TBD |
| Actual participant notes | TBD |
| PRD cần sửa gì nếu fail? | TBD |
| Status | NOT_RUN |

### A1-S3 — HR Screening / Recruitment AI

| Check | Result |
| --- | --- |
| Scenario description | HR screening / recruitment AI |
| Manager hiểu câu hỏi không? | TBD |
| Có cần Developer giải thích không? | TBD |
| Wizard có capture đủ critical fields không? | TBD |
| Có câu hỏi nào quá kỹ thuật không? | TBD |
| Field nào thiếu? | TBD |
| Actual participant notes | TBD |
| PRD cần sửa gì nếu fail? | TBD |
| Status | NOT_RUN |

### A1 Result Matrix

| Assumption | Test Case | Expected Result | Actual Result | Status | Evidence / Notes | Required Update | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Internal AI chatbot | Manager understands questions without Developer; critical fields captured | TBD | NOT_RUN | TBD | TBD | Product Manager |
| A1 | Credit scoring / loan approval | Decision role, data type, user impact and human oversight captured | TBD | NOT_RUN | TBD | TBD | Product Manager |
| A1 | HR screening / recruitment AI | Recruitment impact, data type, decision role and human review captured | TBD | NOT_RUN | TBD | TBD | Product Manager |

## A2 — Legal Corpus / Rule Reliability Results

Overall A2 status:

```text
NOT_RUN
```

A2 objective:

- Legal rules có source/citation/version.
- Risk output trace được về `rule_id`.
- Không có final classification nếu thiếu citation/rule quan trọng.
- LLM không tự suy luận luật ngoài retrieved rules.

### A2-S1 — Low-risk / Internal Assistant

| Check | Result |
| --- | --- |
| Scenario description | Low-risk/internal assistant |
| Có legal rule source không? | TBD |
| Có citation không? | TBD |
| Có `rule_id` không? | TBD |
| Risk output có trace được về rule không? | TBD |
| Nếu thiếu rule thì system degraded/blocked đúng không? | TBD |
| LLM có tạo legal conclusion ngoài retrieved rule không? | TBD |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A2-S2 — AI-assisted Decision

| Check | Result |
| --- | --- |
| Scenario description | AI-assisted decision |
| Có legal rule source không? | TBD |
| Có citation không? | TBD |
| Có `rule_id` không? | TBD |
| Risk output có trace được về rule không? | TBD |
| Nếu thiếu rule thì system degraded/blocked đúng không? | TBD |
| LLM có tạo legal conclusion ngoài retrieved rule không? | TBD |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A2-S3 — High-impact or Sensitive Data Scenario

| Check | Result |
| --- | --- |
| Scenario description | High-impact or sensitive data scenario |
| Có legal rule source không? | TBD |
| Có citation không? | TBD |
| Có `rule_id` không? | TBD |
| Risk output có trace được về rule không? | TBD |
| Nếu thiếu rule thì system degraded/blocked đúng không? | TBD |
| LLM có tạo legal conclusion ngoài retrieved rule không? | TBD |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A2 Result Matrix

| Assumption | Test Case | Expected Result | Actual Result | Status | Evidence / Notes | Required Update | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A2 | Low-risk/internal assistant | Rule source, citation, version and rule trace present | TBD | NOT_RUN | TBD | TBD | Product Manager / Legal Rule Owner |
| A2 | AI-assisted decision | Decision-impact output traces to rule_id and citation | TBD | NOT_RUN | TBD | TBD | Product Manager / Legal Rule Owner |
| A2 | High-impact or sensitive data scenario | High-impact/sensitive risk output traces to critical rules | TBD | NOT_RUN | TBD | TBD | Product Manager / Legal Rule Owner |

## A3 — Human Attestation Abuse Risk Results

Overall A3 status:

```text
NOT_RUN
```

A3 objective:

- Attestation không trở thành bypass.
- Claim đúng role.
- Critical claim cần dual confirmation.
- Attestation không thay machine-generated metadata.

### A3-C1 — Developer cố thay `scanner_version` bằng attestation

| Check | Result |
| --- | --- |
| Abuse case | Developer cố thay `scanner_version` bằng attestation |
| System accept/reject/block? | TBD |
| Có audit event không? | TBD |
| Có đúng forbidden metadata rule không? | TBD |
| Có đúng dual-confirmation rule không? | N/A unless critical conflict also exists |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A3-C2 — Manager cố xác nhận technical truth một mình

| Check | Result |
| --- | --- |
| Abuse case | Manager cố xác nhận technical truth một mình |
| System accept/reject/block? | TBD |
| Có audit event không? | TBD |
| Có đúng forbidden metadata rule không? | N/A |
| Có đúng dual-confirmation rule không? | TBD |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A3-C3 — Developer phủ nhận `auto_decision` dù Conflict Score cao

| Check | Result |
| --- | --- |
| Abuse case | Developer phủ nhận `auto_decision` dù Conflict Score cao |
| System accept/reject/block? | TBD |
| Có audit event không? | TBD |
| Có đúng forbidden metadata rule không? | N/A |
| Có đúng dual-confirmation rule không? | TBD |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A3-C4 — Attestation thiếu scope/timestamp/reason

| Check | Result |
| --- | --- |
| Abuse case | Attestation thiếu scope/timestamp/reason |
| System accept/reject/block? | TBD |
| Có audit event không? | TBD |
| Có đúng forbidden metadata rule không? | N/A |
| Có đúng dual-confirmation rule không? | N/A unless critical claim exists |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A3-C5 — Critical claim thiếu dual confirmation

| Check | Result |
| --- | --- |
| Abuse case | Critical claim thiếu dual confirmation |
| System accept/reject/block? | TBD |
| Có audit event không? | TBD |
| Có đúng forbidden metadata rule không? | N/A |
| Có đúng dual-confirmation rule không? | TBD |
| Evidence / notes | TBD |
| Required PRD/Architecture/ADR update | TBD |
| Status | NOT_RUN |

### A3 Result Matrix

| Assumption | Test Case | Expected Result | Actual Result | Status | Evidence / Notes | Required Update | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A3 | Developer cố thay `scanner_version` bằng attestation | Reject/block; attestation cannot replace machine-generated metadata | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Manager cố xác nhận technical truth một mình | Reject or route to Developer; cannot resolve alone | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Developer phủ nhận `auto_decision` dù Conflict Score cao | Block until dual confirmation resolves material/critical conflict | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Attestation thiếu scope/timestamp/reason | Reject attestation as schema invalid | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Critical claim thiếu dual confirmation | Block VerifiedProfile/final classification until dual confirmation | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |

## Consolidated Result Matrix

| Assumption | Test Case | Expected Result | Actual Result | Status | Evidence / Notes | Required Update | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Internal AI chatbot | Manager understands questions; critical fields captured | TBD | NOT_RUN | TBD | TBD | Product Manager |
| A1 | Credit scoring / loan approval | Decision/data/impact/oversight captured | TBD | NOT_RUN | TBD | TBD | Product Manager |
| A1 | HR screening / recruitment AI | HR impact and human review captured | TBD | NOT_RUN | TBD | TBD | Product Manager |
| A2 | Low-risk/internal assistant | Rule/citation/version/rule_id trace present | TBD | NOT_RUN | TBD | TBD | Product Manager / Legal Rule Owner |
| A2 | AI-assisted decision | Decision impact traces to rule_id and citation | TBD | NOT_RUN | TBD | TBD | Product Manager / Legal Rule Owner |
| A2 | High-impact or sensitive data scenario | Critical risk output traces to legal source | TBD | NOT_RUN | TBD | TBD | Product Manager / Legal Rule Owner |
| A3 | Developer replaces `scanner_version` | Reject/block metadata replacement | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Manager confirms technical truth alone | Reject/route to Developer | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Developer denies `auto_decision` despite high conflict | Block pending dual confirmation | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Attestation missing scope/timestamp/reason | Reject invalid attestation | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |
| A3 | Critical claim lacks dual confirmation | Block VerifiedProfile/classification | TBD | NOT_RUN | TBD | TBD | Product Manager / Governance Reviewer |

## Failed / Partial Test Cases

Use this section only after validation has run.

| Test Case | Status | Failure / Partial Reason | Severity | Required Update | Owner | Target Resolution Date |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | NOT_RUN | TBD | TBD | TBD | TBD | TBD |

Severity values:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

## Required PRD Updates

| Update ID | Triggering Test Case | PRD Section / Requirement Affected | Required Change | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | Product Manager | NOT_RUN |

Update status values:

```text
NOT_RUN
PASS
FAIL
PARTIAL
NEEDS_MORE_DATA
```

## Required Architecture / ADR Updates

| Update ID | Triggering Test Case | Architecture / ADR Area Affected | Required Change | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | Architect | NOT_RUN |

Potential affected areas:

| Assumption | Likely affected architecture / ADR areas |
| --- | --- |
| A1 | WizardProfile schema, Wizard UI, Manager Workspace, Reconciliation input, State Model, ADR-001, ADR-004, ADR-007 |
| A2 | Legal Corpus/RAG, Risk Classification Agent boundary, rule/citation contract, degraded/blocked behavior, ADR-004 |
| A3 | Attestation schema, Evidence Gate, Permission Model, Audit Trail, Reconciliation workflow, ADR-008 |

## Backlog Unblock Decision

Current backlog decision:

```text
BACKLOG_BLOCKED
```

Implementation backlog is unblocked only if:

1. A1, A2 and A3 have validation results.
2. There is no unresolved critical `FAIL`.
3. PRD has been updated for any requirement-impacting validation result.
4. Architecture and ADR have been revisited for any design-impacting validation result.

If any condition is not met:

```text
Backlog status = BLOCKED
```

Decision options:

| Decision | Meaning |
| --- | --- |
| `BACKLOG_UNBLOCKED` | A1-A3 results are recorded, no unresolved critical fail, required updates completed |
| `BACKLOG_BLOCKED` | Validation not run or unblock criteria not met |
| `BACKLOG_BLOCKED_PENDING_PRD_UPDATE` | Validation found requirement-impacting changes not yet applied |
| `BACKLOG_BLOCKED_PENDING_ARCHITECTURE_REVISIT` | Validation found design-impacting changes not yet revisited |

Decision record:

| Field | Value |
| --- | --- |
| Decision | BACKLOG_BLOCKED |
| Decision date | TBD |
| Decided by | TBD |
| Reason | A1-A3 validation results not recorded yet |
| Required next step | Run validation using `docs/product/validation-execution-plan.md` |

## Final Review Sign-off

| Reviewer | Role | Sign-off Status | Notes | Date |
| --- | --- | --- | --- | --- |
| TBD | Product Manager | NOT_RUN | TBD | TBD |
| TBD | UX / Domain Reviewer | NOT_RUN | TBD | TBD |
| TBD | Legal / Domain Rule Owner | NOT_RUN | TBD | TBD |
| TBD | Governance Reviewer | NOT_RUN | TBD | TBD |
| TBD | Architect | NOT_RUN | TBD | TBD |

Sign-off status values:

```text
NOT_RUN
PASS
FAIL
PARTIAL
NEEDS_MORE_DATA
```

Final note:

This template is only for recording validation results. It does not unblock backlog by itself. Backlog remains blocked until A1-A3 have recorded validation results and every required PRD/Architecture/ADR update has been completed or explicitly scoped out.
