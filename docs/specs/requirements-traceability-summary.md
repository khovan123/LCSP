# Requirements Traceability Summary

## Purpose

This document is the active lightweight traceability summary for LCSP requirements. It summarizes existing UC, FR, BR, NFR and AC relationships without recreating the historical full matrix and without creating new requirements.

## Governance

- This document is authoritative for active summary-level traceability.
- Canonical active FR values are the `FR-001...` records in `docs/specs/functional-requirements.md`.
- Canonical active NFR values are the `NFR-001...` records in `docs/specs/non-functional-requirements.md`.
- PRD `FR-E*` and PRD `NFR-1..NFR-14` values shown in historical mapping columns are source aliases only, not implementation requirement IDs.

## AC to FR / BR / NFR Mapping

| AC | Statement | FR | BR | NFR |
| --- | --- | --- | --- | --- |
| AC-1 | A Wizard-only assessment never displays HIGH/MEDIUM/LOW. | FR-E2-3, FR-E2-4, FR-E7-3 | BR-030, BR-065 | NFR-12 |
| AC-2 | Risk Classification Agent cannot run before VerifiedProfile exists. | FR-E6-1, FR-E6-2 | BR-045, BR-049, BR-078 | NFR-9 |
| AC-3 | Technical evidence must pass schema completeness gate before reconciliation. | FR-E4-1 | BR-036 | NFR-7 |
| AC-4 | Technical evidence must pass quality threshold gate before classification unlock. | FR-E4-3, FR-E4-4 | BR-038 | NFR-12 |
| AC-5 | Any unresolved conflict blocks final classification/report until resolved. | FR-E5-6, FR-E7-2 | BR-025, BR-045, BR-063, BR-093 | NFR-9 |
| AC-6 | Manager conflict resolution is required and sufficient for MVP conflict completion when evidence gates pass. | FR-E5-3, FR-E5-4, FR-E5-5 | BR-042, BR-043, BR-047, BR-093 | NFR-9, NFR-11 |
| AC-7 | Evidence Confidence Score and AI Intervention Score never block workflow alone. | FR-E5-2 | BR-048, BR-085 | NO_DIRECT_NFR |
| AC-8 | Conflict handling uses binary MVP routing: conflict exists or not. Conflict Score may explain seriousness but does not create multiple routes. | FR-E5-2, FR-E5-6 | BR-048 | NO_DIRECT_NFR |
| AC-9 | Human technical attestation cannot replace machine-generated metadata listed in A3. | FR-E3-5, FR-E8-4 | BR-052, BR-053, BR-054, BR-056 | NFR-7 |
| AC-10 | Final report includes legal citation/rule trace or is not final. | FR-E6-3, FR-E6-4, FR-E7-2 | BR-050, BR-051, BR-063, BR-064, BR-084 | NFR-7, NFR-8, NFR-9 |
| AC-11 | Final report discloses human technical attestation when used for classification. | FR-E7-4, FR-E8-4 | BR-055, BR-064, BR-070 | NFR-7 |
| AC-12 | Audit trail records wizard, evidence, conflict, attestation, classification and document generation events. | FR-E8-1, FR-E8-2, FR-E8-3, FR-E8-4, FR-E8-5 | BR-067, BR-068, BR-069, BR-070, BR-094 | NFR-7 |
| AC-13 | PRD preserves all mandatory product decisions from Product Brief. | PRD_DOCUMENTATION_ACCEPTANCE | ALL_ACTIVE_PRODUCT_DECISIONS | N/A_DOCUMENTATION_ACCEPTANCE |
| AC-14 | PRD contains section for high-risk assumptions and validation requirements. | PRD_SECTION_15_VALIDATION_REQUIREMENTS | A1/A2/A3_DEPENDENT_BR_GROUPS | N/A_DOCUMENTATION_ACCEPTANCE |
| AC-15 | PRD does not define architecture, backlog or code. | PRD_DOCUMENT_BOUNDARY | NO_BR_RUNTIME_MAPPING | N/A_DOCUMENTATION_ACCEPTANCE |
| AC-16 | PRD is clear enough for Architect Agent to identify product constraints and unresolved assumptions. | PRD_READINESS_FOR_ARCHITECTURE | ARCHITECTURE_CONSTRAINT_TRACE | N/A_DOCUMENTATION_ACCEPTANCE |

