# LCSP Validation Run Checklist

## Purpose

Checklist này dùng khi team chạy validation thực tế cho A1-A3. Mục tiêu là giúp team biết cần chuẩn bị gì, chạy theo thứ tự nào, kiểm tra gì, và ghi kết quả vào đâu.

Checklist này không tự điền validation result, không giả định A1-A3 đã pass, không tạo backlog và không sửa PRD/Architecture/ADR.

## Pre-run Checklist

Trước khi chạy validation, xác nhận:

| Check | Status |
| --- | --- |
| `docs/product/validation-results-template.md` tồn tại và đang ở trạng thái `NOT_RUN` | [ ] |
| 3 scenario cho A1 đã chuẩn bị: Internal AI chatbot, Credit scoring / loan approval, HR screening / recruitment AI | [ ] |
| Legal rules/citations sample cho A2 đã chuẩn bị | [ ] |
| Abuse cases cho A3 đã chuẩn bị | [ ] |
| Owner cho A1 đã xác nhận | [ ] |
| Owner cho A2 đã xác nhận | [ ] |
| Owner cho A3 đã xác nhận | [ ] |
| Người ghi kết quả validation đã được chỉ định | [ ] |
| Team thống nhất ghi kết quả vào `docs/product/validation-results-template.md` | [ ] |
| Team thống nhất status chỉ dùng `NOT_RUN`, `PASS`, `FAIL`, `PARTIAL`, `NEEDS_MORE_DATA` | [ ] |

## Execution Order

Chạy theo thứ tự:

1. **A1 - Wizard simplicity vs completeness**
   - Chạy trước vì kết quả có thể thay đổi WizardProfile schema và input cho reconciliation.
2. **A2 - Legal corpus / rule reliability**
   - Có thể chuẩn bị song song, nhưng nên dùng scenario đã ổn định từ A1.
3. **A3 - Human attestation abuse risk**
   - Chạy sau khi đã có enough context về conflict/evidence/rule để test abuse surface.
4. **Cross-review**
   - Kiểm tra kết quả có yêu cầu update PRD/Architecture/ADR không.
5. **Backlog gate decision**
   - Chỉ quyết định sau khi A1-A3 có result và required updates đã xử lý.

## A1 Run Checklist

Test scenarios:

- [ ] Internal AI chatbot
- [ ] Credit scoring / loan approval
- [ ] HR screening / recruitment AI

Với mỗi scenario, kiểm tra:

| Check | Mark |
| --- | --- |
| Manager có hiểu câu hỏi không? | [ ] |
| Có cần Developer giải thích không? | [ ] |
| Wizard có capture đủ critical fields không? | [ ] |
| Có câu hỏi nào quá kỹ thuật không? | [ ] |
| Field nào thiếu đã được ghi lại chưa? | [ ] |
| Có cần update WizardProfile schema không? | [ ] |
| Có cần update PRD không? | [ ] |
| Kết quả đã ghi vào `A1 — Wizard Simplicity vs Completeness Results` chưa? | [ ] |

Critical fields cần kiểm tra:

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

## A2 Run Checklist

Validation samples:

- [ ] Low-risk/internal assistant
- [ ] AI-assisted decision
- [ ] High-impact/sensitive data scenario
- [ ] A2-b Internal summarization / internal assistant mapping
- [ ] A2-b Loan approval / credit scoring mapping
- [ ] A2-b HR screening / recruitment ranking mapping
- [ ] A2-b Customer-facing chatbot without decision mapping

Với mỗi sample, kiểm tra:

| Check | Mark |
| --- | --- |
| Có legal source không? | [ ] |
| Có citation không? | [ ] |
| Có `rule_id` không? | [ ] |
| Risk output có trace được về rule không? | [ ] |
| Nếu thiếu rule/citation thì system có degraded/blocked đúng không? | [ ] |
| LLM có bị chặn khỏi việc tự suy luận luật không? | [ ] |
| AIUsageFlow có xác định đúng business_process / ai_purpose / automation_level không? | [ ] |
| Legal Rule Matching có dùng AIUsageFlow thay vì chỉ provider/model/dependency không? | [ ] |
| Usage purpose có map đúng legal rule/corpus expected không? | [ ] |
| Usage purpose không rõ có được mark uncertain và block/degrade/route confirmation không? | [ ] |
| Required legal/rule gap đã được ghi lại chưa? | [ ] |
| Kết quả đã ghi vào `A2 — Legal Corpus / Rule Reliability Results` chưa? | [ ] |

