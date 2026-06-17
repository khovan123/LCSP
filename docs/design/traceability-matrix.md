# LCSP Traceability Matrix

## Purpose

Tài liệu này kiểm tra mapping giữa Use Case, Functional Requirement, Non-Functional Requirement, Business Rule, UX, flowchart, sequence diagram và entity. Đây là artifact consistency trước backlog, không phải backlog.

## ID Conventions

| Artifact | Convention |
| --- | --- |
| Use Case | `UC-MXX-XX` |
| Functional Requirement | `FR-XXX` |
| Non-Functional Requirement | `NFR-XXX` |
| Business Rule | `BR-XXX` |

## Use Case to FR Matrix

| Use Case ID | Use Case Name | Related FR IDs |
| --- | --- | --- |
| UC-M01-01 | Register Account | FR-001 |
| UC-M01-02 | Login | FR-002 |
| UC-M01-03 | Logout | FR-010 |
| UC-M01-04 | Setup MFA Using Authenticator App | FR-003, FR-004 |
| UC-M01-05 | Verify MFA Code | FR-005, FR-007 |
| UC-M01-06 | Disable MFA | FR-008 |
| UC-M01-07 | Reset MFA | FR-009 |
| UC-M01-08 | Manage Session | FR-010 |
| UC-M01-09 | Reset Password | FR-011 |
| UC-M01-10 | Login With MFA | FR-006 |
| UC-M01-11 | Verify Email | FR-063 |
| UC-M01-12 | Change Password | FR-064 |
| UC-M01-13 | Manage Personal Profile | FR-065 |
| UC-M02-01 | Create Organization | FR-012 |
| UC-M02-02 | Manage Organization Members | FR-013 |
| UC-M02-03 | Assign Manager Role | FR-014 |
| UC-M02-04 | Invite Developer | FR-015 |
| UC-M02-05 | Assign Developer Policy | FR-016 |
| UC-M02-06 | Revoke Developer Access | FR-017 |
| UC-M03-01 | Create Assessment | FR-018 |
| UC-M03-02 | Fill Web Wizard | FR-019 |
| UC-M03-03 | Save Wizard Progress | FR-020 |
| UC-M03-04 | Submit WizardProfile | FR-021 |
| UC-M03-05 | View Self-Declared Readiness | FR-022 |
| UC-M03-06 | View Preliminary Indicators | FR-023 |
| UC-M04-01 | Accept Developer Task | FR-024 |
| UC-M04-02 | Connect GitHub Repository | FR-025 |
| UC-M04-03 | Upload Local/CI Scanner Report | FR-026 |
| UC-M04-04 | Upload Manual Technical Evidence JSON | FR-027 |
| UC-M04-05 | Review Technical Findings | FR-028 |
| UC-M04-06 | Confirm Technical Truth | FR-029 |
| UC-M04-07 | Provide Structured Technical Attestation | FR-030 |
| UC-M04-08 | Run Repository Scan | FR-066 |
| UC-M05-01 | Validate Evidence Schema | FR-031 |
| UC-M05-02 | Validate Privacy Flags | FR-032 |
| UC-M05-03 | Evaluate Evidence Quality | FR-033 |
| UC-M05-04 | Generate TechnicalProfile | FR-034 |
| UC-M05-05 | Mark Evidence as Rejected, Insufficient, or Ready | FR-035 |
| UC-M06-01 | Detect Conflict | FR-036 |
| UC-M06-02 | Calculate Conflict Score | FR-037 |
| UC-M06-03 | Route Conflict to Manager or Developer | FR-038 |
| UC-M06-04 | Resolve Technical Conflict | FR-039 |
| UC-M06-05 | Resolve Business/Legal Conflict | FR-040 |
| UC-M06-06 | Perform Dual Confirmation | FR-041 |
| UC-M06-07 | Create VerifiedProfile | FR-042 |
| UC-M06-08 | Review and Approve VerifiedProfile | FR-067 |
| UC-M07-01 | Retrieve Legal Rules/Citations | FR-043 |
| UC-M07-02 | Run Risk Classification Agent | FR-044 |
| UC-M07-03 | Trace Classification to Legal Rule | FR-045 |
| UC-M07-04 | Block or Degrade Classification if Citation Missing | FR-046 |
| UC-M07-05 | View Classification Result | FR-047 |
| UC-M08-01 | Run Gap Analysis Agent | FR-048 |
| UC-M08-02 | Generate Compliance Report | FR-049 |
| UC-M08-03 | Generate Readiness-Only Export | FR-050 |
| UC-M08-04 | View Document Status | FR-051 |
| UC-M08-05 | Download Generated Document | FR-052 |
| UC-M08-06 | View Gap Analysis | FR-068 |
| UC-M09-01 | Write Audit Event | FR-053 |
| UC-M09-02 | View Audit Trail | FR-054 |
| UC-M09-03 | Export Audit Trail | FR-055 |
| UC-M09-04 | Track Evidence, Report, and Document Version | FR-056 |
| UC-M09-05 | Track Human Attestation Usage | FR-057 |
| UC-M10-01 | Enforce Source Code Privacy Policy | FR-058 |
| UC-M10-02 | Redact Secrets | FR-059 |
| UC-M10-03 | Clean Temporary Workspace | FR-060 |
| UC-M10-04 | Enforce No Raw Source to LLM | FR-061 |
| UC-M10-05 | Enforce No Long-Term Raw Source Storage | FR-062 |

