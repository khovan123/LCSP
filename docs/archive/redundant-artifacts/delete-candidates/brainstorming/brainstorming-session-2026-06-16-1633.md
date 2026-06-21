---
stepsCompleted: [1, 2]
inputDocuments:
  - LCSP_Technical_Specification.html
session_topic: 'Làm rõ problem/workflow/trade-off của LCSP dựa trên technical specification hiện có.'
session_goals: 'Làm rõ vấn đề tiền-PRD; tạo nhiều câu hỏi sắc bén; mapping assumptions; so sánh workflow alternatives cho technical evidence; xác định risk/trade-off trước khi Product Brief.'
selected_approach: 'custom-progressive-flow'
techniques_used:
  - Five Whys
  - First Principles Thinking
  - Question Storming
  - Assumption Reversal
  - Constraint Mapping
  - Decision Tree Mapping
  - Solution Matrix
  - Six Thinking Hats
  - Failure Analysis
ideas_generated: []
context_file: 'LCSP_Technical_Specification.html'
---

# Brainstorming Session Results

**Facilitator:** Mary / Business Analyst
**Date:** 2026-06-16 16:33:55 +07

## Session Overview

**Topic:** Làm rõ problem/workflow/trade-off của LCSP dựa trên technical specification hiện có.

**Goals:** Làm rõ các vấn đề tiền-PRD trước khi viết Product Brief/PRD/architecture/backlog:

- Web Wizard cho Manager/Legal phải đơn giản, không yêu cầu hiểu GitHub Actions/scanner.
- Technical evidence cần đánh giá các hướng GitHub App read-only, Local/CI scanner, hoặc hybrid.
- Scanner chỉ tạo evidence, không tự kết luận pháp lý.
- Reconciliation xử lý mâu thuẫn giữa Wizard và technical evidence.
- Evidence Confidence Score, AI Intervention Score và Conflict Score cần định nghĩa rõ.
- Risk Classification chỉ chạy sau khi có Verified Profile.
- Chính sách bảo mật source code: không gửi raw source code cho LLM, không lưu raw source code dài hạn.

### Context Guidance

Input chính là `LCSP_Technical_Specification.html`, trong đó LCSP được mô tả là nền tảng hỗ trợ doanh nghiệp Việt Nam phân loại rủi ro AI, xác định nghĩa vụ tuân thủ, tạo hồ sơ/audit trail và tích hợp technical evidence từ scanner. Phiên này chỉ dùng spec làm nền để khám phá problem/workflow/trade-off, chưa tạo PRD, architecture document, backlog hoặc code.

### Technique Selection

**Approach:** Custom Progressive Flow.

- **Problem Framing:** Five Whys + First Principles Thinking.
- **Current Understanding:** Mind-map nhẹ từ spec hiện có.
- **Question Storming:** tạo câu hỏi trước khi kết luận.
- **Assumption Mapping:** Assumption Reversal + Constraint Mapping.
- **Workflow Alternatives:** Decision Tree Mapping + Solution Matrix.
- **Risk & Trade-off Mapping:** Six Thinking Hats + Failure Analysis.

## Round 1 - Baseline Framing

### Problem Framing

LCSP không chỉ là công cụ "AI legal checklist"; bài toán cốt lõi là biến một nghĩa vụ pháp lý mơ hồ, đa nguồn và khó truy vết thành một workflow đánh giá có căn cứ, có evidence và có audit trail. Điểm căng nhất nằm ở chỗ người chịu trách nhiệm pháp lý không nhất thiết hiểu hệ thống kỹ thuật, còn scanner kỹ thuật không được phép tự kết luận pháp lý.

### Current Understanding

- Manager/Legal cần khai báo business/legal context qua Web Wizard đơn giản.
- Developer/DevSecOps có thể cung cấp technical evidence qua GitHub App, local scanner, CI scanner hoặc kết hợp.
- Scanner chỉ tạo TechnicalProfile/evidence summary, không kết luận risk.
- Reconciliation biến WizardProfile + TechnicalProfile thành VerifiedProfile hoặc yêu cầu human confirmation.
- Risk Classification chỉ chạy trên VerifiedProfile, kết hợp hard rules, retrieved legal context và LLM kiểm soát nhiệt độ thấp.
- Raw source code không gửi cho LLM và không lưu dài hạn.

### Initial Question Storm

- Nếu Manager/Legal không hiểu technical evidence, họ nên xác nhận conflict ở mức ngôn ngữ nào?
- Technical evidence nào là đủ mạnh để buộc hỏi lại người dùng?
- Evidence Confidence Score đo độ tin cậy của signal kỹ thuật, hay đo độ tin cậy rằng hệ thống thực sự có AI?
- AI Intervention Score đo mức độ AI tham gia vào decision, hay mức ảnh hưởng của AI lên quyền/lợi ích người dùng?
- Conflict Score nên là điểm chênh lệch giữa wizard và evidence, hay là mức rủi ro nếu chọn sai?
- Nếu wizard nói "không tự động quyết định" nhưng code có `approved/rejected` output, hệ thống hỏi ai trước: Legal hay Developer?
- Nếu user skip scanner, VerifiedProfile có được tạo không, hay chỉ là Self-declared Profile với confidence thấp?
- GitHub App read-only có đủ chấp nhận về bảo mật cho SME không?
- Local/CI scanner có làm giảm rào cản bảo mật nhưng tăng rào cản setup không?
- Hybrid có thật sự là MVP hợp lý hay chỉ làm phức tạp UX và support?

