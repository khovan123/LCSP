# Use Case Comparison Report

## Purpose

Tài liệu này so sánh bộ Use Case hiện tại của LCSP với Google Doc Use Case Reference để kiểm tra độ đầy đủ, naming, module grouping, ID convention, format Use Case Definition và mapping giữa Use Case, Functional Requirement, Business Rule, Non-Functional Requirement, Flowchart, Sequence Diagram và UX.

Tài liệu này chỉ là báo cáo so sánh và đề xuất cập nhật. Không tạo backlog, không viết code, không sửa trực tiếp tài liệu gốc.

## Post-Fix Update

Consistency fixing đã được thực hiện sau báo cáo này:

- Added: `UC-M04-08 — Run Repository Scan`.
- Added: `UC-M06-08 — Review and Approve VerifiedProfile`.
- Added: `UC-M08-06 — View Gap Analysis`.
- Added because auth flow was already implied in current docs: `UC-M01-11 — Verify Email`, `UC-M01-12 — Change Password`, `UC-M01-13 — Manage Personal Profile`.
- Fixed: MFA Login mappings now explicitly reference `UC-M01-10 — Login With MFA`.
- Deferred: SSO/OAuth, organization security policy configuration, CLI/CI/CD automation, legal corpus admin/rule maintenance/evaluation/legal update monitoring remain out of MVP.

Current post-fix detailed design consistency flag:

```text
DETAILED_DESIGN_CONSISTENCY_FIX_COMPLETED
```

## Input Sources

| Source   | Tài liệu                                                                                          | Ghi chú                                                      |
| -------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Source A | Google Doc Use Case Reference: `LCSP — Legal Compliance Support Platform`, Version 1.2, 12/6/2026 | Public Google Doc, trích xuất được 40 use case / 6 module    |
| Source B | `docs/design/use-case-specification.md`                                                           | Current LCSP use case specification, 67 use case / 10 module after consistency fixing |
| Source B | `docs/design/functional-requirements.md`                                                          | FR mapping                                                   |
| Source B | `docs/design/business-rules.md`                                                                   | BR mapping                                                   |
| Source B | `docs/design/non-functional-requirements.md`                                                      | NFR mapping                                                  |
| Source B | `docs/design/traceability-matrix.md`                                                              | Cross-document traceability                                  |
| Source B | `docs/design/flowcharts.md`                                                                       | Flow mapping                                                 |
| Source B | `docs/design/sequence-diagrams.md`                                                                | Sequence mapping                                             |
| Source B | `docs/design/ux-specification.md`                                                                 | UX screen mapping                                            |
| Source B | `docs/specs/api-contract-draft.md`                                                                | API contract draft                                           |
| Source B | `docs/specs/data-model-draft.md`                                                                  | Conceptual data model                                        |
| Source B | `docs/implementation-readiness.md`                                                                | Readiness status                                             |

## Comparison Scope

Scope kiểm tra:

- Danh sách use case giữa Source A và Source B.
- Module grouping theo 10 module LCSP hiện tại.
- ID convention `UC-MXX-XX`.
- Format Use Case Definition dạng bảng.
- Authentication và Authenticator App MFA.
- Mapping FR / BR / NFR tới use case.
- Mapping Flowchart / Sequence / UX.
- Readiness impact.

Ngoài scope:

- Không chốt backlog.
- Không chốt implementation plan.
- Không thay đổi readiness status.
- Không coi các use case ngoài MVP trong Source A là bắt buộc implement nếu chúng mâu thuẫn với conditional PRD hiện tại.

## Source A Use Case Extraction

Source A có 40 use case trong 6 module legacy/reference:

