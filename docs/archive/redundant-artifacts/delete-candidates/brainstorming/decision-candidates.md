# Decision Candidates

## Scope

Tài liệu này ghi các phương án workflow/MVP đang được cân nhắc cho LCSP trong giai đoạn tiền-PRD. Đây chưa phải PRD, architecture hay backlog.

## Candidate 1 - Reconciliation: Dual-confirmation for material conflicts

**Decision candidate:** LCSP nên thiết kế Reconciliation theo mô hình dual-confirmation cho các conflict có ảnh hưởng đến risk classification hoặc nghĩa vụ pháp lý.

**Rationale:** Developer xác nhận technical truth: code/evidence có đúng production logic không, scanner có false positive không, dependency có dùng thật không. Manager/Legal xác nhận business/legal truth: evidence đó có ý nghĩa gì trong nghiệp vụ, có ra quyết định thật không, có human review không.

**Implication:** LCSP System không phải người xác nhận cuối cùng. Hệ thống chỉ phát hiện conflict, giải thích, điều phối xác nhận và ghi audit trail.

## Candidate 2 - Scoring: Only Conflict Score can block workflow

**Decision candidate:** Chỉ Conflict Score có quyền block workflow. Evidence Confidence Score và AI Intervention Score là supporting signals.

**Blocking rule:**

```text
Conflict Score >= 0.75
AND conflict ảnh hưởng đến risk classification hoặc nghĩa vụ pháp lý
```

**Critical block fields:**

- `auto_decision`
- `data_types`
- `sector`
- `ai_type`
- `human_oversight`
- `external_llm_user_facing`
- `biometric_processing`

**Implication:** Evidence mạnh hoặc AI intervention cao không tự động tạo legal conclusion. Final report chỉ bị block khi có unresolved material/critical conflict.

## Candidate 3 - Evidence Collection: Hybrid strategy, GitHub App read-only default

**Recommended MVP direction:** Hybrid strategy with GitHub App read-only as the default MVP evidence path, and Local/CI scanner as an enterprise-safe alternative.

**Default MVP path: GitHub App read-only**

- Dành cho demo capstone, SME, startup/team nhỏ, low-friction onboarding.
- Tối ưu UX cho Manager/Legal.
- Cho phép scan trực tiếp sau Wizard.
- Dễ tạo evidence đủ giàu cho reconciliation.
- Rủi ro chính: khách hàng phải tin LCSP truy cập source tạm thời dù không lưu raw source dài hạn.

**Enterprise-safe path: Local/CI Evidence Upload**

- Dành cho repo nhạy cảm, doanh nghiệp lớn, team có DevSecOps.
- Source code không rời môi trường doanh nghiệp.
- Phù hợp production/enterprise sau MVP.
- Rủi ro chính: setup friction cao và kéo Developer/DevOps vào flow sớm.

**Implementation staging candidate:**

```text
P0: GitHub App read-only scan
P1: Manual evidence upload / CLI scanner
P2: Full CI integration / GitHub Action
```

## Candidate 4 - Classification Gating: No risk level without technical evidence

**Decision candidate:** LCSP nên bắt buộc technical evidence trước khi sinh risk level. Wizard-only chỉ tạo readiness checklist và preliminary risk indicators, không tạo HIGH/MEDIUM/LOW.

Khi chỉ có Wizard:

```text
mode = SELF_DECLARED_READINESS
classification_status = LOCKED_EVIDENCE_REQUIRED
risk_level = not_available
```

Khi đang chờ evidence:

```text
mode = EVIDENCE_PENDING
classification_status = LOCKED_EVIDENCE_REQUIRED
risk_level = not_available
```

Khi có technical evidence và reconciliation hoàn tất:

```text
classification_mode = EVIDENCE_BASED_CLASSIFICATION
report_status = FINAL_CANDIDATE
risk_level = HIGH | MEDIUM | LOW
```

Nếu có unresolved material conflict:

```text
mode = BLOCKED_BY_CONFLICT
report_status = BLOCKED_UNTIL_RECONCILED
risk_level = no_final_risk_level
```

**Hard rule:**

```text
Risk Classification Agent chỉ chạy khi:
1. WizardProfile đã submit
2. TechnicalEvidence đã received/validated
3. Reconciliation đã tạo VerifiedProfile
4. Không còn material/critical conflict unresolved
```

**Allowed Wizard-only outputs:**

- Preliminary Risk Indicators
- Technical Evidence Readiness
- Missing Evidence Checklist
- Potential risk factors
- Likely areas to verify

**Disallowed Wizard-only outputs:**

