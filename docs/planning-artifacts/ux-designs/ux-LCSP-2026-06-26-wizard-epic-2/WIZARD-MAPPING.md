---
name: LCSP Wizard Epic 2 Question-to-Profile Mapping
status: final
owner: bmad-ux
updated: 2026-07-02
sources:
  - docs/product/prd.md
  - docs/product/business-rules.md
  - docs/specs/use-cases.md
  - docs/specs/functional-requirements.md
  - docs/specs/ai-usage-flow-domain-spec.md
  - docs/planning-artifacts/research/domain-wizard-benchmark-chau-au-cho-lcsp-research-2026-06-26.md
  - docs/planning-artifacts/ux-designs/ux-LCSP-2026-06-26-wizard-epic-2/EXPERIENCE.md
---

# Mục tiêu

Artifact này khóa seam giữa UX Wizard Epic 2, `WizardProfile`, readiness projection, AIUsageFlow, reconciliation và readiness export.

Đây là contract chuẩn cho Epic 2 khi implementation chưa có schema vật lý chốt ở codebase.

## Quy ước áp dụng

- Mọi `question_id` dưới đây phải ổn định qua UI, API, audit và analytics.
- `WizardProfile.answers` có thể còn lưu JSON tự do ở persistence, nhưng key business phải bám contract này.
- `unknown` là giá trị có chủ đích, không phải field thiếu.
- `readiness-only` không được suy ra từ text tự do; phải suy ra từ field và implication trong bảng này.
- Nếu dev cần đổi wording UI, không được đổi `question_id`, `wizard_profile_field` hoặc semantic answer class nếu chưa cập nhật artifact này.

## Khung field của `WizardProfile.answers`

```text
businessProcess
aiPurpose
sector
affectedSubjects
userImpact
decisionRole
humanReview
externalLlmUsage
dataTypes
specialCategoryData
biometricData
highImpactIndicators
transparencyIndicators
prohibitedRiskSignals
deploymentContext
notesForUnknowns
```

## Giá trị chuẩn hóa đề xuất

- `unknown` hoặc `UNCLEAR`: chỉ dùng khi policy cho phép và user chủ động chọn `Tôi chưa rõ`.
- `decisionRole`: `NO_DECISION_SUPPORT`, `ASSISTS_DECISION`, `INFORMS_DECISION`, `RECOMMENDS_OUTCOME`, `DIRECTLY_DRIVES_OUTCOME`, `UNKNOWN`
- `humanReview`: `PRESENT`, `LIMITED`, `ABSENT`, `UNCLEAR`, `NOT_APPLICABLE`
- `externalLlmUsage`: `NONE`, `POSSIBLE`, `CONFIRMED`, `UNKNOWN`
- `userImpact`: `LOW`, `MODERATE`, `SIGNIFICANT`, `UNKNOWN`

## Mapping Câu Hỏi Cốt Lõi