| Source A ID | Source A Use Case                                     | Source A Module | Actor chính                 |
| ----------- | ----------------------------------------------------- | --------------- | --------------------------- |
| UC-LCSP-01  | Đăng ký tài khoản                                     | M0              | New User                    |
| UC-LCSP-02  | Xác thực email                                        | M0              | New User                    |
| UC-LCSP-03  | Đăng nhập bằng mật khẩu                               | M0              | Registered User             |
| UC-LCSP-04  | Đăng nhập bằng SSO/OAuth                              | M0              | Registered User             |
| UC-LCSP-05  | Thiết lập xác thực đa yếu tố (MFA)                    | M0              | Registered User             |
| UC-LCSP-06  | Đăng nhập có MFA                                      | M0              | Registered User             |
| UC-LCSP-07  | Quên & đặt lại mật khẩu                               | M0              | Registered User             |
| UC-LCSP-08  | Đổi mật khẩu                                          | M0              | Registered User             |
| UC-LCSP-09  | Đăng xuất                                             | M0              | Registered User             |
| UC-LCSP-10  | Quản lý hồ sơ cá nhân                                 | M0              | Registered User             |
| UC-LCSP-11  | Tạo tổ chức                                           | M0              | Org Owner                   |
| UC-LCSP-12  | Mời & gán vai trò thành viên                          | M0              | Admin / Org Owner           |
| UC-LCSP-13  | Cấu hình chính sách bảo mật tổ chức                   | M0              | Admin / Org Owner           |
| UC-LCSP-14  | Tạo & nộp Wizard đánh giá (7 bước)                    | M1              | Compliance Officer          |
| UC-LCSP-15  | Lưu & tiếp tục nháp Wizard                            | M1              | Compliance Officer          |
| UC-LCSP-16  | Kết nối repository GitHub                             | M1              | Developer                   |
| UC-LCSP-17  | Kích hoạt & chạy quét repository                      | M1              | Developer / System          |
| UC-LCSP-18  | Xem kết quả quét (Technical Evidence)                 | M1              | Developer / Officer         |
| UC-LCSP-19  | Giải quyết mâu thuẫn Wizard-Evidence (Reconciliation) | M1              | Compliance Officer          |
| UC-LCSP-20  | Tham vấn kỹ thuật khi đối chiếu                       | M1              | Developer                   |
| UC-LCSP-21  | Orchestrator điều phối đội agent phân tích            | M1              | System / Orchestrator       |
| UC-LCSP-22  | Review & xác nhận trước khi sinh hồ sơ                | M1              | Compliance Officer          |
| UC-LCSP-23  | Sinh & tải hồ sơ tuân thủ                             | M1              | Compliance Officer / System |
| UC-LCSP-24  | Xem kết quả phân loại rủi ro                          | M1              | Compliance Officer          |
| UC-LCSP-25  | Xem phân tích khoảng trống (Gap Analysis)             | M1              | Compliance Officer          |
| UC-LCSP-26  | Xem dashboard giám sát tuân thủ                       | M2              | Compliance Officer / Admin  |
| UC-LCSP-27  | Tra cứu vết kiểm toán (Audit Trail)                   | M2              | Compliance Officer / Admin  |
| UC-LCSP-28  | Xuất báo cáo kiểm toán                                | M2              | Compliance Officer / Admin  |
| UC-LCSP-29  | Cài đặt & cấu hình CLI                                | M3              | DevSecOps / Developer       |
| UC-LCSP-30  | Chạy đánh giá tuân thủ qua CLI                        | M3              | DevSecOps / Developer       |
| UC-LCSP-31  | Cấu hình CI/CD compliance gate                        | M3              | DevSecOps                   |
| UC-LCSP-32  | Kiểm tra tự động trên push/PR                         | M3              | System (GitHub Action)      |
| UC-LCSP-33  | Nạp văn bản pháp luật vào corpus                      | M4              | Admin                       |
| UC-LCSP-34  | QA & kích hoạt phiên bản corpus                       | M4              | Admin                       |
| UC-LCSP-35  | Tạo quy tắc tuân thủ mới (từ corpus)                  | M4              | Admin                       |
| UC-LCSP-36  | Bảo trì & cập nhật quy tắc hiện có (sửa rule)         | M4              | Admin                       |
| UC-LCSP-37  | Chạy đánh giá chất lượng hệ thống (Evaluation)        | M4              | Admin                       |
| UC-LCSP-38  | Theo dõi cập nhật luật & gắn cờ                       | M5              | System                      |
| UC-LCSP-39  | Đánh giá lại assessment đã gắn cờ                     | M5              | Compliance Officer          |
| UC-LCSP-40  | Xem lịch sử phiên bản đánh giá                        | M5              | Compliance Officer          |

## Source B Use Case Extraction

Source B có 67 use case trong 10 module hiện tại sau consistency fixing:

| Module                                               | Count | Use Case Range       |
| ---------------------------------------------------- | ----: | -------------------- |
| Module 1 - Authentication & Account Security         |    13 | UC-M01-01..UC-M01-13 |
| Module 2 - Organization & Role Management            |     6 | UC-M02-01..UC-M02-06 |
| Module 3 - Assessment Setup & Web Wizard             |     6 | UC-M03-01..UC-M03-06 |
| Module 4 - Developer Task & Evidence Collection      |     8 | UC-M04-01..UC-M04-08 |
| Module 5 - Evidence Gates & Technical Profile        |     5 | UC-M05-01..UC-M05-05 |
| Module 6 - Reconciliation & VerifiedProfile          |     8 | UC-M06-01..UC-M06-08 |
| Module 7 - Risk Classification & Legal Rule Citation |     5 | UC-M07-01..UC-M07-05 |
| Module 8 - Gap Analysis & Document Generation        |     6 | UC-M08-01..UC-M08-06 |
| Module 9 - Audit Trail & Compliance Monitoring       |     5 | UC-M09-01..UC-M09-05 |
| Module 10 - Security & Privacy Controls              |     5 | UC-M10-01..UC-M10-05 |

## Use Case List Comparison

