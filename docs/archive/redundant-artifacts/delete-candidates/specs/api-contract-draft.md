# LCSP API Contract Draft

## Purpose

Draft endpoint groups ở mức product/architecture. Tài liệu này không viết controller code, không khóa REST/GraphQL path và không tạo implementation task.

## Endpoint Groups

| Group | Purpose | Main request fields | Main response fields | Auth requirement | State dependency | Guardrails | Audit event |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Authentication & MFA - Register | Create user account through approved signup/invite path | email, password or identity_ref, invite_token, organization_context | user_id, verification_status | Public with invite/signup policy | None | Password policy if password auth is used | USER_REGISTERED |
| Authentication & MFA - Verify email | Verify email after registration or email change | verification_token | verification_status | Public token / pending account | Email verification pending | Token is short-lived and single-use | EMAIL_VERIFIED, EMAIL_VERIFICATION_FAILED |
| Authentication & MFA - Login | Verify identity and start session or MFA challenge | email/identity_ref, password or SSO assertion | session_state, mfa_required, challenge_id | Public | Account active | Rate limit failures; MFA-enabled account requires OTP before session | LOGIN_SUCCESS, LOGIN_FAILED |
| Authentication & OAuth/OIDC - Initiate login | Start OAuth/OIDC login with configured provider | provider_id, return_url | authorization_redirect_ref, state_ref | Public | Provider configured | Authorization code flow with PKCE; no frontend client secret | OAUTH_LOGIN_STARTED |
| Authentication & OAuth/OIDC - Callback | Validate provider callback and create/link LCSP identity/session | code, state, provider_callback_metadata | session_state, linked_account_status, mfa_required | Public callback | OAuth/OIDC login in progress | Validate redirect URI, state, nonce, issuer, audience, expiry and safe account linking | OAUTH_LOGIN_SUCCESS, OAUTH_LOGIN_FAILED, OAUTH_CALLBACK_VALIDATION_FAILED, OAUTH_ACCOUNT_LINKED |
| Authentication & OAuth/OIDC - Account linking status | Show linked identity status without exposing provider tokens | user_id | providers, linked_at, last_login_at | Authenticated | Active account | No raw provider token in UI/API response | OAUTH_ACCOUNT_LINKED |
| Authentication & MFA - Logout | End active session | session_id/token | logout_status | Authenticated | Active session | Revokes current session/token | LOGOUT |
| Authentication & MFA - Refresh session/token | Refresh active session if allowed | refresh_token/session_id | new_session_state | Authenticated/refreshable | Active refresh state | Respect session lifetime and MFA state | SESSION_REFRESHED |
| Authentication & MFA - Start MFA setup | Generate Authenticator App setup QR/manual key | user_id | setup_id, qr_ref, manual_key_display_once | Authenticated | Active account | Secret not persisted/logged plaintext | MFA_SETUP_STARTED |
| Authentication & MFA - Verify MFA setup | Verify OTP and enable MFA | setup_id, otp_code | mfa_enabled, enabled_at | Authenticated | MFA setup pending | Invalid/expired OTP rejected | MFA_ENABLED, MFA_LOGIN_FAILED |
| Authentication & MFA - Verify MFA login | Complete login challenge with OTP | challenge_id, otp_code | session_state | Password/identity verified | MFA challenge pending | Invalid OTP counted/rate-limited | MFA_LOGIN_SUCCESS, MFA_LOGIN_FAILED |
| Authentication & MFA - Disable MFA | Disable MFA after re-authentication | otp_code, reauth_token | mfa_enabled=false | Authenticated + recent reauth | MFA enabled | Requires valid OTP/re-authentication | MFA_DISABLED |
| Authentication & MFA - Reset MFA | Reset MFA through recovery/support/admin verification | user_id, recovery_case_ref, verification_result | reset_status | Recovery policy authority | Recovery case active | Cannot bypass authentication policy | MFA_RESET_REQUESTED, MFA_RESET_COMPLETED |
| Authentication & MFA - Change password | Change password for password-auth account | current_password or reauth_token, new_password, confirmation | change_status | Authenticated + recent reauth/current password | Active account | Password policy and failed-attempt protection apply | PASSWORD_CHANGED, PASSWORD_CHANGE_FAILED |
| Authentication & MFA - Manage personal profile | Update allowed personal profile fields | display_name, timezone, allowed_profile_fields | profile | Authenticated | Active account | Cannot change role, policy or assessment ownership | PROFILE_UPDATED, PROFILE_UPDATE_REJECTED |
| Assessment | Create/view assessment | system_name, organization_id | assessment_id, status | Manager | none/create | Manager owns assessment | ASSESSMENT_CREATED |
| Wizard | Save/submit Wizard answers | assessment_id, answers, draft_flag | WizardProfile, readiness status | Manager | WIZARD_IN_PROGRESS | Wizard-only has no HIGH/MEDIUM/LOW or provisional risk label | WIZARD_PROGRESS_SAVED, WIZARD_PROFILE_SUBMITTED |
| Developer invite / policy | Invite Developer and assign/revoke policies | assessment_id, email/user_id, policies | invitation, policy scope | Manager | assessment exists | Developer only sees assigned tasks | DEVELOPER_INVITED, DEVELOPER_POLICY_ASSIGNED, DEVELOPER_ACCESS_REVOKED |
| Evidence repository scan | Connect GitHub repository, list connected repositories, run/re-run repository scan, get scan status/findings and evidence gate status | assessment_id, repo_ref, branch, commit, scan_job_id | repository_connection_status, scan_job_id, scan_status, findings_ref, gate_status | Manager owner; or Developer with delegated `CONNECT_REPOSITORY`/`RUN_REPOSITORY_SCAN` policy | WAITING_FOR_REPOSITORY_CONNECTION / WAITING_FOR_REPOSITORY_SCAN / REPOSITORY_SCAN_RUNNING | OAuth/OIDC login does not grant repository access; GitHub App connection required; scanner creates TechnicalEvidenceReport; no raw source to LLM; no long-term raw source | GITHUB_REPOSITORY_CONNECTED, REPOSITORY_SCAN_STARTED, REPOSITORY_SCAN_COMPLETED, REPOSITORY_SCAN_FAILED, EVIDENCE_GATE_RESULT |
| Evidence gates | Validate evidence report | evidence_id | gate result/status/reasons | System; Manager/Developer view by scope | evidence received | Schema gate rejects; quality gate marks insufficient/ready | EVIDENCE_SCHEMA_VALIDATED, EVIDENCE_QUALITY_EVALUATED |
| Reconciliation | Create/resolve conflicts and approve VerifiedProfile | assessment_id, conflict_resolution_inputs, verified_profile_approval | conflicts, manager_resolution_task, verified_profile_status | Manager owner; optional Developer clarification by delegated scope | TECHNICAL_EVIDENCE_READY / VERIFIED_PROFILE_READY | MVP conflict resolution requires Manager; Developer assignment is not required; Manager approval blocked if conflict unresolved | CONFLICT_CREATED, CONFLICT_ROUTED_TO_MANAGER, CONFLICT_RESOLVED_BY_MANAGER, VERIFIED_PROFILE_APPROVED |
| Attestation | Submit structured attestation | assessment_id, claim, reason, scope, role | accepted/rejected/pending | Manager/Developer per claim | evidence/reconciliation active | Cannot replace forbidden metadata | HUMAN_ATTESTATION_SUBMITTED, ATTESTATION_REJECTED |
| Classification | Run/view classification | assessment_id | risk result, rule trace, status | Manager/System | VERIFIED_PROFILE_READY / READY_FOR_CLASSIFICATION | Requires legal citations and no unresolved material conflict | RISK_CLASSIFICATION_RUN, CLASSIFICATION_BLOCKED_OR_DEGRADED |
| Gap analysis | Generate/view gaps | assessment_id | gap list, obligations, priorities, evidence basis, citations | Manager/System | CLASSIFICATION_COMPLETED | Not from Wizard-only readiness; not a final report | GAP_ANALYSIS_RUN, GAP_ANALYSIS_VIEWED |
| Document generation | Generate/export report | assessment_id, document_type, template/version | document metadata/ref/status | Manager | valid classification/gap or readiness-only path | No final report if conflict unresolved | COMPLIANCE_REPORT_GENERATED, READINESS_EXPORT_GENERATED |
| Audit | View/export audit trail | assessment_id, filters | audit events/export ref | Manager; Developer limited if later scoped | any | Metadata only; no raw source/secrets | AUDIT_TRAIL_VIEWED, AUDIT_TRAIL_EXPORTED |