## FR to BR Matrix

| FR Range | Business Rule IDs |
| --- | --- |
| FR-001..FR-011 | BR-001..BR-013 |
| FR-012..FR-017 | BR-014..BR-022 |
| FR-018..FR-023 | BR-023..BR-031 |
| FR-024..FR-030 | BR-021, BR-032..BR-035, BR-046, BR-052..BR-056 |
| FR-031..FR-035 | BR-036..BR-040 |
| FR-036..FR-042 | BR-041..BR-048 |
| FR-043..FR-047 | BR-049..BR-051 |
| FR-048..FR-052 | BR-062..BR-066 |
| FR-053..FR-057 | BR-067..BR-070 |
| FR-058..FR-062 | BR-057..BR-061 |
| FR-063..FR-065 | BR-074..BR-076 |
| FR-066 | BR-077 |
| FR-067 | BR-078 |
| FR-068 | BR-079 |

## FR to NFR Matrix

| FR IDs | Related NFR IDs |
| --- | --- |
| FR-001, FR-011 | NFR-001 |
| FR-003, FR-004 | NFR-002 |
| FR-005, FR-007 | NFR-003, NFR-005 |
| FR-006, FR-010 | NFR-003, NFR-004, NFR-005 |
| FR-008, FR-009 | NFR-006, NFR-007 |
| FR-016, FR-024 | NFR-008, NFR-009 |
| FR-019..FR-023 | NFR-010, NFR-011 |
| FR-025, FR-066 | NFR-014, NFR-022 |
| FR-031..FR-035 | NFR-017, NFR-023 |
| FR-043..FR-047 | NFR-019, NFR-020 |
| FR-049, FR-050, FR-068 | NFR-021 |
| FR-053..FR-057 | NFR-007, NFR-018 |
| FR-058..FR-062 | NFR-012, NFR-013, NFR-015, NFR-016 |

## Use Case to Sequence Diagram Matrix