### Assumption Seeds

- Assumption A: Legal user có thể trả lời wizard chính xác nếu câu hỏi đủ đơn giản.
- Assumption B: Scanner có thể suy ra AI usage đáng tin từ dependencies/imports/model calls/call graph.
- Assumption C: Conflict resolution có thể diễn đạt không cần thuật ngữ kỹ thuật.
- Assumption D: Không lưu raw source dài hạn vẫn đủ audit trail.
- Assumption E: GitHub App là evidence path chính hợp lý cho MVP.
- Assumption F: Risk classification nên bị khóa cho đến khi có VerifiedProfile.

### Workflow Alternatives To Explore

- **GitHub App read-only first:** UX web liền mạch, evidence tập trung, nhưng nhạy cảm về trust/security.
- **Local/CI scanner first:** bảo mật source tốt hơn, hợp DevSecOps, nhưng Legal user khó tự kích hoạt.
- **Hybrid:** cho phép chọn theo trust maturity, nhưng tăng complexity, test matrix và product messaging.

## Round 2 - Reconciliation Authority

### Key Insight

LCSP không nên có một người duy nhất xác nhận mọi conflict. Reconciliation cần phân quyền theo loại sự thật:

- **Developer / Tech Lead xác nhận technical truth:** code có chạy production không, scanner có false positive không, dependency có dùng thật không, repo/branch/commit có đúng không.
- **Manager / Legal / Compliance Owner xác nhận business/legal truth:** hệ thống dùng cho mục đích gì, ảnh hưởng đến ai, có ra quyết định nghiệp vụ không, có human review không, dữ liệu dùng cho mục đích gì.
- **Material conflicts ảnh hưởng risk classification cần dual confirmation:** Developer xác nhận evidence/code, Manager/Legal xác nhận ý nghĩa nghiệp vụ/pháp lý.
- **LCSP System không phải người xác nhận cuối cùng:** hệ thống chỉ phát hiện mâu thuẫn, giải thích bằng ngôn ngữ nghiệp vụ, gợi ý action, điều phối luồng xác nhận và ghi audit trail.

### Decision Candidate