| Source A Use Case                                       | Source B Use Case                                                          | Match Status    | Notes                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| UC-LCSP-01 - Đăng ký tài khoản                          | UC-M01-01 - Register Account                                               | ID_MISMATCH     | Concept match, but ID convention and language differ.                                                                       |
| UC-LCSP-02 - Xác thực email                             | UC-M01-11 - Verify Email                                                   | ID_MISMATCH     | Added after consistency fixing because email verification was implied by account flow.                                      |
| UC-LCSP-03 - Đăng nhập bằng mật khẩu                    | UC-M01-02 - Login                                                          | PARTIAL_MATCH   | Source B abstracts password/enterprise identity into one login use case.                                                    |
| UC-LCSP-04 - Đăng nhập bằng SSO/OAuth                   | UC-M01-02 - Login                                                          | PARTIAL_MATCH   | Enterprise identity path is mentioned, but SSO/OAuth is not a separate MVP use case.                                        |
| UC-LCSP-05 - Thiết lập xác thực đa yếu tố (MFA)         | UC-M01-04 - Setup MFA Using Authenticator App; UC-M01-05 - Verify MFA Code | PARTIAL_MATCH   | Source B splits setup and verification; uses Authenticator App / TOTP.                                                      |
| UC-LCSP-06 - Đăng nhập có MFA                           | UC-M01-10 - Login With MFA                                                 | ID_MISMATCH     | Concept match, different ID and naming convention.                                                                          |
| UC-LCSP-07 - Quên & đặt lại mật khẩu                    | UC-M01-09 - Reset Password                                                 | ID_MISMATCH     | Concept match, different ID and naming convention.                                                                          |
| UC-LCSP-08 - Đổi mật khẩu                               | UC-M01-12 - Change Password                                                | ID_MISMATCH     | Added after consistency fixing because password auth is documented.                                                         |
| UC-LCSP-09 - Đăng xuất                                  | UC-M01-03 - Logout                                                         | ID_MISMATCH     | Concept match, different ID and naming convention.                                                                          |
| UC-LCSP-10 - Quản lý hồ sơ cá nhân                      | UC-M01-13 - Manage Personal Profile                                        | ID_MISMATCH     | Added after consistency fixing with permission guardrail.                                                                   |
| UC-LCSP-11 - Tạo tổ chức                                | UC-M02-01 - Create Organization                                            | ID_MISMATCH     | Concept match, different ID and module convention.                                                                          |
| UC-LCSP-12 - Mời & gán vai trò thành viên               | UC-M02-02, UC-M02-03, UC-M02-04, UC-M02-05                                 | PARTIAL_MATCH   | Source B splits organization members, Manager role, Developer invite and Developer policy.                                  |
| UC-LCSP-13 - Cấu hình chính sách bảo mật tổ chức        | Not explicit                                                               | MISSING_IN_LCSP | Security policy configuration is not modeled as an MVP use case.                                                            |
| UC-LCSP-14 - Tạo & nộp Wizard đánh giá                  | UC-M03-01, UC-M03-02, UC-M03-04                                            | PARTIAL_MATCH   | Source B splits create assessment, fill Wizard and submit WizardProfile.                                                    |
| UC-LCSP-15 - Lưu & tiếp tục nháp Wizard                 | UC-M03-03 - Save Wizard Progress                                           | ID_MISMATCH     | Concept match, different ID.                                                                                                |
| UC-LCSP-16 - Kết nối repository GitHub                  | UC-M04-02 - Connect GitHub Repository                                      | ID_MISMATCH     | Concept match, different ID.                                                                                                |
| UC-LCSP-17 - Kích hoạt & chạy quét repository           | UC-M04-08 - Run Repository Scan                                            | ID_MISMATCH     | Added after consistency fixing because `RUN_SCAN` is an MVP Developer policy.                                               |
| UC-LCSP-18 - Xem kết quả quét                           | UC-M04-05 - Review Technical Findings                                      | PARTIAL_MATCH   | Current scope focuses Developer technical findings review.                                                                  |
| UC-LCSP-19 - Giải quyết mâu thuẫn Wizard-Evidence       | UC-M06-01..UC-M06-08                                                       | PARTIAL_MATCH   | Source B decomposes conflict detection, scoring, routing, resolution, dual confirmation, VerifiedProfile creation and approval. |
| UC-LCSP-20 - Tham vấn kỹ thuật khi đối chiếu            | UC-M06-04; UC-M04-06                                                       | PARTIAL_MATCH   | Covered by technical conflict resolution and technical truth confirmation.                                                  |
| UC-LCSP-21 - Orchestrator điều phối đội agent phân tích | UC-M07-02; UC-M08-01                                                       | PARTIAL_MATCH   | Source B separates Risk Classification and Gap Analysis; orchestration is architectural, not a single user-facing use case. |
| UC-LCSP-22 - Review & xác nhận trước khi sinh hồ sơ     | UC-M06-08 - Review and Approve VerifiedProfile                             | PARTIAL_MATCH   | Added after consistency fixing as Manager approval gate before classification/final report.                                 |
| UC-LCSP-23 - Sinh & tải hồ sơ tuân thủ                  | UC-M08-02; UC-M08-05                                                       | PARTIAL_MATCH   | Source B splits generate and download.                                                                                      |
| UC-LCSP-24 - Xem kết quả phân loại rủi ro               | UC-M07-05 - View Classification Result                                     | ID_MISMATCH     | Concept match, different ID.                                                                                                |
| UC-LCSP-25 - Xem phân tích khoảng trống                 | UC-M08-06 - View Gap Analysis                                              | ID_MISMATCH     | Added after consistency fixing as user-facing Manager action.                                                               |
| UC-LCSP-26 - Xem dashboard giám sát tuân thủ            | Not explicit                                                               | MISSING_IN_LCSP | Assessment progress/dashboard use case is not explicit.                                                                     |
| UC-LCSP-27 - Tra cứu vết kiểm toán                      | UC-M09-02 - View Audit Trail                                               | ID_MISMATCH     | Concept match, different ID.                                                                                                |
| UC-LCSP-28 - Xuất báo cáo kiểm toán                     | UC-M09-03 - Export Audit Trail                                             | ID_MISMATCH     | Concept match, different ID.                                                                                                |
| UC-LCSP-29 - Cài đặt & cấu hình CLI                     | Not explicit                                                               | MISSING_IN_LCSP | CLI setup is outside current MVP use case set.                                                                              |
| UC-LCSP-30 - Chạy đánh giá tuân thủ qua CLI             | Not explicit                                                               | MISSING_IN_LCSP | Local/CI upload exists, but CLI assessment is not a modeled use case.                                                       |
| UC-LCSP-31 - Cấu hình CI/CD compliance gate             | Not explicit                                                               | MISSING_IN_LCSP | CI/CD gate is not modeled as an MVP use case.                                                                               |
| UC-LCSP-32 - Kiểm tra tự động trên push/PR              | Not explicit                                                               | MISSING_IN_LCSP | GitHub Action/push automation is not modeled as MVP use case.                                                               |
| UC-LCSP-33 - Nạp văn bản pháp luật vào corpus           | Not explicit                                                               | MISSING_IN_LCSP | Legal corpus management is architecture concern, not exposed MVP role use case.                                             |
| UC-LCSP-34 - QA & kích hoạt phiên bản corpus            | Not explicit                                                               | MISSING_IN_LCSP | Legal corpus QA/admin workflow is not modeled in current 2-role MVP.                                                        |
| UC-LCSP-35 - Tạo quy tắc tuân thủ mới                   | Not explicit                                                               | MISSING_IN_LCSP | Rule authoring is not exposed in current MVP.                                                                               |
| UC-LCSP-36 - Bảo trì & cập nhật quy tắc hiện có         | Not explicit                                                               | MISSING_IN_LCSP | Rule maintenance is not exposed in current MVP.                                                                             |
| UC-LCSP-37 - Chạy đánh giá chất lượng hệ thống          | Not explicit                                                               | MISSING_IN_LCSP | Evaluation workflow is not modeled as current MVP use case.                                                                 |
| UC-LCSP-38 - Theo dõi cập nhật luật & gắn cờ            | Not explicit                                                               | MISSING_IN_LCSP | Legal update monitoring is not modeled as current MVP use case.                                                             |
| UC-LCSP-39 - Đánh giá lại assessment đã gắn cờ          | Not explicit                                                               | MISSING_IN_LCSP | Reassessment after legal update is not modeled.                                                                             |
| UC-LCSP-40 - Xem lịch sử phiên bản đánh giá             | UC-M09-04 - Track Evidence, Report, and Document Version                   | PARTIAL_MATCH   | Source B tracks versions but lacks a user-facing view history use case.                                                     |