- Draft HIGH/MEDIUM/LOW
- Preliminary risk level
- Risk Level: HIGH/MEDIUM/LOW

**Product principle:** LCSP nên tối ưu cho Legal/Manager completion flow, nhưng không được gọi self-report là classification. Final risk level chỉ xuất hiện trong evidence-based classification.

## Candidate 5 - Technical Evidence Gates: Schema completeness to accept, quality threshold to unlock

**Decision candidate:** Technical evidence report phải qua hai cổng kiểm tra:

1. **Schema completeness gate:** đủ cấu trúc tối thiểu để hệ thống đọc, audit và mapping về assessment.
2. **Quality threshold gate:** evidence đủ đáng tin theo ngữ cảnh WizardProfile để unlock Risk Classification.

**Gate behavior:**

```text
Missing required schema -> TECHNICAL_EVIDENCE_REJECTED
Valid schema but low quality -> TECHNICAL_EVIDENCE_INSUFFICIENT
Valid schema and quality pass -> TECHNICAL_EVIDENCE_READY
```

**Minimum schema groups:**

- `assessment_id`
- `source_type`
- `system_identifier`
- `provenance`
- `scanner_version` / `report_version`
- `timestamp` / `generated_at`
- `scope`
- `privacy_flags`
- `technical_profile`
- `findings[]`
- `confidence_per_signal`
- `report_hash`

**Minimum technical profile dimensions:**

- `ai_usage_signals`
- `data_type_signals`
- `decision_flow_signals`
- `human_oversight_signals`

Each dimension may be `DETECTED`, `NOT_DETECTED`, or `UNKNOWN`, but the field must exist.

**Quality threshold principle:** Evidence requirement must be context-aware. A low-impact internal chatbot should not require the same evidence strength as finance credit scoring, healthcare diagnosis, or biometric processing.

**MVP threshold candidate:**

| Condition | Threshold | Failure result |
|---|---:|---|
| Report schema valid | 100% | Reject report |
| Privacy flags pass | 100% | Reject report |
| Provenance present | 100% | Reject report |
| Scope coverage | `>= 0.60` | Evidence insufficient |
| At least one technical source valid | Yes | Evidence insufficient |
| AI usage confidence | `>= 0.60` if wizard declares AI | Ask developer / insufficient |
| Data type confidence | `>= 0.60` if wizard declares personal/sensitive data | Ask confirmation |
| Decision flow confidence | `>= 0.60` if wizard declares auto/assisted decision | Ask confirmation |
| Conflict score | `< 0.75` | Block until resolved |

**Unlock rule:**

```text
Risk Classification Agent unlocks only when:
1. Report schema is valid
2. Privacy flags pass
3. Provenance is present
4. technical_profile has all four dimensions
5. Evidence quality passes context-aware threshold
6. No material/critical conflict remains unresolved
```

## Candidate 6 - Evidence Insufficient Escape Path: Structured human technical attestation

**Decision candidate:** Technical threshold is a hard gate for automated unlock, but not a dead-end. Low-quality scanner evidence alone cannot unlock classification. Low-quality scanner evidence plus valid structured human technical attestation may unlock classification if role, schema, provenance and conflict rules pass.

**Allowed recovery actions from `TECHNICAL_EVIDENCE_INSUFFICIENT`:**

- Run scan again.
- Expand scan scope.
- Select correct repo/branch/commit.
- Upload Local/CI report.
- Upload API probe evidence.
- Upload manual technical JSON.
- Add human technical attestation.
- Update WizardProfile.
- Resolve conflict.
- Export readiness-only report without risk level.

**Valid attestation requirements:**

- `source_type = HUMAN_TECHNICAL_ATTESTATION`
- mapped `assessment_id`
- authorized `Developer` role
- scoped system/repo/branch/commit/environment
- structured claims mapped to fields such as `ai_usage`, `decision_flow`, `data_types`, `human_oversight`
- reason per claim
- supporting evidence refs where available
- signed timestamp
- audit log

**Not allowed:**

- Free-text "bỏ qua đi" comment.
- Manager opinion without technical scope.
- Developer attestation without role/provenance/schema.
- Attestation overriding unresolved critical conflict alone.

**Unlock paths:**

```text
Path A:
Schema completeness gate = PASS
Quality threshold gate = PASS
No unresolved material/critical conflict

Path B:
Schema completeness gate = PASS
Scanner evidence = insufficient
Valid technical attestation = PRESENT
Manager/Legal confirmation = PRESENT if business/legal meaning is affected
No unresolved critical conflict
```

