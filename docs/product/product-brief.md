# Product Brief: LCSP - Legal Compliance Support Platform

## 1. Executive Summary

LCSP là nền tảng hỗ trợ tuân thủ pháp lý cho doanh nghiệp sử dụng AI tại Việt Nam. Sản phẩm giúp doanh nghiệp thu thập thông tin nghiệp vụ, bổ sung technical evidence, đối chiếu mâu thuẫn, phân loại rủi ro AI có căn cứ, phân tích nghĩa vụ tuân thủ và tạo hồ sơ/audit trail phục vụ kiểm tra.

LCSP không được định vị là chatbot pháp lý hoặc checklist tự khai đơn giản. Định vị cốt lõi là **evidence-based compliance platform**: mọi risk classification thật sự phải dựa trên WizardProfile, technical evidence, reconciliation và VerifiedProfile. Nếu chỉ có Wizard mà chưa có technical evidence, hệ thống chỉ hiển thị readiness checklist và preliminary indicators, không hiển thị risk level HIGH/MEDIUM/LOW.

Product Brief này tổng hợp quyết định nền từ các artifact brainstorming: `brainstorming-summary.md`, `decision-candidates.md`, `open-questions.md`, `next-step-recommendation.md`, session brainstorming gốc và `LCSP_Technical_Specification.html`. Đây là input cho Product Brief/PRD sau này, chưa phải PRD, architecture, backlog hoặc implementation plan.

## 2. Problem Statement

Doanh nghiệp triển khai AI tại Việt Nam phải tự phân loại rủi ro, xác định nghĩa vụ tuân thủ, chuẩn bị hồ sơ kỹ thuật và chứng minh căn cứ quyết định khi bị kiểm tra. Quy trình hiện tại phân mảnh: quy định nằm trong nhiều văn bản, business owner không chắc cách diễn giải nghĩa vụ, developer hiểu hệ thống kỹ thuật nhưng không sở hữu ý nghĩa pháp lý, còn hồ sơ/audit trail thường được lưu thủ công.

Vấn đề chính không chỉ là thiếu một checklist. Vấn đề là thiếu một workflow đáng tin để kết nối:

- business/legal truth từ Manager;
- technical truth từ Developer;
- evidence từ scanner, Local/CI report, API probe hoặc attestation có kiểm soát;
- legal corpus/rules có citation và version;
- reconciliation để tạo VerifiedProfile trước khi classification.

Nếu WizardProfile sai hoặc thiếu, toàn bộ pipeline phía sau sẽ lệch: Reconciliation, VerifiedProfile, Risk Classification, Gap Analysis và Document Generation đều có thể tạo kết quả có vẻ đầy đủ nhưng yếu về căn cứ.

## 3. Target Users

### Manager

Manager là người sở hữu assessment. Trong MVP, Manager bao gồm business owner, legal/compliance owner, product owner hoặc người chịu trách nhiệm cuối cùng cho assessment.

Manager cần:

- điền Web Wizard bằng ngôn ngữ nghiệp vụ, không phải thuật ngữ kỹ thuật;
- hiểu assessment đang thiếu technical evidence nào;
- mời Developer thực hiện technical tasks;
- xử lý conflict thuộc business/legal meaning;
- approve VerifiedProfile;
- generate report khi đủ điều kiện.

### Developer

Developer là người sở hữu technical truth. Trong MVP, Developer bao gồm developer, tech lead, DevOps, security engineer hoặc người hiểu source code/deployment/evidence.

Developer cần:

- kết nối repo hoặc upload evidence report;
- chạy scan/re-scan;
- review technical findings;
- xác nhận false positive/false negative;
- cung cấp structured technical attestation khi scanner evidence chưa đủ;
- xử lý technical conflicts được giao.

## 4. Current Pain Points

- Manager không biết cách chuyển câu hỏi pháp lý thành thông tin kỹ thuật có thể kiểm chứng.
- Developer có thể xác nhận code/evidence nhưng không nên tự kết luận ý nghĩa pháp lý.
- Wizard-only self-report dễ sai ở các field như auto decision, data type, external LLM, biometric, human review.
- Scanner có thể phát hiện signal kỹ thuật nhưng không được tự kết luận risk level hoặc legal obligation.
- Nếu không có evidence gate và reconciliation, hệ thống dễ overclaim: hiển thị risk level dù chưa đủ căn cứ.
- Nếu attestation không bị kiểm soát, nó có thể trở thành nút "bỏ qua scanner".

## 5. Product Vision