## Module Grouping Comparison

Current Source B module grouping aligns with the required 10-module structure.

| Use Case ID          | Use Case Name                                                  | Current Module | Expected Module                                      | Status | Notes                                                      |
| -------------------- | -------------------------------------------------------------- | -------------- | ---------------------------------------------------- | ------ | ---------------------------------------------------------- |
| UC-M01-01..UC-M01-13 | Authentication and MFA use cases                               | Module 1       | Module 1 - Authentication & Account Security         | MATCH  | Includes Authenticator App MFA plus email/password/profile coverage. |
| UC-M02-01..UC-M02-06 | Organization, role and Developer policy use cases              | Module 2       | Module 2 - Organization & Role Management            | MATCH  | Keeps Manager/Developer MVP roles.                         |
| UC-M03-01..UC-M03-06 | Assessment setup, Wizard, readiness and preliminary indicators | Module 3       | Module 3 - Assessment Setup & Web Wizard             | MATCH  | A1 dependency retained.                                    |
| UC-M04-01..UC-M04-08 | Developer task and evidence collection                         | Module 4       | Module 4 - Developer Task & Evidence Collection      | MATCH  | Explicit Run Repository Scan added. |
| UC-M05-01..UC-M05-05 | Evidence gates and TechnicalProfile                            | Module 5       | Module 5 - Evidence Gates & Technical Profile        | MATCH  | Product-specific decomposition not present in Source A.    |
| UC-M06-01..UC-M06-08 | Reconciliation and VerifiedProfile                             | Module 6       | Module 6 - Reconciliation & VerifiedProfile          | MATCH  | Includes explicit Manager VerifiedProfile approval.        |
| UC-M07-01..UC-M07-05 | Risk Classification and legal citations                        | Module 7       | Module 7 - Risk Classification & Legal Rule Citation | MATCH  | A2 dependency retained.                                    |
| UC-M08-01..UC-M08-06 | Gap analysis and documents                                     | Module 8       | Module 8 - Gap Analysis & Document Generation        | MATCH  | Includes explicit View Gap Analysis use case.              |
| UC-M09-01..UC-M09-05 | Audit and version tracking                                     | Module 9       | Module 9 - Audit Trail & Compliance Monitoring       | MATCH  | Covers audit trail and attestation usage.                  |
| UC-M10-01..UC-M10-05 | Source privacy controls                                        | Module 10      | Module 10 - Security & Privacy Controls              | MATCH  | Covers no raw source to LLM/storage.                       |

## ID Convention Check

| Check                              | Result      | Notes                                                                                |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| Source A ID convention             | ID_MISMATCH | Uses `UC-LCSP-01..UC-LCSP-40`. This is not the current required convention.          |
| Source B ID convention             | MATCH       | All current use cases use `UC-MXX-XX`.                                               |
| Deprecated Source B patterns found | MATCH       | No current use case ID uses `UC-01`, `UC-AUTH-001`, `UC-MANAGER-01` or `UC-LCSP-XX`. |

Sample Source B ID validation:

| Use Case ID | Use Case Name                           | ID Valid? | Problem | Suggested ID |
| ----------- | --------------------------------------- | --------: | ------- | ------------ |
| UC-M01-01   | Register Account                        |       Yes | None    | Keep         |
| UC-M01-10   | Login With MFA                          |       Yes | None    | Keep         |
| UC-M03-02   | Fill Web Wizard                         |       Yes | None    | Keep         |
| UC-M04-02   | Connect GitHub Repository               |       Yes | None    | Keep         |
| UC-M06-07   | Create VerifiedProfile                  |       Yes | None    | Keep         |
| UC-M07-02   | Run Risk Classification Agent           |       Yes | None    | Keep         |
| UC-M10-05   | Enforce No Long-Term Raw Source Storage |       Yes | None    | Keep         |

## Use Case Definition Format Check

All 67 Source B use cases include the required strict sections: Description, Primary Roles, Pre-Conditions, Trigger, Basic Flow, Alternative / Exception Flow and Post-Conditions.

Strict Markdown format has been normalized to `# Use Case: \`UC-MXX-XX — Name\`` and `##` section headings.

| Use Case Set         | Has Description | Has Primary Roles | Has Pre-Conditions | Has Trigger | Has Basic Flow | Has Alternative Flow | Has Post-Conditions | Status          |
| -------------------- | --------------: | ----------------: | -----------------: | ----------: | -------------: | -------------------: | ------------------: | --------------- |
| UC-M01-01..UC-M01-13 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M02-01..UC-M02-06 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M03-01..UC-M03-06 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M04-01..UC-M04-08 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M05-01..UC-M05-05 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M06-01..UC-M06-08 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M07-01..UC-M07-05 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M08-01..UC-M08-06 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M09-01..UC-M09-05 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |
| UC-M10-01..UC-M10-05 |             Yes |               Yes |                Yes |         Yes |            Yes |                  Yes |                 Yes | MATCH |

## Authentication & MFA Coverage Check

| Required Auth Use Case            |                                           Exists? | Current Name                                  | Status | Notes                                                     |
| --------------------------------- | ------------------------------------------------: | --------------------------------------------- | ------ | --------------------------------------------------------- |
| Register Account                  |                                               Yes | UC-M01-01 - Register Account                  | MATCH  | Source A concept covered.                                 |
| Login                             |                                               Yes | UC-M01-02 - Login                             | MATCH  | Password/identity first step.                             |
| Logout                            |                                               Yes | UC-M01-03 - Logout                            | MATCH  | Covered.                                                  |
| Reset Password                    |                                               Yes | UC-M01-09 - Reset Password                    | MATCH  | Covered.                                                  |
| Manage Session                    |                                               Yes | UC-M01-08 - Manage Session                    | MATCH  | Covered in Source B, absent in Source A as standalone UC. |
| Setup MFA Using Authenticator App |                                               Yes | UC-M01-04 - Setup MFA Using Authenticator App | MATCH  | Uses Authenticator App / TOTP terminology.                |
| Verify MFA Code                   |                                               Yes | UC-M01-05 - Verify MFA Code                   | MATCH  | Setup verification use case exists.                       |
| Login With MFA                    |                                               Yes | UC-M01-10 - Login With MFA                    | MATCH  | Added as standalone use case.                             |
| Disable MFA                       |                                               Yes | UC-M01-06 - Disable MFA                       | MATCH  | Covered in Source B, not explicit in Source A.            |
| Reset MFA                         |                                               Yes | UC-M01-07 - Reset MFA                         | MATCH  | Covered in Source B, not explicit in Source A.            |
| SMS OTP wording                   | No problematic wording found in UX/API references | Authenticator App / TOTP                      | MATCH  | Source B explicitly excludes SMS OTP from MVP.            |

## FR Mapping Check

Functional Requirement ID convention is valid: `FR-001..FR-062`. No FR references a missing use case ID.

| FR ID  | FR Name                       | Related Use Case ID | Related Use Case Name             | Use Case Exists? | Name Match? | Status |
| ------ | ----------------------------- | ------------------- | --------------------------------- | ---------------: | ----------: | ------ |
| FR-001 | Register account              | UC-M01-01           | Register Account                  |              Yes |         Yes | MATCH  |
| FR-002 | Login                         | UC-M01-02           | Login                             |              Yes |         Yes | MATCH  |
| FR-003 | Enable Authenticator App MFA  | UC-M01-04           | Setup MFA Using Authenticator App |              Yes |         Yes | MATCH  |
| FR-005 | Verify MFA setup code         | UC-M01-05           | Verify MFA Code                   |              Yes |         Yes | MATCH  |
| FR-006 | Require MFA at login          | UC-M01-10           | Login With MFA                    |              Yes |         Yes | MATCH  |
| FR-015 | Invite Developer              | UC-M02-04           | Invite Developer                  |              Yes |         Yes | MATCH  |
| FR-019 | Fill Web Wizard               | UC-M03-02           | Fill Web Wizard                   |              Yes |         Yes | MATCH  |
| FR-025 | Connect GitHub Repository     | UC-M04-02           | Connect GitHub Repository         |              Yes |         Yes | MATCH  |
| FR-033 | Evaluate Evidence Quality     | UC-M05-03           | Evaluate Evidence Quality         |              Yes |         Yes | MATCH  |
| FR-038 | Calculate Conflict Score      | UC-M06-02           | Calculate Conflict Score          |              Yes |         Yes | MATCH  |
| FR-044 | Run Risk Classification Agent | UC-M07-02           | Run Risk Classification Agent     |              Yes |         Yes | MATCH  |
| FR-049 | Generate compliance report    | UC-M08-02           | Generate Compliance Report        |              Yes |         Yes | MATCH  |
| FR-053 | Write Audit Event             | UC-M09-01           | Write Audit Event                 |              Yes |         Yes | MATCH  |
| FR-061 | Enforce no raw source to LLM  | UC-M10-04           | Enforce No Raw Source to LLM      |              Yes |         Yes | MATCH  |