A2-b pass only if:

- [ ] High-impact/decision fixtures map to correct rule family/corpus or are blocked as uncertain.
- [ ] Internal summarization/internal assistant is not mapped to automated-decision/high-impact solely because AI provider/framework exists.
- [ ] 100% critical AIUsageFlow claims used for rule matching have evidence refs.
- [ ] Unclear usage purpose does not produce final classification.

## A3 Run Checklist

Abuse cases:

- [ ] Manager cố giảm mức độ AI impact dù scanner evidence cho thấy downstream decision path
- [ ] Manager khai báo có human review nhưng không có process evidence hỗ trợ
- [ ] Manager cố resolve conflict bằng cách xóa hoặc bỏ qua technical evidence
- [ ] Manager để conflict unresolved nhưng vẫn yêu cầu classification
- [ ] Manager thay đổi declaration sau khi TechnicalProfile đã được tạo
- [ ] Manager yêu cầu final document khi thiếu citation hoặc còn unresolved conflict

Với mỗi abuse case, kiểm tra:

| Check | Mark |
| --- | --- |
| System accept/reject/block đúng không? | [ ] |
| Có audit event không? | [ ] |
| Có vi phạm forbidden metadata rule không? | [ ] |
| Manager resolution có traceable confirmation/update/evidence refs không? | [ ] |
| Có giữ nguyên nguyên tắc Manager là final conflict resolver không? | [ ] |
| Developer có bị dùng như prerequisite để unlock workflow không? | [ ] |
| Có cần update attestation policy không? | [ ] |
| Có cần update PRD không? | [ ] |
| Có cần update Architecture/ADR không? | [ ] |
| Kết quả đã ghi vào `A3 — Human Attestation Abuse Risk Results` chưa? | [ ] |

Forbidden metadata không được thay bằng attestation:

```text
report hash
scanner version
ruleset version
scan timestamp
repo/commit metadata
legal corpus version
evidence report integrity
machine-generated privacy flags
```

Current MVP conflict rule:

```text
Manager is the final conflict resolver.
Developer clarification is optional and Post-MVP/delegated only.
Unresolved conflict blocks classification and final document generation.
```

## Phase 4.1 Preparation Checklist

Trước khi thu thập validation evidence thật:

| Check | Mark |
| --- | --- |
| `docs/validation/README.md` đã được review | [ ] |
| A1 execution pack đã được review | [ ] |
| A2 execution pack đã được review | [ ] |
| A2-b execution pack đã được review | [ ] |
| A3 execution pack đã được review | [ ] |
| Recruitment plan đã tách rõ A1/A2/A2-b/A3 reviewer roles | [ ] |
| Consent/privacy/data-handling plan đã được chấp thuận | [ ] |
| Evidence capture template đã được thống nhất | [ ] |
| Decision rubric đã được thống nhất | [ ] |
| Fixture release register đã được chuyển từ `DRAFT` sang `APPROVED_FOR_VALIDATION` cho fixture được dùng | [ ] |
| A1 session count và acceptance threshold đã được chốt | [ ] |
| A2 legal reviewer count, citation threshold và disagreement rule đã được chốt | [ ] |
| A2-b metric thresholds đã được chốt | [ ] |
| A3 abuse/governance acceptance threshold đã được chốt | [ ] |
| Không dùng real customer repository, source code, secret, raw prompt hoặc personal data trong validation artifacts | [ ] |

## Phase 4.1.1 Decision Approval Checklist

Trước khi chạy lại Phase 4.2 readiness check:

| Check | Mark |
| --- | --- |
| `docs/validation/validation-execution-decision-log.md` đã được review | [ ] |
| Mọi stream muốn chạy có required decisions ở trạng thái `APPROVED_FOR_EXECUTION` | [ ] |
| A1 owner, moderator, session count và threshold đã được owner xác nhận | [ ] |
| A2 legal reviewers, adjudicator, corpus version và disagreement protocol đã được owner xác nhận | [ ] |
| A2-b1 technical reviewers, legal-eligibility reviewer, adjudicator và thresholds đã được owner xác nhận | [ ] |
| A2-b fixture specification cards đã finalized, hash đã được tạo và fixture chuyển sang `APPROVED_FOR_VALIDATION` | [ ] |
| A3 governance/security reviewers và threshold đã được owner xác nhận | [ ] |
| Evidence storage provider/location, custodian, ACL, retention owner và deletion method đã được owner xác nhận | [ ] |