LCSP trở thành workflow đáng tin để doanh nghiệp đánh giá tuân thủ AI tại Việt Nam dựa trên evidence, không dựa trên tự khai đơn thuần. Sản phẩm giúp Manager hoàn tất assessment mà không cần hiểu source code, đồng thời buộc các kết luận quan trọng phải có technical evidence, reconciliation và audit trail.

Tầm nhìn dài hơn là LCSP có thể hỗ trợ nhiều evidence modes: GitHub App read-only cho onboarding nhanh, Local/CI scanner cho doanh nghiệp nhạy cảm, manual evidence/API probe cho hệ thống không thể scan trực tiếp, và legal update tracking để đánh dấu hồ sơ cần đánh giá lại.

## 6. Core Workflow

MVP nên dùng **Manager-led workflow with task-based Developer participation**.

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

Nguyên tắc: Manager owns the assessment. Developer only receives technical tasks assigned by Manager. LCSP tracks progress, evidence gates, reconciliation and audit trail.

Trace: `decision-candidates.md` Candidate 8; `brainstorming-summary.md` Workflow model.

## 7. MVP Scope

MVP nên tập trung vào:

- Web Wizard cho Manager.
- Manager-led assessment workspace.
- Developer task workspace.
- GitHub App read-only scan làm default evidence path.
- Upload evidence report/manual technical JSON ở mức tối thiểu nếu cần fallback.
- Evidence schema completeness gate.
- Context-aware quality threshold gate ở mức rule bảo thủ.
- Reconciliation WizardProfile vs TechnicalProfile.
- Dual-confirmation cho material conflicts.
- Risk Classification Agent chỉ sau VerifiedProfile.
- Readiness-only output khi chưa có technical evidence.
- Audit trail cho evidence, conflict resolution, attestation và final approval.

MVP không nên cố gắng bao phủ toàn bộ enterprise workflow, IAM phức tạp hoặc CI/CD production-grade ngay từ đầu.

## 8. Non-Goals

MVP không làm:

- Không tạo PRD/architecture/backlog từ Product Brief này.
- Không cung cấp tư vấn pháp lý ràng buộc thay luật sư.
- Không nộp hồ sơ trực tiếp lên cổng MoST.
- Không hỗ trợ đa quốc gia hoặc khung luật ngoài Việt Nam.
- Không expose nhiều role riêng như Legal, DevOps, Security, Organization Admin.
- Không cho Wizard-only sinh HIGH/MEDIUM/LOW.
- Không dùng free-text attestation để unlock classification.
- Không gửi raw source code cho LLM.
- Không lưu raw source code dài hạn.

## 9. Key Product Decisions from Brainstorming

### Evidence-based positioning

LCSP là evidence-based compliance platform, không phải chatbot/checklist đơn giản.

Trace: `brainstorming-summary.md` Core Problem; `next-step-recommendation.md` Conditions for Product Brief.

### Two user-facing roles

MVP chỉ expose 2 role: Manager và Developer.

- Manager owns business/legal truth.
- Developer owns technical truth.

Trace: `decision-candidates.md` Candidate 7.

### Manager-led workflow

Manager là assessment owner. Developer chỉ tham gia theo policy/task được Manager cấp.

Trace: `decision-candidates.md` Candidate 8.

### No risk level without technical evidence

Không có technical evidence thì không có HIGH/MEDIUM/LOW. Wizard-only chỉ tạo `SELF_DECLARED_READINESS`, readiness checklist và preliminary indicators.

Trace: `decision-candidates.md` Candidate 4.

### Conflict Score is the only blocking score

Only Conflict Score can block workflow. Evidence Confidence Score và AI Intervention Score chỉ là supporting signals.

Trace: `decision-candidates.md` Candidate 2.

### Hybrid evidence strategy

GitHub App read-only là default MVP evidence path. Local/CI scanner hoặc manual evidence upload là enterprise-safe alternative.

Trace: `decision-candidates.md` Candidate 3.

### Controlled technical attestation

Human technical attestation là controlled evidence supplement, không phải bypass. Attestation phải có role, schema, provenance, structured claims và audit trail.

Trace: `decision-candidates.md` Candidate 6.

## 10. Evidence-Based Classification Principle

Risk Classification Agent chỉ chạy khi tất cả điều kiện sau đúng:

```text
1. WizardProfile submitted
2. Technical evidence received
3. Schema completeness gate passed
4. Quality threshold gate passed
5. Reconciliation tạo được VerifiedProfile
6. Không còn material/critical conflict unresolved
```

Nếu chỉ có Wizard:

```text
mode = SELF_DECLARED_READINESS
classification_status = LOCKED_EVIDENCE_REQUIRED
risk_level = not_available
```

Nếu đang chờ evidence:

```text
mode = EVIDENCE_PENDING
classification_status = LOCKED_EVIDENCE_REQUIRED
risk_level = not_available
```

