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

Với mỗi sample, kiểm tra:

| Check | Mark |
| --- | --- |
| Có legal source không? | [ ] |
| Có citation không? | [ ] |
| Có `rule_id` không? | [ ] |
| Risk output có trace được về rule không? | [ ] |
| Nếu thiếu rule/citation thì system có degraded/blocked đúng không? | [ ] |
| LLM có bị chặn khỏi việc tự suy luận luật không? | [ ] |
| Required legal/rule gap đã được ghi lại chưa? | [ ] |
| Kết quả đã ghi vào `A2 — Legal Corpus / Rule Reliability Results` chưa? | [ ] |

## A3 Run Checklist

Abuse cases:

- [ ] Developer cố thay `scanner_version` bằng attestation
- [ ] Manager cố xác nhận technical truth một mình
- [ ] Developer phủ nhận `auto_decision` dù Conflict Score cao
- [ ] Attestation thiếu scope/timestamp/reason
- [ ] Critical claim thiếu dual confirmation

Với mỗi abuse case, kiểm tra:

| Check | Mark |
| --- | --- |
| System accept/reject/block đúng không? | [ ] |
| Có audit event không? | [ ] |
| Có vi phạm forbidden metadata rule không? | [ ] |
| Có đúng dual-confirmation rule không? | [ ] |
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