## Cross-cutting API Guardrails

- All material write actions must create AuditEvent.
- State transitions must enforce `docs/specs/state-machine.md`.
- Developer cannot call Manager-only actions.
- Manager can call all active MVP assessment/evidence/conflict/classification/report actions for own assessment.
- Developer assignment must not be required to complete MVP assessment flow.
- OAuth/OIDC login authenticates LCSP identity only and does not grant GitHub repository access.
- Classification endpoint must reject calls before VerifiedProfile.
- Evidence endpoints must reject raw-source persistence beyond temporary scan workspace.
- Authenticator App MFA uses TOTP-compatible apps; SMS OTP is not in MVP scope.
- MFA secret must not be stored/logged plaintext.

## Related Use Cases

| Endpoint Group | Related Use Cases |
| --- | --- |
| Authentication & MFA / OAuth-OIDC | UC-M01-01..UC-M01-14 |
| Developer invite / policy | UC-M02-04, UC-M02-05, UC-M02-06 |
| Wizard | UC-M03-02..UC-M03-06 |
| Evidence repository scan | UC-M04-02, UC-M04-08 |
| Evidence gates | UC-M05-01..UC-M05-05 |
| Reconciliation | UC-M06-01..UC-M06-08 |
| Classification | UC-M07-01..UC-M07-05 |
| Gap analysis | UC-M08-01, UC-M08-06 |
| Document generation | UC-M08-02..UC-M08-05 |
| Audit | UC-M09-01..UC-M09-05 |

## Deferred / Future API

The following API groups are not part of the MVP main workflow and must not be used for MVP backlog until scope is explicitly reopened:

| Deferred API Group | Related Use Cases | Notes |
| --- | --- | --- |
| Local/CI evidence report upload | UC-M04-03 | Future/Enterprise evidence path; requires provenance/integrity policy. |
| Manual technical evidence JSON upload | UC-M04-04 | Future/Enterprise path; depends on A3 controls and strict schema. |
| CLI/CI evidence submission | Deferred Source A use cases | Future automation path; not exposed in Manager/Developer MVP flow. |