Nếu evidence và reconciliation đủ điều kiện:

```text
classification_mode = EVIDENCE_BASED_CLASSIFICATION
report_status = FINAL_CANDIDATE
risk_level = HIGH | MEDIUM | LOW
```

Nếu có material/critical conflict chưa resolve:

```text
mode = BLOCKED_BY_CONFLICT
report_status = BLOCKED_UNTIL_RECONCILED
risk_level = no_final_risk_level
```

## 11. Role & Permission Model

### Manager permissions

Manager mặc định có toàn quyền trong assessment:

- `CREATE_ASSESSMENT`
- `EDIT_WIZARD`
- `INVITE_DEVELOPER`
- `ASSIGN_DEVELOPER_POLICY`
- `VIEW_ALL_PROGRESS`
- `RESOLVE_BUSINESS_CONFLICTS`
- `APPROVE_VERIFIED_PROFILE`
- `UNLOCK_CLASSIFICATION_AFTER_GATES`
- `GENERATE_REPORT`
- `EXPORT_AUDIT_TRAIL`

### Developer policies

Manager có thể cấp một hoặc nhiều policy cho Developer:

- `CONNECT_REPOSITORY`
- `RUN_SCAN`
- `UPLOAD_EVIDENCE`
- `VIEW_TECHNICAL_FINDINGS`
- `CONFIRM_FINDINGS`
- `ATTEST_TECHNICAL_CLAIMS`
- `RESOLVE_TECHNICAL_CONFLICTS`
- `VIEW_LIMITED_ASSESSMENT_CONTEXT`

Developer không có quyền:

- `EDIT_WIZARD_BUSINESS_ANSWERS`
- `APPROVE_VERIFIED_PROFILE`
- `RUN_FINAL_CLASSIFICATION`
- `GENERATE_FINAL_REPORT`
- `EXPORT_COMPLIANCE_DOSSIER`
- `CHANGE_MANAGER_DECISIONS`
- `INVITE_OTHER_USERS`
- `MANAGE_ASSESSMENT_SETTINGS`

## 12. Evidence Collection Strategy

### Default MVP path: GitHub App read-only

Dùng cho demo capstone, SME, startup/team nhỏ và low-friction onboarding.

Lý do:

- UX tốt nhất cho Web Wizard.
- Manager không cần hiểu GitHub Actions.
- Dễ scan trực tiếp sau Wizard.
- Dễ tạo evidence đủ giàu cho reconciliation.

Rủi ro cần validate: khách hàng có chấp nhận LCSP truy cập source tạm thời dù không lưu raw source dài hạn không?

### Enterprise-safe alternative: Local/CI evidence

Dùng cho repo nhạy cảm, doanh nghiệp lớn hoặc team có DevSecOps.

Lý do:

- Source code không rời khỏi môi trường doanh nghiệp.
- Phù hợp trust/security cao hơn.
- Là đường nâng cấp dài hạn ngoài MVP default.

### Evidence gates

Technical evidence report phải qua:

1. **Schema completeness gate** để accept report.
2. **Quality threshold gate** để unlock classification.

Nếu thiếu schema hoặc vi phạm privacy:

```text
TECHNICAL_EVIDENCE_REJECTED
```

Nếu schema hợp lệ nhưng quality thấp:

```text
TECHNICAL_EVIDENCE_INSUFFICIENT
```

Nếu đủ schema và đạt quality:

```text
TECHNICAL_EVIDENCE_READY
```

## 13. Reconciliation & Scoring Principles

### Reconciliation authority

LCSP không xác nhận sự thật cuối cùng. LCSP phát hiện mâu thuẫn, giải thích bằng ngôn ngữ phù hợp, điều phối task xác nhận và ghi audit trail.

- Developer xác nhận technical truth: code/evidence có đúng không, repo/branch/commit có đúng không, scanner có false positive không, logic đó có chạy production không.
- Manager xác nhận business/legal truth: hệ thống dùng để làm gì, ảnh hưởng ai, có human review không, quyết định nghiệp vụ là gì.
- Material conflicts require dual confirmation from Manager and Developer.

### Score model

- **Evidence Confidence Score:** evidence kỹ thuật đáng tin tới đâu. Không tự block.
- **AI Intervention Score:** AI can thiệp sâu tới đâu vào workflow/decision. Không tự block.
- **Conflict Score:** WizardProfile và TechnicalProfile mâu thuẫn nghiêm trọng không. Đây là score duy nhất có quyền block.

Blocking rule:

```text
Conflict Score >= 0.75
AND conflict ảnh hưởng đến risk classification hoặc nghĩa vụ pháp lý
```