Nếu bất kỳ item execution-critical nào vẫn là `PENDING_OWNER_CONFIRMATION`, validation stream tương ứng vẫn không được bắt đầu.

## Phase 4.1.2 Normalized Approval Checklist

Use this checklist before rerunning Phase 4.2.

| Check | Status |
| --- | --- |
| Project Lead confirmation `DEC-VAL-2026-001` recorded | [x] |
| D-01 A1/A2-b1/A3/storage RACI normalized | [x] |
| D-02 A1 session design and thresholds approved | [x] |
| D-03 formal legal reliability limitation recorded | [x] |
| D-04 A2-b1 scope, reviewers and thresholds approved | [x] |
| D-05 A3 reviewers and fail-closed thresholds approved | [x] |
| D-06 GitHub private repository storage owner attestation recorded | [x] |
| D-07 fixture approver, finalized cards, hashes and `APPROVED_FOR_VALIDATION` status completed | [ ] |

Phase 4.1.2 permits only a Phase 4.2 readiness recheck. Evidence collection still requires the next checkpoint to list the specific validation stream under `VALIDATION_EVIDENCE_COLLECTION_ALLOWED_FOR`.

## Result Status Rules

Chỉ dùng các status sau:

| Status | Khi nào dùng |
| --- | --- |
| `NOT_RUN` | Test case chưa chạy |
| `PASS` | Test case đạt đầy đủ expected result |
| `FAIL` | Test case vi phạm critical requirement hoặc làm sai product constraint |
| `PARTIAL` | Đạt một phần nhưng cần sửa PRD, Architecture hoặc policy |
| `NEEDS_MORE_DATA` | Chưa đủ dữ liệu để kết luận |

Không mark assumption tổng thể là `PASS` nếu còn bất kỳ test case con nào là `NOT_RUN`, `FAIL`, `PARTIAL` hoặc `NEEDS_MORE_DATA`.

## Where to Record Results

Ghi kết quả vào:

```text
docs/product/validation-results-template.md
```

Mapping:

| Validation | Section cần cập nhật |
| --- | --- |
| A1 | `A1 — Wizard Simplicity vs Completeness Results` |
| A2 | `A2 — Legal Corpus / Rule Reliability Results` |
| A3 | `A3 — Human Attestation Abuse Risk Results` |
| All | `Consolidated Result Matrix` |
| FAIL / PARTIAL | `Failed / Partial Test Cases` |
| Requirement-impacting change | `Required PRD Updates` |
| Design-impacting change | `Required Architecture / ADR Updates` |
| Final decision | `Backlog Unblock Decision` |
| Review | `Final Review Sign-off` |

## Backlog Gate Rules

Backlog remains `BLOCKED` nếu:

- Còn test case `NOT_RUN`.
- Có critical `FAIL` unresolved.
- Có `PARTIAL` chưa được xử lý bằng PRD/Architecture/ADR update hoặc scope decision.
- Có PRD update required nhưng chưa update.
- Có Architecture/ADR revisit required nhưng chưa revisit.
- Final sign-off chưa hoàn tất.

Backlog chỉ được phép unblock khi:

- A1, A2, A3 đều có validation result.
- Không còn unresolved critical `FAIL`.
- Mọi PRD update cần thiết đã xử lý.
- Mọi Architecture/ADR revisit cần thiết đã xử lý.
- Final sign-off đã hoàn tất.

Backlog decision chỉ được đổi từ:

```text
BACKLOG_BLOCKED
```

sang:

```text
BACKLOG_UNBLOCKED
```

khi toàn bộ gate trên pass.

## Final Sign-off Checklist

Trước khi xem xét unblock backlog:

| Sign-off item | Mark |
| --- | --- |
| A1 owner đã review kết quả | [ ] |
| A2 owner đã review kết quả | [ ] |
| A3 owner đã review kết quả | [ ] |
| Product Manager đã xác nhận PRD update status | [ ] |
| Architect đã xác nhận Architecture/ADR revisit status | [ ] |
| Không còn unresolved critical `FAIL` | [ ] |
| `validation-results-template.md` đã cập nhật đầy đủ | [ ] |
| Backlog decision đã được ghi rõ | [ ] |

Nếu bất kỳ item nào chưa hoàn tất:

```text
Backlog remains BLOCKED.
```