| question_id | Pha | section_id | Câu hỏi nghiệp vụ | wizard_profile_field | field_type | Criticality | Cho phép `unknown` | Downstream uses | Readiness implication | Reconciliation implication |
|---|---|---|---|---|---|---|---|---|---|---|
| `ps_001_ai_scope` | `pre_screen` | `system-purpose-context` | Hệ thống này có dùng AI hay tạo nội dung/đề xuất bằng AI không? | `aiPurpose.scopeSignal` | enum | critical | có | readiness scoping, AIUsageFlow bootstrap | `unknown` tạo checklist xác minh AI presence | mâu thuẫn với `TechnicalProfile.aiDetected` tạo conflict |
| `ps_002_affected_people` | `pre_screen` | `affected-people` | Kết quả của hệ thống có ảnh hưởng tới khách hàng, nhân sự, ứng viên, học sinh, bệnh nhân hoặc cá nhân khác không? | `affectedSubjects.primaryCategories` | enum[] | critical | có | readiness, AIUsageFlow affected subjects, legal matching pre-flag | `unknown` giữ khóa classification về sau nếu vẫn material | mâu thuẫn với evidence về user-facing routes hoặc domain signals |
| `ps_003_personal_or_sensitive_data` | `pre_screen` | `data-inputs` | Hệ thống có xử lý dữ liệu cá nhân, dữ liệu nhạy cảm hoặc dữ liệu sinh trắc học không? | `dataTypes.preScreenFlags` | enum[] | critical | có | readiness gaps, data categories, harm categories | `unknown` thêm unresolved data verification item | mâu thuẫn với sensitive input findings |
| `ps_004_decision_importance` | `pre_screen` | `decision-impact` | Kết quả AI có được dùng trong quyết định ảnh hưởng đáng kể tới quyền lợi hoặc cơ hội của một người không? | `highImpactIndicators.decisionImportance` | enum | critical | có | high-impact hints, routing | `yes` hoặc `unknown` giữ caution badge, không tạo risk level | mâu thuẫn với downstream action + automation evidence |
| `dt_001_business_process` | `detailed_intake` | `system-purpose-context` | Hệ thống đang hỗ trợ quy trình nghiệp vụ nào? | `businessProcess` | enum + optional short_text | critical | có | AIUsageFlow business process, legal matching, report trace | `unknown` tạo blocker cho later legal matching | mâu thuẫn với technical domain context |
| `dt_002_ai_purpose` | `detailed_intake` | `system-purpose-context` | AI đang được dùng để làm gì trong quy trình đó? | `aiPurpose` | enum[] + optional short_text | critical | có | AIUsageFlow purpose, harm mapping | `unknown` tạo unresolved usage-purpose item | mâu thuẫn với invocation/output evidence |
| `dt_003_sector` | `detailed_intake` | `system-purpose-context` | Bối cảnh ngành/lĩnh vực chính là gì? | `sector` | enum | important | có | prioritization, legal overlays, UX copy | `unknown` không chặn submit nếu các field critical khác đủ | chỉ tạo weak conflict nếu evidence domain rất mạnh |
| `dt_004_affected_subjects` | `detailed_intake` | `affected-people` | Những nhóm người nào bị ảnh hưởng trực tiếp? | `affectedSubjects` | enum[] | critical | có | AIUsageFlow affected subjects, legal matching | `unknown` tạo unresolved affected-subject item | conflict nếu evidence cho thấy applicant/customer/patient mà wizard phủ nhận |
| `dt_005_user_impact` | `detailed_intake` | `affected-people` | Mức độ ảnh hưởng tới người bị tác động là gì? | `userImpact` | enum + short_text | critical | có | readiness, harm categories, document narrative | `unknown` tạo caution item, chưa block submit | conflict nếu decision evidence cho thấy action mạnh hơn khai báo |
| `dt_006_data_types` | `detailed_intake` | `data-inputs` | AI nhận hoặc phân tích những loại dữ liệu nào? | `dataTypes` | enum[] | critical | có | AIUsageFlow input categories, harm categories, legal matching | `unknown` tạo unresolved data inventory item | conflict nếu evidence có personal/sensitive/domain fields |
| `dt_007_special_category_data` | `detailed_intake` | `data-inputs` | Có dùng dữ liệu thuộc nhóm nhạy cảm/đặc biệt không? | `specialCategoryData` | enum | critical | có | sensitivity mapping, legal flags | `unknown` luôn hiện trong readiness checklist | conflict nếu evidence có health/biometric/sensitive signals |
| `dt_008_biometric_data` | `detailed_intake` | `data-inputs` | Có dùng dữ liệu sinh trắc học để nhận diện/xác minh/chấm điểm không? | `biometricData` | enum | critical | có | prohibited/high-risk pre-flag, legal matching | `unknown` giữ special verification item ở export | conflict nếu evidence shows face/voice/fingerprint vectors |
| `dt_009_decision_role` | `detailed_intake` | `decision-impact` | Kết quả AI đóng vai trò gì trong quyết định cuối cùng? | `decisionRole` | enum | critical | không | AIUsageFlow downstream action, automation level, reconciliation | thiếu hoặc invalid thì chặn submit | conflict nếu evidence là approve/reject/status update mà wizard chọn assist-only |
| `dt_010_human_review` | `detailed_intake` | `human-oversight` | Con người can thiệp ở đâu trước khi kết quả có hiệu lực? | `humanReview` | enum + short_text | critical | có | AIUsageFlow human review, automation level | `unknown` tạo oversight verification item | conflict nếu bounded path cho thấy absent review |
| `dt_011_external_llm_usage` | `detailed_intake` | `external-ai-usage` | Có dùng dịch vụ LLM/AI bên ngoài như OpenAI, Anthropic, Google hoặc nhà cung cấp khác không? | `externalLlmUsage` | enum | critical | có | vendor/privacy follow-up, AIUsageFlow provider claim comparison | `unknown` tạo checklist xác minh vendor exposure | conflict nếu provider usage hoặc invocation evidence xuất hiện |
| `dt_012_deployment_context` | `detailed_intake` | `deployment-context` | AI phục vụ nội bộ hay người dùng bên ngoài? | `deploymentContext` | enum[] | important | có | affected subjects, transparency hints | `unknown` tạo non-blocking caution item | conflict nếu evidence cho thấy public/user-facing surfaces |
| `dt_013_high_impact_flags` | `detailed_intake` | `high-impact-special-flags` | Có rơi vào tuyển dụng, tín dụng, giáo dục, y tế, dịch vụ công, thực thi, chấm điểm cá nhân hoặc ngữ cảnh hệ trọng tương tự không? | `highImpactIndicators` | enum[] | critical | có | high-impact candidate flags, legal matching readiness | `unknown` tạo mandatory verification item trước classification | conflict nếu domain evidence match high-impact context |
| `dt_014_transparency_flags` | `detailed_intake` | `high-impact-special-flags` | Người dùng có tương tác trực tiếp với AI hoặc nhận nội dung do AI tạo ra không? | `transparencyIndicators` | enum[] | important | có | transparency obligations, report/export wording | `unknown` tạo transparency verification item | conflict nếu technical evidence shows chatbot/document generation |
| `dt_015_prohibited_signals` | `detailed_intake` | `high-impact-special-flags` | Có tính năng theo dõi, thao túng, chấm điểm hoặc suy luận đặc tính nhạy cảm ở mức cần rà soát đặc biệt không? | `prohibitedRiskSignals` | enum[] | critical | có | prohibited-risk pre-flag, legal matching caution | `unknown` luôn carry vào readiness export | conflict nếu evidence suggests banned pattern |