| Use Case ID | Use Case Name | Sequence Diagram |
| --- | --- | --- |
| UC-M01-01 | Register Account | Register and Login |
| UC-M01-02 | Login | Register and Login |
| UC-M01-04 | Setup MFA Using Authenticator App | Setup MFA Using Authenticator App |
| UC-M01-05 | Verify MFA Code | Setup MFA Using Authenticator App; Login With MFA |
| UC-M01-06 | Disable MFA | Disable / Reset MFA |
| UC-M01-07 | Reset MFA | Disable / Reset MFA |
| UC-M01-10 | Login With MFA | Login With MFA |
| UC-M01-11 | Verify Email | Register and Login |
| UC-M01-12 | Change Password | Register and Login |
| UC-M01-13 | Manage Personal Profile | Register and Login |
| UC-M03-01 | Create Assessment | Manager Creates Assessment |
| UC-M02-04 | Invite Developer | Manager Invites Developer |
| UC-M02-05 | Assign Developer Policy | Manager Invites Developer |
| UC-M04-02 | Connect GitHub Repository | Developer Provides GitHub Evidence |
| UC-M04-08 | Run Repository Scan | Developer Provides GitHub Evidence |
| UC-M04-03 | Upload Local/CI Scanner Report | Developer Uploads Local/CI Evidence |
| UC-M05-01..UC-M05-05 | Evidence gate use cases | Evidence Gate Processing |
| UC-M06-01..UC-M06-06 | Reconciliation use cases | Reconciliation with Conflict |
| UC-M04-07 | Provide Structured Technical Attestation | Human Attestation |
| UC-M06-07 | Create VerifiedProfile | VerifiedProfile Creation and Approval |
| UC-M06-08 | Review and Approve VerifiedProfile | VerifiedProfile Creation and Approval |
| UC-M07-01..UC-M07-04 | Classification/citation use cases | Risk Classification with Legal Citation |
| UC-M08-01..UC-M08-06 | Gap/document use cases | Document Generation |
| UC-M09-01 | Write Audit Event | Audit Event Recording |

## Use Case to Flowchart Matrix

| Flowchart | Related Use Cases |
| --- | --- |
| Overall Assessment Flow | UC-M03-01, UC-M03-02, UC-M03-04, UC-M02-04, UC-M02-05, UC-M04-02..UC-M04-04, UC-M04-08, UC-M05-01..UC-M05-05, UC-M06-01..UC-M06-08, UC-M07-02, UC-M08-01, UC-M08-02, UC-M08-06, UC-M09-01 |
| Login With MFA Flow | UC-M01-02, UC-M01-10, UC-M01-05 |
| Setup MFA Using Authenticator App Flow | UC-M01-04, UC-M01-05 |
| Manager Wizard Flow | UC-M03-01..UC-M03-06 |
| Developer Evidence Flow | UC-M04-01..UC-M04-04, UC-M04-08 |
| Evidence Gate Flow | UC-M05-01..UC-M05-05 |
| Reconciliation Flow | UC-M06-01..UC-M06-08 |
| Risk Classification Flow | UC-M07-01..UC-M07-05 |
| Report Generation Flow | UC-M08-02, UC-M08-03, UC-M08-06 |
| Human Attestation Flow | UC-M04-07, UC-M06-06, UC-M09-05 |
| Blocked State Flow | UC-M05-05, UC-M06-06, UC-M07-04, UC-M08-02 |

## Use Case to UX Screen Matrix

| UX Screen | Related Use Cases |
| --- | --- |
| Register/Login/Profile | UC-M01-01, UC-M01-02, UC-M01-03, UC-M01-10, UC-M01-11, UC-M01-12, UC-M01-13 |
| MFA setup / QR / manual key | UC-M01-04 |
| OTP verification / MFA login | UC-M01-05, UC-M01-10 |
| MFA recovery/reset | UC-M01-06, UC-M01-07 |
| Dashboard/Create Assessment | UC-M03-01 |
| Wizard | UC-M03-02, UC-M03-03, UC-M03-04 |
| Self-Declared Readiness | UC-M03-05, UC-M03-06 |
| Invite Developer | UC-M02-04, UC-M02-05, UC-M02-06 |
| Developer Task Inbox | UC-M04-01 |
| GitHub Connect/Run Scan/Evidence Upload | UC-M04-02, UC-M04-03, UC-M04-04, UC-M04-08 |
| Technical Findings Review | UC-M04-05, UC-M04-06 |
| Technical Attestation Form | UC-M04-07 |
| Reconciliation Review/VerifiedProfile Review | UC-M06-01..UC-M06-08 |
| Classification Result/Locked | UC-M07-02..UC-M07-05 |
| Gap Analysis/Report Generation | UC-M08-02..UC-M08-06 |
| Audit Trail | UC-M09-01..UC-M09-05 |

## Entity to Use Case Matrix