Result: 0 broken FR-to-use-case references found.

## BR Mapping Check

Business Rule ID convention is valid: `BR-001..BR-073`. No BR references a missing use case ID or missing FR ID.

| BR ID  | BR Name                               | Related Use Case ID | Related Use Case Name                             | Related FR ID | Use Case Exists? | FR Exists? | Status |
| ------ | ------------------------------------- | ------------------- | ------------------------------------------------- | ------------- | ---------------: | ---------: | ------ |
| BR-003 | Login attempt protection              | UC-M01-02           | Login                                             | FR-002        |              Yes |        Yes | MATCH  |
| BR-006 | MFA setup starts pending              | UC-M01-04           | Setup MFA Using Authenticator App                 | FR-003        |              Yes |        Yes | MATCH  |
| BR-007 | MFA setup verification required       | UC-M01-05           | Verify MFA Code                                   | FR-005        |              Yes |        Yes | MATCH  |
| BR-008 | MFA login required                    | UC-M01-10           | Login With MFA                                    | FR-006        |              Yes |        Yes | MATCH  |
| BR-009 | OTP validity and lockout              | UC-M01-05           | Verify MFA Code                                   | FR-007        |              Yes |        Yes | MATCH  |
| BR-021 | Developer task scope                  | UC-M04-01           | Accept Developer Task                             | FR-024        |              Yes |        Yes | MATCH  |
| BR-030 | Wizard-only output limitation         | UC-M03-05           | View Self-Declared Readiness                      | FR-022        |              Yes |        Yes | MATCH  |
| BR-040 | Evidence ready unlocks reconciliation | UC-M05-05           | Mark Evidence as Rejected, Insufficient, or Ready | FR-035        |              Yes |        Yes | MATCH  |
| BR-047 | VerifiedProfile creation rule         | UC-M06-07           | Create VerifiedProfile                            | FR-042        |              Yes |        Yes | MATCH  |
| BR-049 | Classification gate                   | UC-M07-02           | Run Risk Classification Agent                     | FR-044        |              Yes |        Yes | MATCH  |
| BR-052 | Attestation schema required           | UC-M04-07           | Provide Structured Technical Attestation          | FR-057        |              Yes |        Yes | MATCH  |
| BR-057 | No raw source to LLM                  | UC-M10-04           | Enforce No Raw Source to LLM                      | FR-061        |              Yes |        Yes | MATCH  |
| BR-063 | Final report block condition          | UC-M08-02           | Generate Compliance Report                        | FR-049        |              Yes |        Yes | MATCH  |
| BR-067 | Audit event required                  | UC-M09-01           | Write Audit Event                                 | FR-053        |              Yes |        Yes | MATCH  |

Result: 0 broken BR-to-use-case or BR-to-FR references found.

## NFR Mapping Check

Non-Functional Requirement ID convention is valid: `NFR-001..NFR-025`. No NFR references a missing use case ID or missing FR ID.

| NFR ID  | NFR Name                      | Related Module | Related Use Case ID  | Related FR ID  | Use Case Exists? | FR Exists? | Status        |
| ------- | ----------------------------- | -------------- | -------------------- | -------------- | ---------------: | ---------: | ------------- |
| NFR-002 | MFA secret protection         | M01            | UC-M01-04            | FR-004         |              Yes |        Yes | MATCH         |
| NFR-003 | OTP verification security     | M01            | UC-M01-05            | FR-005, FR-007 |              Yes |        Yes | MATCH         |
| NFR-005 | Brute-force protection        | M01            | UC-M01-02, UC-M01-05 | FR-002, FR-007 |              Yes |        Yes | PARTIAL_MATCH |
| NFR-006 | Secure MFA recovery/reset     | M01            | UC-M01-07            | FR-009         |              Yes |        Yes | MATCH         |
| NFR-010 | Wizard usability              | M03            | UC-M03-02            | FR-019, FR-021 |              Yes |        Yes | MATCH         |
| NFR-012 | No raw source to LLM          | M10            | UC-M10-04            | FR-061         |              Yes |        Yes | MATCH         |
| NFR-019 | Legal citation traceability   | M07            | UC-M07-03            | FR-045         |              Yes |        Yes | MATCH         |
| NFR-021 | Document overclaim prevention | M08            | UC-M08-02            | FR-049         |              Yes |        Yes | MATCH         |

Notes:

- `NFR-005` should likely also reference `UC-M01-10 - Login With MFA` because brute-force protection applies to MFA login challenge, not only `UC-M01-05 - Verify MFA Code`.
- No hard broken NFR reference was found.

## Flowchart / Sequence / UX Mapping Check