## Quy tắc submit của Story 2.2

- Chặn submit nếu thiếu hoặc invalid các field:
  - `businessProcess`
  - `aiPurpose`
  - `affectedSubjects`
  - `dataTypes`
  - `decisionRole`
  - `humanReview`
  - `externalLlmUsage`
- Không chặn submit nếu field cho phép `unknown` và user đã chọn `Tôi chưa rõ`.
- `decisionRole` không nên cho phép bỏ trống hoặc `unknown`; đây là field neo cho readiness, AIUsageFlow và conflict detection.

## Quy tắc readiness projection của Story 2.3

- Nếu đã submit Wizard nhưng chưa có accepted technical evidence:
  - `mode = SELF_DECLARED_READINESS`
  - `classification_status = LOCKED_EVIDENCE_REQUIRED`
  - `risk_level = not_available`
- Readiness panel phải dựng từ 3 nhóm:
  - `missing_evidence_items`
  - `unresolved_unknown_items`
  - `next_actions`
- `unresolved_unknown_items` tối thiểu phải include mọi field critical có `unknown`, đặc biệt:
  - `affectedSubjects`
  - `dataTypes`
  - `specialCategoryData`
  - `biometricData`
  - `humanReview`
  - `externalLlmUsage`
  - `highImpactIndicators`
  - `prohibitedRiskSignals`

## Quy tắc export của Story 2.4

- Export phải dùng chính readiness projection, không render lại từ Wizard raw answers.
- Artifact metadata tối thiểu:
  - `artifact_type = WIZARD_READINESS_EXPORT`
  - `readiness_only = true`
  - `classification_status = LOCKED_EVIDENCE_REQUIRED`
  - `wizard_profile_version`
  - `assessment_id`
  - `generated_by`
  - `generated_at`
- Export phải carry nguyên các `unresolved_unknown_items` material dưới label kiểu:
  - `Thông tin cần xác minh thêm`
- Export không được sinh:
  - `risk_level`
  - `preliminary risk level`
  - `legal conclusion`
  - `non-compliant`

## Handoff cho Epic sau

- Epic 4 phải đọc các field sau làm input cốt lõi cho `AIUsageFlow`:
  - `businessProcess`
  - `aiPurpose`
  - `affectedSubjects`
  - `dataTypes`
  - `decisionRole`
  - `humanReview`
- Epic 5 conflict detection phải so sánh tối thiểu:
  - `affectedSubjects`
  - `dataTypes`
  - `decisionRole`
  - `humanReview`
  - `externalLlmUsage`
  - `highImpactIndicators`
  - `prohibitedRiskSignals`
- Epic 8 readiness/final documents không được hạ thấp artifact type này thành final report rút gọn.

## Ghi chú triển khai

- Nên lưu mỗi answer theo shape:

```json
{
  "questionId": "dt_009_decision_role",
  "value": "ASSISTS_DECISION",
  "answerState": "ANSWERED",
  "updatedAt": "2026-07-02T00:00:00Z"
}
```

- Với `unknown`, dùng:

```json
{
  "questionId": "dt_010_human_review",
  "value": "unknown",
  "answerState": "EXPLICIT_UNKNOWN",
  "updatedAt": "2026-07-02T00:00:00Z"
}
```

- Không dùng `null` để biểu diễn `Tôi chưa rõ`.