| Entity | Related Use Cases |
| --- | --- |
| User | UC-M01-01..UC-M01-13 |
| UserMfaMethod | UC-M01-04..UC-M01-07 |
| Organization | UC-M02-01..UC-M02-03 |
| Assessment | UC-M03-01, UC-M09-01 |
| AssessmentMember | UC-M02-04, UC-M04-01 |
| DeveloperPolicy | UC-M02-05, UC-M02-06, UC-M04-01 |
| WizardProfile | UC-M03-02..UC-M03-06 |
| TechnicalEvidenceReport | UC-M04-02..UC-M05-05, UC-M04-08 |
| EvidenceFinding | UC-M04-05, UC-M05-04 |
| EvidenceGateResult | UC-M05-01..UC-M05-05 |
| TechnicalProfile | UC-M05-04, UC-M06-01 |
| Conflict | UC-M06-01..UC-M06-06 |
| ConflictResolution | UC-M06-04..UC-M06-06 |
| HumanAttestation | UC-M04-07, UC-M09-05 |
| VerifiedProfile | UC-M06-07, UC-M06-08, UC-M07-02 |
| RiskClassificationResult | UC-M07-02..UC-M07-05 |
| GapAnalysisResult | UC-M08-01, UC-M08-06 |
| ComplianceDocument | UC-M08-02..UC-M08-05 |
| GeneratedDocumentFile | UC-M08-05 |
| AuditEvent | UC-M09-01..UC-M09-05 |
| LegalDocumentVersion | UC-M07-01 |
| LegalRule | UC-M07-01..UC-M07-04 |
| LegalCitation | UC-M07-01..UC-M07-04 |

## Validation Dependency Matrix

| Assumption | Use Cases | FRs | BRs | NFRs | Entities |
| --- | --- | --- | --- | --- | --- |
| A1 - Wizard simplicity vs completeness | UC-M03-02..UC-M03-06, UC-M05-03, UC-M06-01, UC-M06-07, UC-M06-08 | FR-019..FR-023, FR-033, FR-035, FR-036, FR-042, FR-050, FR-067 | BR-026..BR-031, BR-038, BR-040, BR-041, BR-045, BR-048, BR-065, BR-073, BR-078 | NFR-010, NFR-011, NFR-023 | WizardProfile, EvidenceGateResult, Conflict, VerifiedProfile |
| A2 - Legal corpus / rule reliability | UC-M07-01..UC-M07-05, UC-M08-01, UC-M08-02, UC-M08-06 | FR-043..FR-049, FR-056, FR-068 | BR-049..BR-051, BR-062..BR-064, BR-069, BR-073, BR-079 | NFR-019, NFR-020, NFR-021 | LegalDocumentVersion, LegalRule, LegalCitation, RiskClassificationResult, GapAnalysisResult |
| A3 - Human attestation abuse risk | UC-M02-05, UC-M02-06, UC-M04-06, UC-M04-07, UC-M04-08, UC-M06-03..UC-M06-06, UC-M06-08, UC-M09-01, UC-M09-05 | FR-016, FR-017, FR-027, FR-029, FR-030, FR-036..FR-042, FR-049, FR-053..FR-057, FR-066, FR-067 | BR-019, BR-021, BR-022, BR-041..BR-047, BR-052..BR-056, BR-063, BR-064, BR-067..BR-070, BR-072, BR-073, BR-077, BR-078 | NFR-008, NFR-009, NFR-018, NFR-021 | DeveloperPolicy, ConflictResolution, HumanAttestation, AuditEvent |

## Consistency Check Notes

- FR references use existing `UC-MXX-XX` IDs from `docs/design/use-case-specification.md`.
- BR references use existing `FR-XXX` IDs from `docs/design/functional-requirements.md`.
- NFR references use existing `FR-XXX`, `BR-XXX` and `UC-MXX-XX` IDs.
- Sequence diagram names use the same use case names as the use case specification.
- Flowchart labels use the same use case names as the use case specification.
- UX screens map to the same use case names and no SMS-based OTP flow is defined for MVP.

## Backlog Gate

Traceability normalization does not unblock backlog. Backlog remains blocked until A1-A3 validation results exist and required PRD/Architecture/ADR updates are complete.
