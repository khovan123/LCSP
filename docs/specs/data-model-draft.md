# LCSP Data Model Draft

## Purpose

Conceptual/logical data model cho pre-implementation review. Đây không phải Prisma schema, SQL DDL hoặc code.

## Entities

| Entity | Purpose | Key fields | Relationships | Retention/security notes |
| --- | --- | --- | --- | --- |
| User | LCSP user identity | id, organization_id, email, email_verified_at, name, display_name, timezone, auth_provider, password_changed_at, mfa_enabled, mfa_enabled_at, last_mfa_verified_at, failed_mfa_attempts, locked_until | belongs to Organization; joins Assessment via AssessmentMember; has UserMfaMethod | PII; auth/MFA/profile fields protected |
| UserMfaMethod | Authenticator App MFA enrollment | id, user_id, method_type=`AUTHENTICATOR_APP`, secret_reference or mfa_secret_encrypted, enabled, enabled_at, last_verified_at | belongs to User | Secret must not be stored/logged plaintext |
| Organization | Tenant/account boundary | id, name, settings, status | has Users and Assessments | Tenant isolation |
| Assessment | Compliance assessment | id, organization_id, manager_id, status, current_state, system_name | has profiles, evidence, conflicts, reports, audit | Retain per compliance policy |
| AssessmentMember | Role membership per assessment | assessment_id, user_id, role, status | links User and Assessment | Developer access scoped |
| DeveloperPolicy | Assigned Developer permissions | assessment_member_id, policy_code, granted_by, granted_at, revoked_at | belongs to AssessmentMember | Policy changes audited |
| WizardProfile | Business/legal answers | assessment_id, version, purpose, sector, data_type, user_group, user_impact, decision_role, human_oversight, external_llm_usage, submitted_at | belongs to Assessment | A1 may change fields |
| TechnicalEvidenceReport | Evidence report metadata | id, assessment_id, source_type, system_identifier, provenance, scanner_version, ruleset_version, timestamp, scope, privacy_flags, report_hash | has findings/gate results; may produce TechnicalProfile | No raw source storage |
| EvidenceFinding | Technical finding | id, report_id, finding_type, severity, confidence, evidence_ref, redaction_status | belongs to TechnicalEvidenceReport | Avoid long code snippets and secrets |
| EvidenceGateResult | Gate outcome | id, report_id, gate_type, status, reason, evaluated_at | belongs to TechnicalEvidenceReport | Audit required |
| TechnicalProfile | Normalized technical truth | id, report_id, normalized_claims, generated_at | derived from TechnicalEvidenceReport | Does not make legal conclusions |
| Conflict | Wizard vs technical mismatch | id, assessment_id, field, conflict_type, severity, conflict_score, status | has ConflictResolutions | Blocks final when material/critical |
| ConflictResolution | Human confirmation/resolution | id, conflict_id, actor_id, role, decision, reason, confirmed_at | belongs to Conflict | Role-bound; critical requires dual confirmation |
| HumanAttestation | Structured evidence supplement | id, assessment_id, actor_id, role, claim, reason, scope, timestamp, status | may link findings/conflicts | Cannot replace machine metadata |
| VerifiedProfile | Canonical classification input | id, assessment_id, version, wizard_ref, technical_profile_ref, resolution_refs, approval_status | derived from Wizard/Evidence/Resolutions | Required for classification |
| RiskClassificationResult | Risk output | id, verified_profile_id, risk_level, rule_refs, citation_refs, legal_corpus_version, status | belongs to VerifiedProfile | Must trace to LegalRule/LegalCitation |
| GapAnalysisResult | Compliance gap output | id, classification_id, gaps, obligations, citations | belongs to RiskClassificationResult | No Wizard-only generation |
| ComplianceDocument | Generated artifact metadata | id, assessment_id, document_type, version, status, file_ref | belongs to Assessment | Object storage; no raw source |
| GeneratedDocumentFile | Generated file record | id, document_id, object_storage_ref, content_hash, retention_class | belongs to ComplianceDocument | Generated docs/non-source artifacts only |
| AuditEvent | Lifecycle/security audit record | id, assessment_id, actor_id, event_type, object_type, object_id, metadata, timestamp | links User and Assessment where applicable | Append-oriented; metadata only |
| LegalDocumentVersion | Legal corpus source version | id, source, version, effective_date, loaded_at | has LegalRules | Required for traceability |
| LegalRule | Structured rule | id, rule_id, legal_document_version_id, condition, classification_mapping | links LegalCitation | Versioned; A2 dependent |
| LegalCitation | Legal source reference | id, legal_rule_id, legal_source, section_ref, citation_ref, effective_date | belongs to LegalRule | Required for critical classification output |

## Audit Event Types

Authentication/MFA event types:

- `USER_REGISTERED`
- `EMAIL_VERIFIED`
- `EMAIL_VERIFICATION_FAILED`
- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `LOGOUT`
- `SESSION_REFRESHED`
- `SESSION_EXPIRED`
- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_RESET_COMPLETED`
- `PASSWORD_CHANGED`
- `PASSWORD_CHANGE_FAILED`
- `PROFILE_UPDATED`
- `PROFILE_UPDATE_REJECTED`
- `MFA_SETUP_STARTED`
- `MFA_ENABLED`
- `MFA_LOGIN_SUCCESS`
- `MFA_LOGIN_FAILED`
- `MFA_DISABLED`
- `MFA_RESET_REQUESTED`
- `MFA_RESET_COMPLETED`

LCSP workflow event types include assessment, Wizard, evidence, conflict, attestation, classification, document and audit export events as defined in design docs.

Evidence/scan consistency event types include:

- `REPOSITORY_SCAN_STARTED`
- `REPOSITORY_SCAN_COMPLETED`
- `REPOSITORY_SCAN_FAILED`
- `SOURCE_PRIVACY_VIOLATION_DETECTED`
- `VERIFIED_PROFILE_APPROVED`
- `VERIFIED_PROFILE_APPROVAL_BLOCKED`
- `GAP_ANALYSIS_VIEWED`
- `GAP_ANALYSIS_VIEW_BLOCKED`

## Relationship Notes

- Assessment is the aggregate root for compliance workflow.
- UserMfaMethod is separated conceptually so MFA methods can evolve without changing assessment model.
- VerifiedProfile is derived, versioned and auditable.
- Classification links to VerifiedProfile and LegalRule/LegalCitation.
- AuditEvent references every material lifecycle transition.
- Raw source code is not a persistent entity.

## Validation Dependencies

| Assumption | Affected Entities |
| --- | --- |
| A1 | WizardProfile, EvidenceGateResult, Conflict, VerifiedProfile |
| A2 | LegalDocumentVersion, LegalRule, LegalCitation, RiskClassificationResult |
| A3 | DeveloperPolicy, ConflictResolution, HumanAttestation, AuditEvent |

## Open Questions

- MFA recovery authority is not finalized because MVP exposes only Manager and Developer roles.
- Final physical schema, indexes and retention policies are deferred.
- Final legal rule/citation format depends on A2 validation.