## UC to FR / BR / NFR / AC Summary

| UC | Name | Status | Active FR / Source Alias | BR | Active NFR / Source Alias | AC |
| --- | --- | --- | --- | --- | --- | --- |
| UC-M01-01 | Register Account | ACTIVE | PLATFORM_BASELINE | BR-001, BR-002 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-02 | Login | ACTIVE | PLATFORM_BASELINE | BR-003 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-04 | Setup MFA Using Authenticator App | ACTIVE | PLATFORM_BASELINE | BR-006, BR-011 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-05 | Verify MFA Code | ACTIVE | PLATFORM_BASELINE | BR-007, BR-009 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-06 | Disable MFA | ACTIVE | PLATFORM_BASELINE | BR-010 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-07 | Reset MFA | ACTIVE | PLATFORM_BASELINE | BR-012, BR-013 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-08 | Manage Session | ACTIVE | PLATFORM_BASELINE | BR-005 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-09 | Reset Password | ACTIVE | PLATFORM_BASELINE | BR-004 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-10 | Login With MFA | ACTIVE | PLATFORM_BASELINE | BR-008 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-11 | Verify Email | ACTIVE | PLATFORM_BASELINE | BR-074 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-12 | Change Password | ACTIVE | PLATFORM_BASELINE | BR-075 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M01-13 | Manage Personal Profile | ACTIVE | PLATFORM_BASELINE | BR-076 | NFR-9, NFR-11 | NO_DIRECT_AC |
| UC-M01-14 | Sign In with OAuth/OIDC | ACTIVE | PLATFORM_BASELINE | BR-086, BR-087, BR-088 | NFR-3 | NO_DIRECT_AC |
| UC-M02-01 | Create Organization | ACTIVE | PLATFORM_BASELINE | BR-014 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M02-02 | Manage Organization Members | ACTIVE | PLATFORM_BASELINE | BR-015 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M02-03 | Assign Manager Role | ACTIVE | PLATFORM_BASELINE | BR-016 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M02-04 | Invite Developer | ACTIVE | FR-E1-2 | BR-017, BR-020 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M02-05 | Assign Developer Policy | ACTIVE | FR-E1-3, FR-E1-4 | BR-021, BR-090, BR-091 | NFR-7, NFR-9, NFR-11 | NO_DIRECT_AC |
| UC-M02-06 | Revoke Developer Access | ACTIVE | FR-E1-3, FR-E1-4 | BR-022, BR-092 | NFR-7, NFR-11 | NO_DIRECT_AC |
| UC-M03-01 | Create Assessment | ACTIVE | FR-E1-1, FR-E1-4, FR-E5-5, FR-E6-2, FR-E7-2 | BR-018, BR-023, BR-089 | NFR-9, NFR-11 | AC-2, AC-5, AC-6, AC-10 |
| UC-M03-02 | Fill Web Wizard | ACTIVE | FR-E2-1, FR-E2-2 | BR-026, BR-027, BR-031 | NFR-10 | NO_DIRECT_AC |
| UC-M03-03 | Save Wizard Progress | ACTIVE | FR-E2-1 | BR-028 | NFR-10 | NO_DIRECT_AC |
| UC-M03-04 | Submit WizardProfile | ACTIVE | FR-E2-1 | BR-029 | NFR-10 | NO_DIRECT_AC |
| UC-M03-05 | View Self-Declared Readiness | ACTIVE | FR-E2-3, FR-E2-4 | BR-030 | NFR-12 | AC-1 |
| UC-M04-01 | Accept Developer Task | ACTIVE | FR-E1-2, FR-E1-3 | BR-019, BR-071 | NFR-9, NFR-11 | NO_DIRECT_AC |
| UC-M04-02 | Connect GitHub Repository | ACTIVE | FR-E3-1 | BR-032 | NFR-3 | NO_DIRECT_AC |
| UC-M04-03 | Upload Local/CI Scanner Report | OUT_OF_SCOPE | FR-E3-2 | BR-033 | NFR-7 | NO_DIRECT_AC |
| UC-M04-04 | Upload Manual Technical Evidence JSON | OUT_OF_SCOPE | FR-E3-3 | BR-034 | PLATFORM_BASELINE | NO_DIRECT_AC |
| UC-M04-05 | Review Technical Findings | ACTIVE | FR-E1-4, FR-E3-1, FR-E4-2, FR-E5-5, FR-E6-2, FR-E7-2 | BR-035 | NFR-9, NFR-11 | AC-2, AC-5, AC-6, AC-10 |
| UC-M04-06 | Confirm Technical Truth | ACTIVE | FR-E1-3, FR-E1-4, FR-E5-3, FR-E5-5 | BR-046 | NFR-11 | AC-6 |
| UC-M04-07 | Provide Structured Technical Attestation | ACTIVE | FR-E3-5, FR-E8-4 | BR-052, BR-053, BR-056 | NFR-7, NFR-9, NFR-11 | AC-9, AC-11, AC-12 |
| UC-M04-08 | Run Repository Scan | ACTIVE | FR-E1-4, FR-E3-1, FR-E5-5, FR-E6-2, FR-E7-2 | BR-077 | NFR-3, NFR-6, NFR-9, NFR-11 | AC-2, AC-5, AC-6, AC-10 |
| UC-M05-01 | Validate Evidence Schema | ACTIVE | FR-E4-1 | BR-036 | NFR-7 | AC-3 |
| UC-M05-02 | Validate Privacy Flags | ACTIVE | FR-E3-4, FR-E4-1 | BR-037 | NFR-1, NFR-2 | AC-3 |
| UC-M05-03 | Evaluate Evidence Quality | ACTIVE | FR-E4-3, FR-E4-4 | BR-038 | NFR-12 | AC-4 |
| UC-M05-04 | Generate TechnicalProfile | ACTIVE | FR-E4-2, FR-E5-1 | BR-039, BR-080, BR-081 | NFR-7, NFR-8, NFR-9 | NO_DIRECT_AC |
| UC-M05-05 | Mark Evidence as Rejected, Insufficient, or Ready | ACTIVE | FR-E4-3, FR-E4-4 | BR-040 | NFR-12 | AC-4 |
| UC-M06-01 | Detect Conflict | ACTIVE | FR-E5-1, FR-E5-6 | BR-041, BR-083 | NFR-7 | AC-5, AC-8 |
| UC-M06-02 | Calculate Conflict Score | ACTIVE | FR-E4-2, FR-E5-1, FR-E5-2 | BR-048, BR-085 | PLATFORM_BASELINE | AC-7, AC-8 |
| UC-M06-03 | Route Conflict to Manager | ACTIVE | FR-E5-3 | BR-072 | PLATFORM_BASELINE | AC-6 |
| UC-M06-04 | Resolve Technical Conflict | ACTIVE | FR-E1-4, FR-E5-3, FR-E5-5, FR-E6-2, FR-E7-2 | BR-042, BR-047 | NFR-9, NFR-11 | AC-2, AC-5, AC-6, AC-10 |
| UC-M06-05 | Resolve Business/Legal Conflict | ACTIVE | FR-E1-4, FR-E5-3, FR-E5-4, FR-E5-5, FR-E6-2, FR-E7-2 | BR-043, BR-093 | NFR-9, NFR-11 | AC-2, AC-5, AC-6, AC-10 |
| UC-M06-06 | Post-MVP Delegated Technical Clarification | OUT_OF_SCOPE | FR-E1-3, FR-E1-4, FR-E5-3, FR-E5-5 | BR-044, BR-054 | NFR-7, NFR-11 | AC-6, AC-9 |
| UC-M06-07 | Create VerifiedProfile | ACTIVE | FR-E6-1 | BR-045 | PLATFORM_BASELINE | AC-2, AC-5 |
| UC-M06-08 | Review and Approve VerifiedProfile | ACTIVE | FR-E1-4, FR-E5-5, FR-E6-1, FR-E6-2, FR-E7-2 | BR-078 | NFR-7, NFR-9, NFR-11 | AC-2, AC-5, AC-6, AC-10 |
| UC-M07-01 | Retrieve Legal Rules/Citations | ACTIVE | FR-E4-3, FR-E6-3, FR-E6-4, FR-E6-5 | BR-082, BR-084 | NFR-7, NFR-8, NFR-9 | AC-4, AC-10 |
| UC-M07-02 | Run Risk Classification Agent | ACTIVE | FR-E6-2, FR-E6-3 | BR-049 | NFR-8, NFR-9 | AC-2, AC-10 |
| UC-M07-03 | Trace Classification to Legal Rule | ACTIVE | FR-E6-3, FR-E6-4, FR-E6-5 | BR-050 | NFR-7, NFR-8 | AC-10 |
| UC-M07-04 | Block or Degrade Classification if Citation Missing | ACTIVE | FR-E6-4 | BR-051, BR-073 | NFR-8, NFR-9, NFR-12 | AC-10 |
| UC-M08-01 | Run Gap Analysis Agent | ACTIVE | FR-E7-1 | BR-062 | NFR-8, NFR-9 | NO_DIRECT_AC |
| UC-M08-02 | Generate Compliance Report | ACTIVE | FR-E7-2 | BR-025, BR-063, BR-064 | NFR-7, NFR-8, NFR-9 | AC-5, AC-10, AC-11 |
| UC-M08-03 | Generate Readiness-Only Export | ACTIVE | FR-E7-3 | BR-065 | NFR-12 | AC-1 |
| UC-M08-04 | View Document Status | ACTIVE | FR-E7-2 | BR-066 | NFR-6, NFR-9 | AC-5, AC-10 |
| UC-M08-06 | View Gap Analysis | ACTIVE | FR-E7-1 | BR-079 | NFR-7, NFR-8, NFR-9 | NO_DIRECT_AC |
| UC-M09-01 | Write Audit Event | ACTIVE | FR-E1-3, FR-E1-4, FR-E8-1, FR-E8-2, FR-E8-3, FR-E8-4, FR-E8-5 | BR-024, BR-067, BR-094 | NFR-7, NFR-11 | AC-9, AC-11, AC-12 |
| UC-M09-03 | Export Audit Trail | ACTIVE | FR-E8-5 | BR-068 | NFR-1, NFR-7 | AC-12 |
| UC-M09-04 | Track Evidence, Report, and Document Version | ACTIVE | FR-E8-2, FR-E8-5 | BR-069 | NFR-7, NFR-8 | AC-12 |
| UC-M09-05 | Track Human Attestation Usage | ACTIVE | FR-E7-4, FR-E8-4 | BR-055, BR-070 | NFR-7 | AC-9, AC-11, AC-12 |
| UC-M10-01 | Enforce Source Code Privacy Policy | ACTIVE | FR-E3-1, FR-E8-2 | BR-061 | NFR-2 | AC-12 |
| UC-M10-02 | Redact Secrets | ACTIVE | FR-E3-4, FR-E8-2 | BR-059 | NFR-5 | AC-12 |
| UC-M10-03 | Clean Temporary Workspace | ACTIVE | FR-E3-1, FR-E8-2 | BR-060 | NFR-2 | AC-12 |
| UC-M10-04 | Enforce No Raw Source to LLM | ACTIVE | FR-E3-1, FR-E8-2 | BR-057 | NFR-1 | AC-12 |
| UC-M10-05 | Enforce No Long-Term Raw Source Storage | ACTIVE | FR-E3-1, FR-E8-2 | BR-058 | NFR-2 | AC-12 |