Critical conflict:

```text
Conflict Score >= 0.85
AND field thuộc nhóm critical
```

Critical fields gồm: `auto_decision`, `data_types`, `sector`, `user_group`, `ai_type`, `human_oversight`, `external_llm_user_facing`, `biometric_processing`.

## 14. High-Risk Assumptions

### 1. Wizard simplicity vs completeness

Wizard phải đủ đơn giản để Manager hoàn tất, nhưng đủ sâu để capture business/legal truth cần cho reconciliation và classification.

Rủi ro: nếu WizardProfile sai hoặc thiếu, toàn bộ pipeline phía sau sẽ lệch.

### 2. Legal corpus/rule reliability

Classification phải dựa trên versioned legal corpus và compliance rules có citation, không dựa vào LLM tự suy luận.

Rủi ro: classification có thể đúng về technical evidence nhưng yếu về căn cứ pháp lý.

### 3. Human attestation abuse risk

Structured human attestation giúp thoát trạng thái evidence insufficient, nhưng có thể bị lạm dụng thành nút "hợp thức hóa" evidence yếu.

Rủi ro: nếu không kiểm soát role/schema/provenance/disclosure, attestation phá vỡ định vị evidence-based.

## 15. Validation Questions

### Open Questions - Wizard

- Minimum business/legal truth cần capture là gì?
- Câu hỏi nào Manager phải trả lời, câu hỏi nào nên defer cho Developer?
- Làm sao hỏi về auto decision, human review, user impact mà không dùng thuật ngữ kỹ thuật?
- Khi Manager chọn "không biết" ở critical field, workflow nên xử lý thế nào?
- Wizard bao nhiêu bước/câu hỏi là đủ trước khi completion rate giảm?

### Open Questions - Legal Corpus/Rules

- MVP cần những văn bản pháp lý nào trong corpus?
- Rule schema tối thiểu cho risk classification và gap analysis là gì?
- Rule nào là hard-block, rule nào là advisory obligation?
- Ai review/approve rules trước khi dùng?
- Legal corpus version được pin vào assessment như thế nào?

### Open Questions - Attestation

- Claim nào Developer được attest, claim nào cần machine-generated evidence hoặc external document?
- Claim nào bắt buộc cả Manager và Developer xác nhận?
- Có nên giảm confidence hoặc thêm disclosure khi dùng attestation?
- Làm sao phát hiện việc dùng attestation quá thường xuyên thay scanner evidence?

### Other Open Questions

- GitHub App read-only có đủ chấp nhận cho MVP users không?
- Scope coverage nên tính thế nào với monorepo?
- Evidence stale khi commit/branch đổi xử lý thế nào?
- Conflict explanation thế nào là đủ dễ hiểu cho Manager nhưng đủ actionable cho Developer?
- Readiness-only export nên chứa gì và không chứa gì?

## 16. Success Criteria

Product Brief này coi là thành công nếu downstream PRD có thể dùng nó để giữ đúng boundary:

- Không biến LCSP thành chatbot/checklist self-report.
- Không cho Wizard-only sinh risk level.
- Giữ Manager là assessment owner và Developer là task participant.
- Phân biệt rõ business/legal truth và technical truth.
- Bảo toàn evidence gates, reconciliation, scoring và audit trail.
- Đưa 3 high-risk assumptions vào validation plan trước PRD.

MVP sản phẩm về sau nên được đo bằng:

- Manager hoàn tất Wizard mà không cần hiểu scanner/source code.
- Developer cung cấp technical evidence qua task rõ ràng.
- Hệ thống không unlock classification khi thiếu evidence hoặc còn material conflict.
- Conflict được resolve với đúng role và có audit.
- Report cuối trace được evidence, decision, rule/citation và attestation nếu có.

## 17. Readiness to Move to PRD

**Nhận định:** LCSP đủ điều kiện chuyển sang PRD ở mức có điều kiện, nhưng chưa nên viết PRD nếu bỏ qua validation cho 3 assumption rủi ro cao.

Điều kiện cần validate trước hoặc trong đầu PRD:

1. Wizard question model có thể thu đủ business/legal truth mà không làm Manager trả lời câu hỏi kỹ thuật.
2. Legal corpus/rule model có thể hỗ trợ classification có citation, versioning và traceability.
3. Structured human technical attestation có guardrails đủ mạnh để không trở thành bypass cho evidence yếu.

Khuyến nghị tiếp theo:

```text
Proceed to PRD only after Product Brief review confirms:
- Wizard field model is acceptable for MVP discovery.
- Evidence gate model remains non-negotiable.
- Open questions are carried into PRD as validation requirements, not silently resolved.
```