| Artifact                 | Referenced Use Case / Flow                                                       | Exists in Use Case Spec? | Name Match? | Status        | Notes                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- | -----------------------: | ----------: | ------------- | ------------------------------------------------------------------------------ |
| `flowcharts.md`          | Login With MFA Flow references `UC-M01-02 Login` and `UC-M01-05 Verify MFA Code` |                      Yes |     Partial | PARTIAL_MATCH | Should also explicitly reference `UC-M01-10 Login With MFA`.                   |
| `flowcharts.md`          | Setup MFA Using Authenticator App Flow                                           |                      Yes |         Yes | MATCH         | Uses `UC-M01-04` and `UC-M01-05`.                                              |
| `sequence-diagrams.md`   | Login With MFA sequence maps to `UC-M01-02`, `UC-M01-05`                         |                      Yes |     Partial | PARTIAL_MATCH | Should include `UC-M01-10 Login With MFA`.                                     |
| `sequence-diagrams.md`   | Setup MFA Using Authenticator App                                                |                      Yes |         Yes | MATCH         | Uses Authenticator App / TOTP terminology.                                     |
| `ux-specification.md`    | MFA Login maps to `UC-M01-02 Login`                                              |                      Yes |     Partial | PARTIAL_MATCH | Should map MFA login step to `UC-M01-10 Login With MFA`.                       |
| `ux-specification.md`    | MFA Setup / OTP Verification                                                     |                      Yes |         Yes | MATCH         | Uses `UC-M01-04` and `UC-M01-05`.                                              |
| `api-contract-draft.md`  | Verify MFA login endpoint group                                                  |         Yes conceptually |     Partial | PARTIAL_MATCH | Endpoint group exists; use case mapping should explicitly include `UC-M01-10`. |
| `data-model-draft.md`    | `UserMfaMethod`                                                                  |         Yes conceptually |         Yes | MATCH         | Supports Authenticator App MFA.                                                |
| `traceability-matrix.md` | `UC-M01-10 Login With MFA` mappings                                              |                      Yes |         Yes | MATCH         | Matrix already includes UC-M01-10.                                             |

## Missing Use Cases

Missing relative to Source A:

| Source A Use Case                                            | LCSP Current Status                   | Recommendation                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Xác thực email                                               | Not explicit                          | Add as use case if email verification remains in MVP auth scope; otherwise record as out of scope/open question.      |
| Đăng nhập bằng SSO/OAuth                                     | Not explicit                          | Keep out of MVP unless enterprise auth is required; document as non-goal or future.                                   |
| Đổi mật khẩu                                                 | Not explicit                          | Add if password-auth accounts are in MVP; otherwise mark as Open Question.                                            |
| Quản lý hồ sơ cá nhân                                        | Not explicit                          | Decide whether needed for MVP account operations.                                                                     |
| Cấu hình chính sách bảo mật tổ chức                          | Not explicit                          | Likely out of MVP; record as future enterprise/admin scope.                                                           |
| Kích hoạt & chạy quét repository                             | Not explicit                          | Must consider adding because GitHub App read-only is default MVP evidence path and `RUN_SCAN` exists in policy model. |
| Review & xác nhận trước khi sinh hồ sơ                       | Not explicit                          | Must consider adding explicit Manager VerifiedProfile approval / pre-document review use case.                        |
| Xem phân tích khoảng trống                                   | Not explicit                          | Add user-facing View Gap Analysis use case if Gap Analysis is shown before report generation.                         |
| Xem dashboard giám sát tuân thủ                              | Not explicit                          | Add or map to Assessment Progress if Manager dashboard is in MVP.                                                     |
| CLI setup / CLI assessment / CI/CD gate / push-PR automation | Not explicit                          | Likely out of MVP or covered only through Local/CI evidence upload; document as deferred if not included.             |
| Legal corpus admin workflows UC-LCSP-33..37                  | Not explicit                          | Likely out of 2-role MVP; keep as architecture/legal ops caveat, not user-facing MVP unless role model changes.       |
| Legal update maintenance UC-LCSP-38..40                      | Partially covered by version tracking | Defer or add explicit user-facing version history only if PRD requires it.                                            |

## Extra Use Cases

Extra in Source B relative to Source A, mostly due conditional MVP decomposition and product constraints:

| Source B Area                      | Extra Use Cases                                       | Assessment                                                                          |
| ---------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Authenticator App MFA detail       | UC-M01-05, UC-M01-06, UC-M01-07, UC-M01-08, UC-M01-10 | Useful and aligned with latest MFA requirement.                                     |
| Manager-led Developer policy       | UC-M02-03..UC-M02-06, UC-M04-01                       | Aligned with product decision: Manager-led with task-based Developer participation. |
| Wizard-only readiness              | UC-M03-05, UC-M03-06                                  | Aligned with product constraint: no risk level without technical evidence.          |
| Alternative evidence modes         | UC-M04-03, UC-M04-04, UC-M04-07                       | Aligned with hybrid evidence strategy and controlled attestation.                   |
| Evidence gates                     | UC-M05-01..UC-M05-05                                  | Required by evidence-first classification gate.                                     |
| Reconciliation decomposition       | UC-M06-01..UC-M06-08                                  | Required by Conflict Score, dual confirmation and Manager VerifiedProfile approval. |
| Legal citation guardrails          | UC-M07-01, UC-M07-03, UC-M07-04                       | Required by A2.                                                                     |
| Document operations                | UC-M08-03..UC-M08-05                                  | Required to distinguish readiness-only export vs final compliance report.           |
| Audit/version/attestation tracking | UC-M09-01..UC-M09-05                                  | Required by audit trail and A3.                                                     |
| Source privacy controls            | UC-M10-01..UC-M10-05                                  | Required by no raw source to LLM/storage guardrail.                                 |