**Final report disclosure:** If classification uses attestation because automated scanner evidence was insufficient, the report must state that clearly and audit who attested, what was attested, when, based on which evidence, and which conflict was resolved.

## Candidate 7 - MVP Role Model: Two user-facing roles

**Decision candidate:** Simplify LCSP MVP to two user-facing roles: `Manager` and `Developer`.

**Role boundaries:**

| Role | Owns | Examples |
|---|---|---|
| Manager | Business/legal truth | business purpose, affected users, rights/benefits impact, human review process, legal/compliance meaning, final assessment confirmation |
| Developer | Technical truth | repo/branch/commit, scanner findings, production scope, dependency usage, false positive/negative, technical profile correction |

**Material conflict rule:** Any conflict that can change risk level requires dual confirmation from both Manager and Developer.

**Developer may attest:**

- `ai_usage`
- `model_call_is_production`
- `repo_branch_commit`
- `deployment_scope`
- `decision_flow_in_code`
- `scanner_false_positive`
- `scanner_false_negative`
- `technical_profile_correction`

**Manager may confirm:**

- `business_purpose`
- `user_group`
- `affected_rights_or_benefits`
- `human_review_process`
- `decision_owner`
- `legal/compliance meaning`
- `final assessment confirmation`

**Requires both Manager and Developer:**

- `auto_decision`
- `ai_assisted_decision`
- `human_oversight`
- `sensitive_data_usage`
- `user-facing_external_llm`
- `biometric_or_high-impact_use_case`
- any conflict that can change risk level

**Cannot be human-attestation-only:**

- `report_hash`
- `scanner_version`
- `ruleset_version`
- `scan_timestamp`
- `repo/commit metadata`
- `privacy flags generated by scanner`
- `dependency inventory / SBOM`
- `legal corpus version`
- `vendor compliance documents`

**UI implication:**

- `Manager Workspace`: Fill Wizard, view readiness, resolve business conflicts, approve VerifiedProfile, generate report.
- `Developer Workspace`: Connect GitHub/upload scanner report, review scanner findings, confirm false positives, provide structured technical attestation.

**Product principle:** Roles such as Legal, Compliance Owner, Product Owner, Tech Lead, DevOps and Security Engineer are responsibilities inside Manager or Developer for MVP, not separate user-facing roles.

## Candidate 8 - Workflow Model: Manager-led with Developer tasks

**Decision candidate:** LCSP MVP should use a Manager-led workflow with task-based Developer participation.

```text
Manager owns the assessment.
Developer only receives technical tasks assigned by Manager.
LCSP tracks progress and merges evidence when ready.
```

**Why not pure sequential handoff:** It is easy to demo but too rigid. Real conflict resolution can require multiple loops: Developer may need to ask Manager, Manager may need to adjust WizardProfile, scanner may need to run again.

**Why not full parallel collaboration:** It is realistic but too complex for MVP. It creates field locking, simultaneous editing, notifications, permission complexity and conflict between edits.

**Developer policies:**

- `CONNECT_REPOSITORY`
- `RUN_SCAN`
- `UPLOAD_EVIDENCE`
- `VIEW_TECHNICAL_FINDINGS`
- `CONFIRM_FINDINGS`
- `ATTEST_TECHNICAL_CLAIMS`
- `RESOLVE_TECHNICAL_CONFLICTS`
- `VIEW_LIMITED_ASSESSMENT_CONTEXT`

**Developer cannot:**

- `EDIT_WIZARD_BUSINESS_ANSWERS`
- `APPROVE_VERIFIED_PROFILE`
- `RUN_FINAL_CLASSIFICATION`
- `GENERATE_FINAL_REPORT`
- `EXPORT_COMPLIANCE_DOSSIER`
- `CHANGE_MANAGER_DECISIONS`
- `INVITE_OTHER_USERS`
- `MANAGE_ASSESSMENT_SETTINGS`

**Manager permissions:**

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

**State model candidate:**

- `WIZARD_IN_PROGRESS`
- `TECHNICAL_EVIDENCE_REQUIRED`
- `DEVELOPER_INVITED`
- `EVIDENCE_COLLECTION_IN_PROGRESS`
- `EVIDENCE_READY`
- `RECONCILIATION_REQUIRED`
- `DEVELOPER_CONFIRMATION_REQUIRED`
- `MANAGER_CONFIRMATION_REQUIRED`
- `VERIFIED_PROFILE_READY`
- `READY_FOR_CLASSIFICATION`
- `REPORT_READY`

**Product principle:** The MVP should be easy to demo but not fake. Manager-led with Developer tasks keeps ownership clear while still supporting evidence loops, conflict resolution and audit trail.