**[Reconciliation #1]: Dual-confirmation for material conflicts**
_Concept_: Với conflict ảnh hưởng risk level, LCSP không hỏi riêng một bên. Hệ thống hỏi Developer trước để xác nhận technical evidence có đúng production logic không, sau đó hỏi Manager/Legal để xác nhận ý nghĩa nghiệp vụ/pháp lý của evidence. Final Verified Profile do Assessment Owner / Manager-Legal attest, nhưng dựa trên technical confirmation khi cần.
_Novelty_: Mô hình này tránh cả hai cực đoan: để scanner tự kết luận pháp lý hoặc để Legal tự xác nhận bằng chứng kỹ thuật mà họ không đủ ngữ cảnh.

### RACI Seed

| Loại conflict | Người xác nhận chính | Người phối hợp |
|---|---|---|
| Dependency/package có dùng thật không | Developer | - |
| Scanner false positive/false negative | Developer | - |
| Repo/branch/commit có đúng production không | Developer / DevOps | Manager |
| Có xử lý dữ liệu cá nhân/nhạy cảm không | Manager/Legal | Developer |
| AI có ảnh hưởng quyết định nghiệp vụ không | Manager/Legal | Developer |
| Có human review bắt buộc không | Manager/Legal | Developer |
| Hệ thống có tự động quyết định không | Cả hai | Cả hai |
| Có dùng external LLM không | Developer | Manager/Legal |
| Final Verified Profile | Manager/Legal | Developer |

### Working Rule

- Conflict thuần kỹ thuật -> gửi Developer xác nhận.
- Conflict thuần nghiệp vụ/pháp lý -> gửi Manager/Legal xác nhận.
- Conflict ảnh hưởng risk level -> bắt buộc cả Developer và Manager/Legal xác nhận.
- Critical conflict chưa resolve -> không cho sinh final report.

### Example Captured

Nếu Wizard khai `auto_decision = NO` nhưng scanner phát hiện `AI_TO_DECISION_FLOW` với confidence cao:

1. Hỏi Developer: finding này có đúng production logic không, hay là test/demo/false positive?
2. Nếu đúng production logic, hỏi Manager/Legal: output này có quyết định nghiệp vụ thật không, hay chỉ là gợi ý có human review?
3. Nếu cả hai xác nhận AI ảnh hưởng quyết định, cập nhật Verified Profile thành `auto_decision = YES` hoặc `AI_ASSISTED_DECISION_WITH_HUMAN_REVIEW`.
4. Sau đó mới chạy Risk Classification.

## Round 3 - Score Model Authority

### Key Insight

LCSP cần tách rõ ba lớp score nhưng chỉ một lớp có quyền block workflow:

- **Evidence Confidence Score:** đo bằng chứng kỹ thuật đáng tin tới đâu. Không tự kết luận pháp lý và không tự block.
- **AI Intervention Score:** đo AI can thiệp sâu tới đâu vào workflow/quyết định. Không tự block, chỉ là input cho risk classification.
- **Conflict Score:** đo mâu thuẫn WizardProfile vs TechnicalProfile có nghiêm trọng không. Đây là score chính có quyền block nếu conflict material/critical và có thể ảnh hưởng risk classification hoặc nghĩa vụ pháp lý.

### Decision Candidate

**[Scoring #1]: Only Conflict Score can block workflow**
_Concept_: Evidence Confidence và AI Intervention là supporting signals. Final report chỉ bị block khi có unresolved material/critical conflict có khả năng ảnh hưởng risk classification hoặc legal obligations.
_Novelty_: Cách tách này tránh nhầm "evidence mạnh" hoặc "AI can thiệp sâu" thành kết luận pháp lý tự động. LCSP chỉ chặn khi có mâu thuẫn cần con người phân xử.

### Evidence Confidence Score

| Score | Ý nghĩa | Action |
|---:|---|---|
| `< 0.40` | Evidence yếu | Không block, chỉ ghi nhận |
| `0.40 - 0.59` | Evidence chưa chắc | Warning nhẹ |
| `0.60 - 0.74` | Evidence tương đối mạnh | Có thể hỏi Developer |
| `0.75 - 0.84` | Evidence mạnh | Developer confirmation recommended |
| `>= 0.85` | Evidence rất mạnh | Developer confirmation required nếu mâu thuẫn với Wizard |

### AI Intervention Score

| Score | Ý nghĩa | Action |
|---:|---|---|
| `0.00 - 0.29` | AI hỗ trợ nhẹ hoặc nội bộ | Không block |
| `0.30 - 0.59` | AI phân tích/gợi ý | Không block, đưa vào classification |
| `0.60 - 0.74` | AI ảnh hưởng decision | Cần xem human oversight |
| `0.75 - 0.89` | AI đề xuất quyết định quan trọng | Bắt buộc hỏi về human review |
| `>= 0.90` | AI tự động quyết định/tác động quyền lợi | Không tự block, nhưng kích hoạt high-priority classification review |

### Conflict Score

| Score | Ý nghĩa | Action |
|---:|---|---|
| `< 0.40` | Không đáng kể | Không block |
| `0.40 - 0.59` | Warning | Hiển thị cảnh báo, vẫn cho chạy draft classification |
| `0.60 - 0.74` | Possible conflict | Cho chạy draft, đánh dấu cần review |
| `0.75 - 0.84` | Material conflict | Block final classification/report cho đến khi resolve |
| `>= 0.85` | Critical conflict | Block workflow bắt buộc, dual-confirmation Developer + Manager/Legal |

### Blocking Rule

LCSP chỉ block workflow khi:

```text
Conflict Score >= 0.75
AND conflict ảnh hưởng đến risk classification hoặc nghĩa vụ pháp lý
```

Critical block khi:

```text
Conflict Score >= 0.85
AND field thuộc nhóm critical:
- auto_decision
- data_types
- sector
- ai_type
- human_oversight
- external_llm_user_facing
- biometric_processing
```

### Examples Captured

- **Không block:** Scanner thấy `openai` trong `package.json`: Evidence Confidence `0.10`, AI Intervention unknown/low, Conflict `0.00`. Action: chỉ ghi nhận package declared.
- **Warning:** Scanner thấy OpenAI dependency có import nhưng chưa thấy API call: Evidence Confidence `0.45`, AI Intervention `0.30`, Conflict `0.45`. Action: warning, hỏi nhẹ Developer nếu cần.
- **Material block:** Wizard nói không auto decision, scanner thấy model output đi vào approve/reject flow: Evidence Confidence `0.88`, AI Intervention `0.90`, Conflict `0.88`. Action: block final report, Developer xác nhận production logic, Manager/Legal xác nhận ý nghĩa nghiệp vụ.

## Round 4 - Evidence Collection Strategy

### Key Insight

MVP không nên chọn cực đoan giữa "dễ dùng" và "đáng tin kỹ thuật". LCSP nên tối ưu cho Legal/Manager hoàn tất assessment dễ dàng, nhưng final evidence-based classification phải đạt mức technical trust tối thiểu.

- UX đơn giản là điều kiện để sản phẩm được dùng.
- Technical evidence là điều kiện để kết quả đáng tin.
- Nếu thiếu technical evidence, hệ thống vẫn có thể tạo draft/self-declared assessment, nhưng không nên gọi là final evidence-based report.

### Criteria Priority

| Ưu tiên | Tiêu chí | Lý do |
|---:|---|---|
| 1 | UX simplicity | Nếu Manager/Legal không hoàn tất wizard được thì hệ thống thất bại từ đầu |
| 2 | Evidence quality | Classification cần đủ căn cứ kỹ thuật để giảm sai |
| 3 | Trust/security | Nếu khách hàng không tin cách lấy source/evidence thì không adoption |
| 4 | Auditability | Compliance phải trace được repo, branch, commit, scanner version |
| 5 | Setup friction | MVP/demo cần ít bước, tránh phụ thuộc DevOps quá sớm |
| 6 | Enterprise adoption path | MVP phải có đường nâng cấp sang Local/CI scanner |

### Decision Candidate

**[Evidence Collection #1]: Hybrid strategy with GitHub App read-only as default MVP path**
_Concept_: LCSP hỗ trợ hai evidence modes: GitHub App read-only scan làm default cho MVP/SME/demo, và Local/CI Evidence Upload làm enterprise-safe alternative cho repo nhạy cảm. Roadmap gợi ý: P0 GitHub App read-only scan, P1 manual evidence upload / CLI scanner, P2 full CI integration / GitHub Action.
_Novelty_: Chiến lược này giữ Web Wizard đơn giản cho Manager/Legal nhưng vẫn không đánh đồng self-report với evidence-based result.

### Workflow Mode Distinction

Nếu user chỉ hoàn thành Wizard, chưa có technical evidence:

```text
mode = SELF_DECLARED_READINESS
classification_status = LOCKED_EVIDENCE_REQUIRED
risk_level = not_available
```

Nếu có technical evidence từ GitHub App hoặc Local/CI:

```text
classification_mode = EVIDENCE_BASED
report_status = FINAL_CANDIDATE
confidence = higher
```

Nếu có unresolved material conflict:

```text
report_status = BLOCKED_UNTIL_RECONCILED
```

### Trade-off Captured

- **GitHub App read-only default:** tốt nhất cho UX, demo end-to-end, SME onboarding và evidence richness; rủi ro chính là trust/security do LCSP truy cập source tạm thời.
- **Local/CI scanner alternative:** tốt hơn cho enterprise trust/security vì source không rời môi trường doanh nghiệp; rủi ro chính là setup friction và phụ thuộc Developer/DevOps.
- **Hybrid long-term:** tránh khóa sản phẩm vào một trust model, nhưng tăng complexity về UX, docs, support, test matrix và messaging.

### Product Principle

```text
MVP UX default = GitHub App read-only
Enterprise trust path = Local/CI scanner
Final report quality = gated by reconciliation + conflict resolution
```

## Round 5 - Classification Gating

### Key Insight

LCSP bắt buộc phải có technical evidence trước khi chạy risk classification thật sự. Wizard-only không được tạo risk level HIGH/MEDIUM/LOW, kể cả dưới dạng draft classification, vì user có thể hiểu nhầm đó là kết luận đủ căn cứ.

### Decision Candidate

**[Classification #1]: No risk level without technical evidence and VerifiedProfile**
_Concept_: Khi chưa có technical evidence, LCSP không chạy Risk Classification Agent, không hiển thị `risk_level = HIGH/MEDIUM/LOW`, không sinh final report và không gọi kết quả là classification. Hệ thống chỉ hiển thị Preliminary Risk Indicators, Technical Evidence Readiness và Missing Evidence Checklist.
_Novelty_: Quyết định này giữ đúng định vị evidence-based compliance platform và tránh biến self-report thành kết luận pháp lý giả.

### Accepted Technical Evidence Sources

| Evidence source | Có chấp nhận không? | Ghi chú |
|---|---:|---|
| GitHub App read-only scan | Có | Default MVP path |
| Local/CI scanner report | Có | Enterprise-safe path |
| Manual evidence report JSON | Có | Nếu scanner chạy ngoài hệ thống |
| API probe result | Có | Nếu endpoint test được |
| Architecture document / model card / vendor document | Có thể | Dùng khi không có source code, confidence thấp hơn |

### Wizard-only Flow

```text
Wizard Submitted
-> Waiting for Technical Evidence
-> Show Readiness Checklist
-> User connects GitHub / uploads evidence / invites Developer
-> Evidence received
-> Reconciliation
-> VerifiedProfile
-> Risk Classification
```

### UI Language Guardrails

Được phép hiển thị:

- Preliminary Risk Indicators
- Potential risk factors
- Risk indicators
- Technical Evidence Readiness
- Missing Evidence Checklist
- Likely areas to verify

Không nên hiển thị khi chưa có technical evidence:

- Draft HIGH
- Draft MEDIUM
- Draft LOW
- Preliminary risk level
- Risk Level: HIGH/MEDIUM/LOW

### Classification Modes

| Mode | Khi nào | Có risk level không? | Có export final report không? |
|---|---|---:|---:|
| `SELF_DECLARED_READINESS` | Chỉ có Wizard | Không | Không |
| `EVIDENCE_PENDING` | Đang chờ GitHub/CI/API/manual evidence | Không | Không |
| `EVIDENCE_BASED_CLASSIFICATION` | Có technical evidence + reconciliation xong | Có | Có thể |
| `BLOCKED_BY_CONFLICT` | Có material/critical conflict chưa resolve | Không final | Không |

### Hard Rule

```text
Risk Classification Agent chỉ chạy khi:
1. WizardProfile đã submit
2. TechnicalEvidence đã received/validated
3. Reconciliation đã tạo VerifiedProfile
4. Không còn material/critical conflict unresolved
```

Nếu thiếu technical evidence:

```text
classification_status = LOCKED_EVIDENCE_REQUIRED
```

## Round 6 - Technical Evidence Gates

### Key Insight

LCSP phải yêu cầu cả **schema completeness** và **quality threshold**. Hai gate này trả lời hai câu hỏi khác nhau:

- **Schema completeness:** report có đủ cấu trúc tối thiểu để hệ thống đọc, audit và mapping về assessment không?
- **Quality threshold:** evidence có đủ đáng tin để unlock Risk Classification không?

```text
Schema completeness = bắt buộc để nhận report
Quality threshold = bắt buộc để unlock Risk Classification
```

Nếu thiếu schema bắt buộc:

```text
Reject report / yêu cầu upload lại
```

Nếu đủ schema nhưng quality thấp:

```text
Accept report nhưng không unlock classification
Status = TECHNICAL_EVIDENCE_INSUFFICIENT
```

Nếu đủ schema và đạt quality threshold:

```text
Unlock Reconciliation -> VerifiedProfile -> Risk Classification
```

### Minimum Schema Gate

Technical evidence report tối thiểu phải có:

| Nhóm field | Bắt buộc? | Mục đích |
|---|---:|---|
| `assessment_id` | Có | Mapping report về đúng Wizard đã submit |
| `source_type` | Có | Biết evidence đến từ GitHub App, Local/CI, Manual JSON, API Probe |
| `system_identifier` | Có | Biết evidence thuộc hệ thống/repo/API nào |
| `provenance` | Có | Biết ai/chạy từ đâu/khi nào |
| `scanner_version` / `report_version` | Có | Audit và reproducibility |
| `timestamp` / `generated_at` | Có | Biết evidence còn mới hay không |
| `scope` | Có | Biết scanner đã quét phạm vi nào |
| `privacy_flags` | Có | Xác nhận không có raw source/full AST/secrets |
| `technical_profile` | Có | Tóm tắt AI usage/data/decision/oversight |
| `findings[]` | Có thể rỗng nhưng phải có | Danh sách evidence cụ thể |
| `confidence_per_signal` | Có | Biết signal nào mạnh/yếu |
| `report_hash` | Có | Chống chỉnh sửa report sau khi upload |

### Minimum Technical Profile

`technical_profile` phải có đủ 4 chiều chính; mỗi chiều có thể là `DETECTED`, `NOT_DETECTED` hoặc `UNKNOWN`, nhưng không được thiếu field.

| Dimension | Ý nghĩa |
|---|---|
| `ai_usage_signals` | Có dấu hiệu dùng AI/ML/LLM không |
| `data_type_signals` | Có dấu hiệu xử lý dữ liệu cá nhân/nhạy cảm không |
| `decision_flow_signals` | AI có ảnh hưởng decision/workflow không |
| `human_oversight_signals` | Có dấu hiệu human review/override/logging không |

Ví dụ scanner không thấy human oversight:

```json
{
  "human_oversight_signals": {
    "status": "NOT_DETECTED",
    "confidence": 0.62
  }
}
```

### Quality Threshold Gate

Unlock classification khi:

```text
1. Report schema hợp lệ
2. Privacy flags hợp lệ
3. Có provenance hợp lệ
4. Có technical_profile đủ 4 chiều chính
5. Evidence quality đạt ngưỡng tối thiểu
6. Reconciliation không còn material/critical conflict unresolved
```

Threshold MVP đề xuất:

| Điều kiện | Threshold đề xuất | Nếu không đạt |
|---|---:|---|
| Report schema valid | 100% | Reject report |
| Privacy flags pass | 100% | Reject report |
| Provenance present | 100% | Reject report |
| Scope coverage | `>= 0.60` | Evidence insufficient |
| At least one technical source valid | Có | Evidence insufficient |
| AI usage confidence | `>= 0.60` nếu wizard khai có AI | Ask developer / insufficient |
| Data type confidence | `>= 0.60` nếu wizard khai có personal/sensitive data | Ask confirmation |
| Decision flow confidence | `>= 0.60` nếu wizard khai auto/assisted decision | Ask confirmation |
| Conflict score | `< 0.75` | Nếu `>= 0.75` thì block until resolved |

### Context-aware Threshold

Evidence tối thiểu không cố định cho mọi hệ thống; nó phụ thuộc vào WizardProfile.

| Wizard context | Evidence requirement |
|---|---|
| Chatbot nội bộ | Chỉ cần AI usage + basic data signal |
| Public chatbot | Cần AI usage + user-facing signal + content generation signal |
| Finance/credit scoring | Cần AI usage + data type + decision flow + human oversight |
| Healthcare diagnosis | Cần AI usage + sensitive data + decision/assistive role + human oversight |
| Biometric/face recognition | Cần biometric signal + data type + purpose + retention/oversight |

### Workflow Statuses

| Trạng thái | Ý nghĩa |
|---|---|
| `TECHNICAL_EVIDENCE_MISSING` | Chưa có report |
| `TECHNICAL_EVIDENCE_REJECTED` | Report thiếu schema hoặc vi phạm privacy |
| `TECHNICAL_EVIDENCE_INSUFFICIENT` | Report hợp lệ nhưng quality thấp |
| `TECHNICAL_EVIDENCE_READY` | Report đủ schema và đạt quality |
| `RECONCILIATION_REQUIRED` | Có material/critical conflict |
| `READY_FOR_CLASSIFICATION` | Có VerifiedProfile, đủ điều kiện classification |

### Decision Candidate

**[Evidence Gate #1]: Schema completeness to accept, quality threshold to unlock**
_Concept_: Technical evidence tối thiểu không chỉ là "có file report". Report phải qua schema completeness gate để được nhận, sau đó qua quality threshold gate theo WizardProfile để unlock classification.
_Novelty_: Cách này tránh hai lỗi đối nghịch: report đủ field nhưng toàn UNKNOWN vẫn unlock classification, hoặc evidence có vẻ mạnh nhưng thiếu provenance/version/audit vẫn được dùng cho compliance.

## Round 7 - Escaping Evidence Insufficient

### Key Insight

Technical threshold không phải cổng cứng tuyệt đối theo nghĩa scanner thấp thì vĩnh viễn kẹt. Nhưng nó là cổng cứng đối với automated evidence unlock.

```text
Low-quality scanner evidence alone -> cannot unlock classification.

Low-quality scanner evidence + valid human/technical attestation
-> có thể unlock classification nếu attestation đủ schema, đúng vai trò, và không còn critical conflict.
```

Human attestation không phải "bỏ qua evidence"; nó là một loại technical evidence bổ sung, có provenance, người xác nhận, lý do, phạm vi và audit log.

### Actions When Evidence Is Insufficient

| Action | Ai làm | Khi nào dùng | Kết quả |
|---|---|---|---|
| Run scan again | Developer | Scan nhầm branch/scope thiếu/file bị exclude | Tạo report mới |
| Expand scan scope | Developer | Evidence thiếu vì scanner chỉ đọc một phần repo | Cải thiện quality |
| Select correct repo/branch/commit | Developer/DevOps | Repo scan không phải production version | Tạo provenance đúng |
| Upload Local/CI report | Developer/DevOps | Không muốn GitHub App đọc repo hoặc cần scan nội bộ | Evidence source mới |
| Upload API probe evidence | Developer | Có endpoint thể hiện hành vi runtime | Bổ sung runtime behavior |
| Upload manual technical JSON | Developer/Tech Lead | Scanner không bắt được dynamic/wrapper logic | Manual evidence có schema |
| Add human technical attestation | Developer/Tech Lead | Evidence yếu nhưng dev xác nhận production logic | Bổ sung confidence |
| Update WizardProfile | Manager/Legal | Wizard khai sai hoặc thiếu context | Giảm conflict |
| Resolve conflict | Manager/Legal + Developer | Có material/critical conflict | Tạo VerifiedProfile |
| Export readiness-only report | Manager/Legal | Không thể có technical evidence | Không có risk level |

### Valid Human Technical Attestation

Human attestation có thể unlock classification chỉ khi được định nghĩa là valid technical evidence source, không phải free-text comment.

```json
{
  "source_type": "HUMAN_TECHNICAL_ATTESTATION",
  "assessment_id": "asm_123",
  "attested_by": {
    "user_id": "user_tech_001",
    "role": "TECH_LEAD",
    "organization_id": "org_001"
  },
  "attestation_scope": {
    "system_identifier": "AI Credit Scoring",
    "repo": "company/credit-ai",
    "branch": "main",
    "commit_sha": "a91f3c",
    "environment": "production"
  },
  "claims": [
    {
      "field": "ai_usage",
      "value": "DETECTED",
      "reason": "The model inference is wrapped inside CreditScoringService and not directly detected by Semgrep."
    },
    {
      "field": "decision_flow",
      "value": "AI_ASSISTED_DECISION_WITH_HUMAN_REVIEW",
      "reason": "The model outputs a risk score, but final approval is performed by a loan officer."
    }
  ],
  "supporting_evidence_refs": ["finding_001", "finding_002"],
  "signed_at": "2026-06-16T16:50:00Z"
}
```

### Guardrails

Không cho phép:

- Developer nói "bỏ qua đi" -> unlock classification.
- Manager nói "tôi nghĩ không sao" -> unlock classification.
- Free-text comment -> unlock classification.

Chỉ cho phép:

- Role-authorized attestation.
- Structured claims.
- Mapped to assessment.
- Audit trail.
- Nếu conflict quan trọng thì có dual-confirmation.

### Unlock Paths

**Path A - Scanner evidence đủ mạnh**

```text
Schema completeness gate = PASS
Quality threshold gate = PASS
No unresolved material/critical conflict
```

**Path B - Evidence thấp nhưng có attestation hợp lệ**

```text
Schema completeness gate = PASS
Scanner evidence = insufficient
Valid technical attestation = PRESENT
Manager/Legal confirmation = PRESENT nếu ảnh hưởng business/legal meaning
No unresolved critical conflict
```

### Non-negotiable Critical Fields

Nếu technical evidence không trả lời được các field này và không có attestation hợp lệ, LCSP giữ trạng thái `TECHNICAL_EVIDENCE_INSUFFICIENT`:

- AI usage
- Data types
- Decision flow
- Human oversight
- Production scope
- System/repo/version provenance

### Final Report Disclosure

Nếu unlock nhờ attestation, final report phải ghi rõ:

```text
Classification used human technical attestation because automated scanner evidence was insufficient.
```

Audit phải lưu:

- who attested
- what was attested
- when
- based on which evidence
- which conflict was resolved

### Decision Candidate

**[Evidence Gate #2]: Structured human technical attestation as evidence source**
_Concept_: Scanner evidence thấp không tự unlock classification, nhưng user có thể bổ sung evidence source khác hoặc structured human technical attestation. Attestation chỉ hợp lệ khi đúng vai trò, đúng schema, có provenance, structured claims và audit trail.
_Novelty_: Cách này cho phép LCSP xử lý thực tế scanner không bắt được dynamic/wrapper/runtime logic mà vẫn không hạ chuẩn evidence-based compliance.

## Round 8 - MVP Role Model Simplification

### Key Insight

LCSP MVP nên expose chỉ 2 role chính:

1. **Manager**
2. **Developer**

Các vai trò như Legal, Compliance Owner, Product Owner, Tech Lead, DevOps, Security Engineer không nên là role riêng trong MVP. Chúng là responsibility nằm bên trong Manager hoặc Developer để workflow dễ hiểu, dễ demo và ít phân mảnh hơn.

### Role Model

| Role | Trách nhiệm chính | Xác nhận loại sự thật nào? |
|---|---|---|
| Manager | Trả lời Web Wizard, xác nhận nghiệp vụ, mục đích sử dụng AI, tác động người dùng, human review, final assessment | Business/legal truth |
| Developer | Kết nối repo, chạy scanner, xác nhận evidence, production scope, repo/commit, false positive/false negative | Technical truth |

### Principle

```text
Manager xác nhận: hệ thống dùng để làm gì, ảnh hưởng ai, có human review không, quyết định nghiệp vụ là gì.

Developer xác nhận: code/evidence có đúng không, repo/branch/commit có đúng không, scanner có bắt nhầm không, logic đó có chạy production không.
```

### Reconciliation With 2 Roles

| Conflict type | Người xử lý chính | Có cần cả hai không? |
|---|---|---:|
| Scanner phát hiện dependency/package AI | Developer | Không |
| Scanner nghi ngờ false positive | Developer | Không |
| Scan nhầm repo/branch/commit | Developer | Không |
| Wizard khai sai business purpose | Manager | Không |
| Wizard khai sai data/user impact | Manager | Có thể |
| AI ảnh hưởng decision/workflow | Manager + Developer | Có |
| Có auto decision hay không | Manager + Developer | Có |
| Có human review thật không | Manager + Developer | Có |
| Conflict có thể đổi risk level | Manager + Developer | Có |

### Claim Boundaries

Developer được attest:

```text
ai_usage
model_call_is_production
repo_branch_commit
deployment_scope
decision_flow_in_code
scanner_false_positive
scanner_false_negative
technical_profile_correction
```

Manager được confirm:

```text
business_purpose
user_group
affected_rights_or_benefits
human_review_process
decision_owner
legal/compliance meaning
final assessment confirmation
```

Bắt buộc cả hai cùng xác nhận:

```text
auto_decision
ai_assisted_decision
human_oversight
sensitive_data_usage
user-facing_external_llm
biometric_or_high-impact_use_case
any conflict that can change risk level
```

### Claims Not Allowed As Human-attestation-only

Các claim sau vẫn cần machine-generated evidence hoặc external document:

```text
report_hash
scanner_version
ruleset_version
scan_timestamp
repo/commit metadata
privacy flags generated by scanner
dependency inventory / SBOM
legal corpus version
vendor compliance documents
```

Developer có thể giải thích hoặc xác nhận ý nghĩa kỹ thuật, nhưng không được tự khai thay metadata khách quan.

### UI Implication

```text
Manager Workspace
Developer Workspace
```

Manager Workspace:

- Fill Wizard
- View readiness
- Resolve business conflicts
- Approve VerifiedProfile
- Generate report

Developer Workspace:

- Connect GitHub / upload scanner report
- Review scanner findings
- Confirm false positives
- Provide structured technical attestation

### Decision Candidate

**[Role Model #1]: Two user-facing roles for MVP**
_Concept_: Manager owns business/legal truth. Developer owns technical truth. LCSP coordinates reconciliation. Material conflicts require dual confirmation from both Manager and Developer.
_Novelty_: Giữ mô hình trách nhiệm đủ chặt cho compliance nhưng tránh biến MVP thành enterprise IAM/workflow phức tạp.

## Round 9 - Manager-led Workflow With Developer Tasks

### Key Insight

MVP không nên là pure sequential handoff vì quá cứng, cũng không nên là full parallel collaboration vì nhiều trạng thái và khó demo. Flow đúng hơn là:

```text
Manager owns the assessment.
Developer only receives technical tasks assigned by Manager.
LCSP tracks progress and merges evidence when ready.
```

### Permission Principle

- Manager có tất cả quyền assessment.
- Manager mời Developer vào assessment.
- Khi mời Developer, Manager chọn policy cho Developer.
- Developer chỉ thấy và làm được các việc nằm trong policy đó.
- Developer không có các policy của Manager.
- Developer không được final approve, không được generate final report, không được sửa business/legal answer nếu không được cấp quyền.

### Workspace Model

| Workspace | Người dùng | Mục đích |
|---|---|---|
| Manager Workspace | Manager | Tạo assessment, điền Wizard, mời Developer, theo dõi progress, resolve business conflict, approve VerifiedProfile, generate report |
| Developer Workspace | Developer | Kết nối repo, chạy scan, upload evidence, review findings, attest technical truth, resolve technical tasks |

### Proposed Flow

```text
Manager creates assessment
-> Manager fills Web Wizard
-> LCSP detects technical evidence required
-> Manager invites Developer
-> Manager selects Developer policy
-> Developer connects repo / uploads report / confirms findings
-> LCSP runs schema + quality gates
-> LCSP performs reconciliation
-> If conflict:
     - Developer resolves technical truth
     - Manager resolves business/legal meaning
-> LCSP creates VerifiedProfile
-> Manager approves VerifiedProfile
-> LCSP unlocks Risk Classification
-> Manager generates final report
```

### Developer Policy Model

| Developer policy | Developer được làm gì |
|---|---|
| `CONNECT_REPOSITORY` | Kết nối GitHub repo hoặc chọn repo cần scan |
| `RUN_SCAN` | Chạy scanner / re-scan / chọn branch/commit |
| `UPLOAD_EVIDENCE` | Upload Local/CI scanner report hoặc manual technical JSON |
| `VIEW_TECHNICAL_FINDINGS` | Xem technical findings, confidence, evidence refs |
| `CONFIRM_FINDINGS` | Xác nhận finding đúng/sai, false positive/false negative |
| `ATTEST_TECHNICAL_CLAIMS` | Attest các claim kỹ thuật có cấu trúc |
| `RESOLVE_TECHNICAL_CONFLICTS` | Xử lý conflict thuộc technical truth |
| `VIEW_LIMITED_ASSESSMENT_CONTEXT` | Xem context tối thiểu cần thiết để hiểu task |

Developer không có:

```text
EDIT_WIZARD_BUSINESS_ANSWERS
APPROVE_VERIFIED_PROFILE
RUN_FINAL_CLASSIFICATION
GENERATE_FINAL_REPORT
EXPORT_COMPLIANCE_DOSSIER
CHANGE_MANAGER_DECISIONS
INVITE_OTHER_USERS
MANAGE_ASSESSMENT_SETTINGS
```

### Manager Policy

Manager mặc định có toàn quyền:

```text
CREATE_ASSESSMENT
EDIT_WIZARD
INVITE_DEVELOPER
ASSIGN_DEVELOPER_POLICY
VIEW_ALL_PROGRESS
RESOLVE_BUSINESS_CONFLICTS
APPROVE_VERIFIED_PROFILE
UNLOCK_CLASSIFICATION_AFTER_GATES
GENERATE_REPORT
EXPORT_AUDIT_TRAIL
```

### State Model

| State | Ý nghĩa |
|---|---|
| `WIZARD_IN_PROGRESS` | Manager đang điền Wizard |
| `TECHNICAL_EVIDENCE_REQUIRED` | Cần Developer/repo/report |
| `DEVELOPER_INVITED` | Manager đã mời Developer |
| `EVIDENCE_COLLECTION_IN_PROGRESS` | Developer đang kết nối repo/chạy scan/upload report |
| `EVIDENCE_READY` | Evidence pass schema + quality gate |
| `RECONCILIATION_REQUIRED` | Có conflict cần xử lý |
| `DEVELOPER_CONFIRMATION_REQUIRED` | Cần Developer xác nhận technical truth |
| `MANAGER_CONFIRMATION_REQUIRED` | Cần Manager xác nhận business/legal meaning |
| `VERIFIED_PROFILE_READY` | VerifiedProfile đã sẵn sàng |
| `READY_FOR_CLASSIFICATION` | Đủ điều kiện chạy Risk Classification |
| `REPORT_READY` | Có thể generate report |

### Decision Candidate

**[Workflow #1]: Manager-led with task-based Developer participation**
_Concept_: Manager là assessment owner và có toàn quyền. Developer chỉ tham gia theo policy được Manager cấp, không có quyền của Manager. LCSP điều phối task, kiểm soát evidence gates, reconciliation và audit trail.
_Novelty_: Flow này dễ demo hơn full collaboration nhưng không giả tạo như sequential handoff; nó vẫn cho phép conflict lặp lại, scan lại, sửa Wizard và bổ sung evidence.

## Session Close - High-risk Assumptions and Artifact Plan

### Highest-risk assumption

**Wizard simplicity vs completeness** là assumption nguy hiểm nhất. Manager là entry point chính của LCSP. Nếu Wizard hỏi quá kỹ thuật, Manager không trả lời được. Nếu Wizard hỏi quá đơn giản, LCSP thiếu business/legal truth để đối chiếu với technical evidence.

```text
Nếu WizardProfile sai hoặc thiếu, toàn bộ pipeline phía sau sẽ bị lệch:
WizardProfile -> Reconciliation -> VerifiedProfile -> Risk Classification -> Gap Analysis -> Document
```

### Second-risk assumption

**Legal corpus/rule reliability** là rủi ro nền tảng của Risk Classification Agent. LCSP không thể chỉ dựa vào LLM để suy luận luật. Legal rules cần versioned, cited, traceable và mapping rõ vào risk criteria.

### Third-risk assumption

**Human attestation abuse risk** là rủi ro governance. Vì LCSP cho phép structured human attestation unlock classification trong một số trường hợp, hệ thống phải kiểm soát đúng role, đúng schema, dual-confirmation cho critical claims, và disclosure trong report.

### Conclusion

Có thể chuyển sang Product Brief sau khi các assumption rủi ro cao được ghi rõ dưới dạng open questions và validation tasks. Không nên chuyển thẳng sang PRD, architecture, backlog hoặc code.

### Final Artifacts

- `brainstorming-summary.md`
- `open-questions.md`
- `decision-candidates.md`
- `next-step-recommendation.md`