## Name / ID / Module Mismatches

| Area                                     | Mismatch Type                 | Impact                                                                                                              | Recommendation                                                                        |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Source A vs Source B IDs                 | ID_MISMATCH                   | Expected due different conventions.                                                                                 | Keep Source B `UC-MXX-XX` as current standard.                                        |
| Source A modules vs Source B modules     | MODULE_MISMATCH               | Expected due Source A 6 modules vs current 10-module design.                                                        | Keep Source B modules unless PRD scope changes.                                       |
| MFA login references in Flow/Sequence/UX | FIX_COMPLETED                 | `UC-M01-10` is explicitly referenced in Flowchart, Sequence Diagram, UX/API and traceability.                       | No further action before validation.                                                  |
| Use Case Definition heading style        | FIX_COMPLETED                 | Strict markdown format is now applied to all use cases.                                                             | No further action before validation.                                                  |
| Manager approval before report           | FIX_COMPLETED                 | `UC-M06-08 Review and Approve VerifiedProfile` added and mapped.                                                    | No further action before validation.                                                  |
| Run scan / re-scan                       | FIX_COMPLETED                 | `UC-M04-08 Run Repository Scan` added and mapped.                                                                   | No further action before validation.                                                  |

## Recommended Updates

### Completed Must Fix

| Issue                                                          | Reason                                                                                                                          | Proposed Update                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing explicit Run Scan / Re-scan use case                   | Product policy model includes Developer `RUN_SCAN`; GitHub App read-only path is default MVP evidence path.                     | Completed: `UC-M04-08`, `FR-066`, `BR-077`, NFR/flow/sequence/UX/API/traceability updated. |
| Missing explicit Manager approval / review before final report | Product constraints require Manager approval of VerifiedProfile and no final report with unresolved material/critical conflict. | Completed: `UC-M06-08`, `FR-067`, `BR-078`, state/flow/sequence/UX/API/traceability updated. |
| MFA login mapping incomplete in Flowchart / Sequence / UX      | `UC-M01-10 Login With MFA` exists but some artifacts previously mapped MFA login to `UC-M01-02`/`UC-M01-05` only.               | Completed: MFA login mappings explicitly reference `UC-M01-10`. |
| Strict Use Case Definition format mismatch                     | Previous content sections existed, but heading style differed from requested exact format.                                      | Completed: all use cases use strict Use Case Definition format. |

### Completed / Deferred Should Fix

| Issue                                                             | Reason                                                                           | Proposed Update                                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Missing `View Gap Analysis` user-facing use case                  | Source A and earlier product journey include Manager viewing Gap Analysis.       | Completed: `UC-M08-06`, `FR-068`, `BR-079`, UX/flow/sequence/API/traceability updated. |
| Missing Manager dashboard / assessment progress use case          | Manager-led workflow requires progress visibility.                               | Deferred as a separate use case; current UX screen exists and no new backlog is created before validation. |
| Missing email verification / change password / profile management | Traditional web app coverage was incomplete relative to Source A.                | Completed where already implied: `UC-M01-11`, `UC-M01-12`, `UC-M01-13`, `FR-063..FR-065`, `BR-074..BR-076`. |
| NFR-005 does not explicitly reference `UC-M01-10`                 | Brute-force protection applies to MFA login challenge.                           | Completed: `NFR-005` references `UC-M01-10`, `FR-006`, `BR-008`. |
| Source A admin/legal corpus workflows are absent                  | Could be intentional due 2-role MVP, but A2 depends on legal corpus reliability. | Completed as deferred/out-of-MVP notes in use case specification. |

### Could Improve

| Improvement                                                      | Benefit                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Add trace notes for Source A out-of-scope use cases              | Avoid future confusion between legacy full-platform scope and current MVP scope. |
| Add explicit validation dependency tags to missing/partial areas | Clarifies A1/A2/A3 impact before backlog.                                        |
| Add exception flow detail for scan failure/re-scan               | Improves readiness for backlog after validation.                                 |
| Add audit event names to all new/adjusted use cases              | Keeps audit traceability consistent.                                             |

## Readiness Impact

Current readiness status remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```

Additional consistency flag from this comparison:

```text
DETAILED_DESIGN_CONSISTENCY_FIX_COMPLETED
```

Reason:

- A1-A3 still have no real validation result.
- Use case coverage/mapping gaps from this report have been fixed or explicitly deferred.
- Backlog remains blocked only because A1-A3 validation results are still missing.

## Next Step Recommendation

The next step should be validation execution only, not backlog creation.

Recommended immediate action:

1. Decide whether Source A legacy/admin/CLI/legal-corpus use cases are out of MVP or should be recorded as deferred scope.
2. Add or map missing MVP-critical use cases:
   - Run Repository Scan / Re-scan.
   - Review and Approve VerifiedProfile or pre-final-report review.
   - View Gap Analysis if Manager UI requires it.
3. Update Flowchart / Sequence / UX mappings for `UC-M01-10 - Login With MFA`.
4. Optionally normalize exact Use Case Definition markdown headings if strict template compliance is required.
5. Keep backlog blocked until A1-A3 validation results and required consistency fixes are complete.