## BR Trace Resolution

| BR | UC | Active FR | PRD / Source Alias | Active NFR | PRD / Source Alias | Resolution |
| --- | --- | --- | --- | --- | --- | --- |
| BR-001 | UC-M01-01 | FR-001 | PLATFORM_BASELINE | NFR-001 | PLATFORM_BASELINE | RESOLVED |
| BR-002 | UC-M01-01 | FR-001 | PLATFORM_BASELINE | NFR-001 | PLATFORM_BASELINE | RESOLVED |
| BR-003 | UC-M01-02 | FR-002 | PLATFORM_BASELINE | NFR-005 | PLATFORM_BASELINE | RESOLVED |
| BR-004 | UC-M01-09 | FR-011 | PLATFORM_BASELINE | NFR-001 | PLATFORM_BASELINE | RESOLVED |
| BR-005 | UC-M01-08 | FR-010 | PLATFORM_BASELINE | NFR-004 | PLATFORM_BASELINE | RESOLVED |
| BR-006 | UC-M01-04 | FR-003 | PLATFORM_BASELINE | NFR-002 | PLATFORM_BASELINE | RESOLVED |
| BR-007 | UC-M01-05 | FR-005 | PLATFORM_BASELINE | NFR-003 | PLATFORM_BASELINE | RESOLVED |
| BR-008 | UC-M01-10 | FR-006 | PLATFORM_BASELINE | NFR-003 | PLATFORM_BASELINE | RESOLVED |
| BR-009 | UC-M01-05 | FR-007 | PLATFORM_BASELINE | NFR-003, NFR-005 | PLATFORM_BASELINE | RESOLVED |
| BR-010 | UC-M01-06 | FR-008 | PLATFORM_BASELINE | NFR-006 | PLATFORM_BASELINE | RESOLVED |
| BR-011 | UC-M01-04 | FR-004 | PLATFORM_BASELINE | NFR-002 | PLATFORM_BASELINE | RESOLVED |
| BR-012 | UC-M01-07 | FR-009 | PLATFORM_BASELINE | NFR-006 | PLATFORM_BASELINE | RESOLVED |
| BR-013 | UC-M01-07 | FR-009 | PLATFORM_BASELINE | NFR-006 | PLATFORM_BASELINE | RESOLVED |
| BR-014 | UC-M02-01 | FR-012 | PLATFORM_BASELINE | None | PLATFORM_BASELINE | RESOLVED |
| BR-015 | UC-M02-02 | FR-013 | PLATFORM_BASELINE | None | PLATFORM_BASELINE | RESOLVED |
| BR-016 | UC-M02-03 | FR-014 | PLATFORM_BASELINE | None | PLATFORM_BASELINE | RESOLVED |
| BR-017 | UC-M02-04 | FR-015 | FR-E1-2 | None | PLATFORM_BASELINE | RESOLVED |
| BR-018 | UC-M03-01 | FR-018, FR-077 | FR-E1-1, FR-E1-4, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008 | NFR-9, NFR-11 | RESOLVED |
| BR-019 | UC-M04-01 | FR-024 | FR-E1-2, FR-E1-3 | NFR-008 | NFR-9, NFR-11 | RESOLVED |
| BR-020 | UC-M02-04 | FR-015 | FR-E1-2 | None | PLATFORM_BASELINE | RESOLVED |
| BR-021 | UC-M02-05 | FR-016 | FR-E1-3 | NFR-009 | NFR-11 | RESOLVED |
| BR-022 | UC-M02-06 | FR-017 | FR-E1-3, FR-E1-4 | NFR-009 | NFR-11 | RESOLVED |
| BR-023 | UC-M03-01 | FR-018 | FR-E1-1 | None | PLATFORM_BASELINE | RESOLVED |
| BR-024 | UC-M09-01 | FR-053 | FR-E8-1, FR-E8-2, FR-E8-3, FR-E8-4, FR-E8-5 | NFR-018 | NFR-7 | RESOLVED |
| BR-025 | UC-M08-02 | FR-049 | FR-E7-2 | NFR-021 | NFR-9 | RESOLVED |
| BR-026 | UC-M03-02 | FR-019, FR-021 | FR-E2-1, FR-E2-2 | NFR-010 | NFR-10 | RESOLVED |
| BR-027 | UC-M03-02 | FR-019 | FR-E2-1, FR-E2-2 | NFR-010 | NFR-10 | RESOLVED |
| BR-028 | UC-M03-03 | FR-020 | FR-E2-1 | NFR-010 | NFR-10 | RESOLVED |
| BR-029 | UC-M03-04 | FR-021 | FR-E2-1 | NFR-010 | NFR-10 | RESOLVED |
| BR-030 | UC-M03-05 | FR-022, FR-023 | FR-E2-3, FR-E2-4 | NFR-011 | NFR-12 | RESOLVED |
| BR-031 | UC-M03-02 | FR-019 | FR-E2-1, FR-E2-2 | NFR-010 | NFR-10 | RESOLVED |
| BR-032 | UC-M04-02 | FR-025 | FR-E3-1 | NFR-014 | NFR-3 | RESOLVED |
| BR-033 | UC-M04-03 | FR-026 | FR-E3-2 | NFR-017 | NFR-7 | RESOLVED |
| BR-034 | UC-M04-04 | FR-027 | FR-E3-3 | None | PLATFORM_BASELINE | RESOLVED |
| BR-035 | UC-M04-05 | FR-028, FR-077 | FR-E1-4, FR-E3-1, FR-E4-2, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008, NFR-009 | NFR-9, NFR-11 | RESOLVED |
| BR-036 | UC-M05-01 | FR-031 | FR-E4-1 | NFR-017 | NFR-7 | RESOLVED |
| BR-037 | UC-M05-02 | FR-032 | FR-E3-4, FR-E4-1 | NFR-012, NFR-013 | NFR-1, NFR-2 | RESOLVED |
| BR-038 | UC-M05-03 | FR-033 | FR-E4-3, FR-E4-4 | NFR-023 | NFR-12 | RESOLVED |
| BR-039 | UC-M05-04 | FR-034 | FR-E4-2 | None | PLATFORM_BASELINE | RESOLVED |
| BR-040 | UC-M05-05 | FR-035 | FR-E4-3, FR-E4-4 | NFR-023 | NFR-12 | RESOLVED |
| BR-041 | UC-M06-01 | FR-036 | FR-E5-1 | None | PLATFORM_BASELINE | RESOLVED |
| BR-042 | UC-M06-04 | FR-038, FR-039, FR-077 | FR-E1-4, FR-E5-3, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008 | NFR-9, NFR-11 | RESOLVED |
| BR-043 | UC-M06-05 | FR-038, FR-040 | FR-E5-3, FR-E5-4, FR-E5-5 | NFR-008 | NFR-9, NFR-11 | RESOLVED |
| BR-044 | UC-M06-06 | FR-041, FR-078 | FR-E1-3, FR-E1-4, FR-E5-3, FR-E5-5 | NFR-009, NFR-029 | NFR-7, NFR-11 | RESOLVED |
| BR-045 | UC-M06-07 | FR-042 | FR-E6-1 | None | PLATFORM_BASELINE | RESOLVED |
| BR-046 | UC-M04-06 | FR-029, FR-078 | FR-E1-3, FR-E1-4, FR-E5-3, FR-E5-5 | NFR-009 | NFR-11 | RESOLVED |
| BR-047 | UC-M06-04 | FR-039, FR-077 | FR-E1-4, FR-E5-3, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008, NFR-021 | NFR-9, NFR-11 | RESOLVED |
| BR-048 | UC-M06-02 | FR-037 | FR-E5-2 | None | PLATFORM_BASELINE | RESOLVED |
| BR-049 | UC-M07-02 | FR-044, FR-047 | FR-E6-2, FR-E6-3 | NFR-020 | NFR-8, NFR-9 | RESOLVED |
| BR-050 | UC-M07-03 | FR-043, FR-045 | FR-E6-3, FR-E6-4, FR-E6-5 | NFR-019 | NFR-7, NFR-8 | RESOLVED |
| BR-051 | UC-M07-04 | FR-046 | FR-E6-4 | NFR-020 | NFR-8, NFR-9 | RESOLVED |
| BR-052 | UC-M04-07 | FR-030 | FR-E3-5, FR-E8-4 | None | PLATFORM_BASELINE | RESOLVED |
| BR-053 | UC-M04-07 | FR-030 | FR-E3-5, FR-E8-4 | NFR-008 | NFR-9, NFR-11 | RESOLVED |
| BR-054 | UC-M06-06 | FR-041 | FR-E5-3, FR-E5-5 | NFR-018 | NFR-7 | RESOLVED |
| BR-055 | UC-M09-05 | FR-057 | FR-E7-4, FR-E8-4 | NFR-018 | NFR-7 | RESOLVED |
| BR-056 | UC-M04-07 | FR-030 | FR-E3-5, FR-E8-4 | NFR-017 | NFR-7 | RESOLVED |
| BR-057 | UC-M10-04 | FR-058, FR-061 | FR-E3-1, FR-E8-2 | NFR-012 | NFR-1 | RESOLVED |
| BR-058 | UC-M10-05 | FR-058, FR-062 | FR-E3-1, FR-E8-2 | NFR-013 | NFR-2 | RESOLVED |
| BR-059 | UC-M10-02 | FR-059 | FR-E3-4, FR-E8-2 | NFR-015 | NFR-5 | RESOLVED |
| BR-060 | UC-M10-03 | FR-060 | FR-E3-1, FR-E8-2 | NFR-016 | NFR-2 | RESOLVED |
| BR-061 | UC-M10-01 | FR-058 | FR-E3-1, FR-E8-2 | NFR-013 | NFR-2 | RESOLVED |
| BR-062 | UC-M08-01 | FR-048 | FR-E7-1 | NFR-020 | NFR-8, NFR-9 | RESOLVED |
| BR-063 | UC-M08-02 | FR-049 | FR-E7-2 | NFR-021 | NFR-9 | RESOLVED |
| BR-064 | UC-M08-02 | FR-049 | FR-E7-2 | NFR-019, NFR-021 | NFR-7, NFR-8, NFR-9 | RESOLVED |
| BR-065 | UC-M08-03 | FR-050 | FR-E7-3 | NFR-011 | NFR-12 | RESOLVED |
| BR-066 | UC-M08-04 | FR-051, FR-052 | FR-E7-2 | NFR-022 | NFR-6, NFR-9 | RESOLVED |
| BR-067 | UC-M09-01 | FR-053 | FR-E8-1, FR-E8-2, FR-E8-3, FR-E8-4, FR-E8-5 | NFR-007, NFR-018 | NFR-7 | RESOLVED |
| BR-068 | UC-M09-03 | FR-054, FR-055 | FR-E8-5 | NFR-012, NFR-018 | NFR-1, NFR-7 | RESOLVED |
| BR-069 | UC-M09-04 | FR-056 | FR-E8-2, FR-E8-5 | NFR-017, NFR-019 | NFR-7, NFR-8 | RESOLVED |
| BR-070 | UC-M09-05 | FR-057 | FR-E7-4, FR-E8-4 | NFR-018 | NFR-7 | RESOLVED |
| BR-071 | UC-M04-01 | FR-024 | FR-E1-2, FR-E1-3 | NFR-009 | NFR-11 | RESOLVED |
| BR-072 | UC-M06-03 | FR-038 | FR-E5-3 | None | PLATFORM_BASELINE | RESOLVED |
| BR-073 | UC-M07-04 | FR-046 | FR-E6-4 | NFR-011 | NFR-12 | RESOLVED |
| BR-074 | UC-M01-11 | FR-063 | PLATFORM_BASELINE | NFR-001 | PLATFORM_BASELINE | RESOLVED |
| BR-075 | UC-M01-12 | FR-064 | PLATFORM_BASELINE | NFR-001 | PLATFORM_BASELINE | RESOLVED |
| BR-076 | UC-M01-13 | FR-065 | PLATFORM_BASELINE | NFR-008 | NFR-9, NFR-11 | RESOLVED |
| BR-077 | UC-M04-08 | FR-066, FR-077 | FR-E1-4, FR-E3-1, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008, NFR-009, NFR-014, NFR-022 | NFR-3, NFR-6, NFR-9, NFR-11 | RESOLVED |
| BR-078 | UC-M06-08 | FR-067, FR-077 | FR-E1-4, FR-E5-5, FR-E6-1, FR-E6-2, FR-E7-2 | NFR-008, NFR-018 | NFR-7, NFR-9, NFR-11 | RESOLVED |
| BR-079 | UC-M08-06 | FR-068 | FR-E7-1 | NFR-019, NFR-021 | NFR-7, NFR-8, NFR-9 | RESOLVED |
| BR-080 | UC-M05-04 | FR-069 | FR-E4-2, FR-E5-1 | NFR-019 | NFR-7, NFR-8 | RESOLVED |
| BR-081 | UC-M05-04 | FR-070 | FR-E4-2, FR-E5-1 | NFR-019, NFR-020 | NFR-7, NFR-8, NFR-9 | RESOLVED |
| BR-082 | UC-M07-01 | FR-071, FR-073 | FR-E4-3, FR-E6-3, FR-E6-4, FR-E6-5 | NFR-020 | NFR-8, NFR-9 | RESOLVED |
| BR-083 | UC-M06-01 | FR-072 | FR-E5-1, FR-E5-6 | NFR-018 | NFR-7 | RESOLVED |
| BR-084 | UC-M07-01 | FR-073 | FR-E6-3, FR-E6-4, FR-E6-5 | NFR-019, NFR-020 | NFR-7, NFR-8, NFR-9 | RESOLVED |
| BR-085 | UC-M06-02 | FR-037, FR-070 | FR-E4-2, FR-E5-1, FR-E5-2 | None | PLATFORM_BASELINE | RESOLVED |
| BR-086 | UC-M01-14 | FR-074 | PLATFORM_BASELINE | NFR-027 | PLATFORM_BASELINE | RESOLVED |
| BR-087 | UC-M01-14 | FR-075 | PLATFORM_BASELINE | NFR-027, NFR-031 | PLATFORM_BASELINE | RESOLVED |
| BR-088 | UC-M01-14 | FR-076 | PLATFORM_BASELINE | NFR-028 | NFR-3 | RESOLVED |
| BR-089 | UC-M03-01 | FR-077 | FR-E1-4, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008, NFR-032 | NFR-9, NFR-11 | RESOLVED |
| BR-090 | UC-M02-05 | FR-078 | FR-E1-3, FR-E1-4 | NFR-029 | NFR-7, NFR-11 | RESOLVED |
| BR-091 | UC-M02-05 | FR-078 | FR-E1-3, FR-E1-4 | NFR-008, NFR-029 | NFR-7, NFR-9, NFR-11 | RESOLVED |
| BR-092 | UC-M02-06 | FR-017, FR-078 | FR-E1-3, FR-E1-4 | NFR-029, NFR-030 | NFR-7, NFR-11 | RESOLVED |
| BR-093 | UC-M06-05 | FR-038, FR-039, FR-040, FR-077 | FR-E1-4, FR-E5-3, FR-E5-4, FR-E5-5, FR-E6-2, FR-E7-2 | NFR-008, NFR-021 | NFR-9, NFR-11 | RESOLVED |
| BR-094 | UC-M09-01 | FR-053, FR-074, FR-075, FR-078 | FR-E1-3, FR-E1-4, FR-E8-1, FR-E8-2, FR-E8-3, FR-E8-4, FR-E8-5 | NFR-007, NFR-030, NFR-031 | NFR-7, NFR-11 | RESOLVED |

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Every BR trace reference can be resolved to baseline crosswalk status | PASS | All BR rows resolved |
| Every AC has a trace row | PASS | 16 of 16 ACs mapped |
| Runtime ACs map to FR/BR/NFR | PASS | AC-1..AC-12 map to active FR-E, BR and NFR where a direct NFR exists; AC-7 and AC-8 have no direct NFR in existing source material |
| PRD documentation ACs handled separately | PASS | AC-13..AC-16 are documentation acceptance criteria and are not runtime UC/FR/BR/NFR requirements |
| Contradictory FR namespace eliminated | PASS | `FR-001...` is active; `FR-E*` values are source aliases only. |
| Contradictory NFR namespace eliminated | PASS | `NFR-001...` is active; PRD `NFR-*` values are source aliases only. |
