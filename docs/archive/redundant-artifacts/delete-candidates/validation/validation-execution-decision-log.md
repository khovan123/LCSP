# Validation Execution Decision Log

## Purpose

This log records Phase 4.1.1 decision resolution and Phase 4.1.2 approval normalization for validation execution. It resolves decision shape, selected defaults, required owners and approval evidence requirements without collecting validation evidence.

Only rows with `Status = APPROVED_FOR_EXECUTION` may remove an execution blocker. Phase 4.1.2 records the Project Lead's latest owner confirmation for D-01, D-02, D-04, D-05 and D-06. Phase 4.3.1 completes D-07 fixture release governance for A2-b1 readiness recheck. D-03 formal legal reliability validation remains blocked where explicit legal reviewer qualification and corpus integrity evidence are still missing.

Approval normalization source:

| Field | Value |
| --- | --- |
| Owner confirmation | I APPROVE D-01, D-02, D-03, D-04, D-05, D-06, D-07 |
| Project Lead / Owner | Phan Nguyễn Quốc Minh |
| Approval record | DEC-VAL-2026-001 |
| Approval date | 2026-06-19 |
| Approval method | OWNER_ATTESTATION |

## Status Values

```text
PROPOSED_DEFAULT
PENDING_OWNER_CONFIRMATION
APPROVED_FOR_EXECUTION
BLOCKED
```

## Decision Register

| Decision ID | Validation | Decision | Selected Value | Owner | Evidence of Approval | Status | Required Before |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D-01 | All | Validation ownership and named reviewer roster | A1 owner/moderator, A2-b1 reviewers/adjudicator, A3 reviewers and evidence custodian normalized from owner confirmation; A2 formal legal reviewers are not qualified/evidenced for formal legal reliability validation | Product Manager / Project Lead | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | Phase 4.2 readiness recheck |
| D-01-A1 | A1 | A1 RACI | Validation Owner: Phan Nguyễn Quốc Minh; Moderator: Phan Nguyễn Quốc Minh; observer/note-taker optional and not an execution blocker | Project Lead | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A1 execution readiness recheck |
| D-01-A2 | A2 | A2 RACI | Validation Owner: Phan Nguyễn Quốc Minh; scope limited to `INTERNAL_LEGAL_RULE_REVIEW_ONLY`; formal legal reliability reviewer qualifications are not evidenced | Project Lead / Legal Owner | `DEC-VAL-2026-001`; limitation recorded | PENDING_OWNER_CONFIRMATION | Formal A2 legal reliability execution |
| D-01-A2B | A2-b | A2-b1 RACI | Technical Reviewer 1: Phan Nguyễn Quốc Minh; Technical Reviewer 2: Nguyễn Anh Tú; Legal-eligibility Reviewer: Lê Bảo Nhi; Adjudicator: Nguyễn Tuấn Anh | Project Lead / Architecture / QA | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A2-b1 readiness recheck after D-07 fixture release completion |
| D-01-A3 | A3 | A3 RACI | Governance Reviewer: Phan Nguyễn Quốc Minh; Security / Assurance Reviewer: Nguyễn Anh Tú | Project Lead / Security Reviewer | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A3 execution readiness recheck |
| D-01-STORAGE | All | Evidence Storage Custodian | Evidence Storage Custodian: Phan Nguyễn Quốc Minh; admin/write user: khovan123; read-only user: nhilb87 | Project Lead / Evidence Storage Custodian | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | Any validation evidence collection readiness recheck |
| D-02 | A1 | A1 session design | Option A = Yes; Option B = No; 1 pilot session; 6 valid Manager-like participant sessions; 45 minutes maximum; synthetic prototype/demo data only | Project Lead | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A1 readiness recheck |
| D-02-TASKS | A1 | A1 critical tasks | Create assessment; complete WizardProfile; understand Repository Scan requirement; interpret blocked state; understand Manager can proceed without Developer assignment; understand classification requires verified evidence | Project Lead | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A1 readiness recheck |
| D-02-THRESHOLDS | A1 | A1 acceptance thresholds | At least 5/6 complete all critical tasks; at least 5/6 explain evidence block; at least 5/6 distinguish Manager/Developer; median <=25 minutes; no unresolved P0; max one P1 per critical task; P0/P1/P2 severity rubric approved | Project Lead | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A1 readiness recheck |
| D-03 | A2 | Legal corpus versioning model | `LCSP-LEGAL-CORPUS-v0.1.0`; owner-provided corpus date metadata recorded; scope limited to `INTERNAL_LEGAL_RULE_REVIEW_ONLY` | Project Lead / Legal Reviewer | `DEC-VAL-2026-001`; formal reviewer qualification not evidenced | PENDING_OWNER_CONFIRMATION | Formal A2 legal reliability execution |
| D-03-SOURCES | A2 | Corpus source readiness | Owner-provided metadata recorded for 134/2025/QH15, 71/2025/QH15, 57-NQ/TW and 127/QD-TTg; official source files, content hashes and source/integrity registers still not complete | Legal Reviewer | `DEC-VAL-2026-001`; source files/hashes not generated | PENDING_OWNER_CONFIRMATION | A2 execution using formal corpus integrity |
| D-03-REVIEW | A2 | A2 reviewer protocol | Formal legal reliability validation is `NOT_APPROVED` because listed reviewers have no confirmed legal qualification beyond Lead or Member | Project Lead / Legal Reviewer | `DEC-VAL-2026-001`; qualification limitation recorded | PENDING_OWNER_CONFIRMATION | Formal A2 legal reliability execution |
| D-03-RULES | A2 | A2 decision rules | No fabricated citation; all final legal citations trace to pinned corpus; material citation mismatch fails; at least 90% of sampled rule mappings correct by final adjudication; original disagreements retained | Legal Reviewer / Product Manager | PENDING_OWNER_CONFIRMATION | PENDING_OWNER_CONFIRMATION | A2 execution |
| D-04 | A2-b | A2-b scope split | A2-b1 = Pre-Implementation Mapping Design Validation; A2-b2 = Post-Implementation Empirical Scanner Acceptance Validation | Project Lead / Architecture / QA | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A2-b1 readiness recheck after D-07 fixture release completion |
| D-04-A2B1 | A2-b | A2-b1 scope | Design validation only; excludes runtime scanner accuracy, parser correctness, AST extraction, cross-module flow, empirical FP/FN, performance and resource consumption | Project Lead / Architecture / QA | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A2-b1 readiness recheck after D-07 fixture release completion |
| D-04-A2B2 | A2-b | A2-b2 scope | `POST_IMPLEMENTATION_ACCEPTANCE_GATE`; not permitted until a real scanner prototype exists | Project Lead / Architecture / QA | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | Post-implementation empirical scanner acceptance planning |
| D-04-THRESHOLDS | A2-b | A2-b1 acceptance thresholds | 100% evidence_refs; 0 false high-impact labels for low-impact fixtures; 100% high-impact expected-or-blocked; 100% dynamic/unsupported abstention; disagreements recorded/adjudicated | Architecture / QA / Project Lead | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A2-b1 readiness recheck after D-07 fixture release completion |
| D-05 | A3 | A3 review model | Governance Reviewer: Phan Nguyễn Quốc Minh; Security / Assurance Reviewer: Nguyễn Anh Tú | Project Lead / Security Reviewer | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A3 readiness recheck |
| D-05-SCENARIOS | A3 | A3 abuse scenarios | Manager minimizes AI impact; claims human review without evidence; attempts to erase/replace technical evidence; requests classification with unresolved conflict; changes declaration after TechnicalProfile; requests final output with missing citation | Project Lead / Governance Reviewer | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A3 readiness recheck |
| D-05-THRESHOLDS | A3 | A3 acceptance thresholds | 100% critical abuse scenarios fail closed; 100% preserve original scanner evidence; 100% block classification when conflict unresolved; 100% block/degrade final output when citation missing; 100% state-changing governance actions produce audit records; 0 silent scanner-evidence overwrite allowed | Project Lead / Security Reviewer | `DEC-VAL-2026-001`; owner attestation | APPROVED_FOR_EXECUTION | A3 readiness recheck |
| D-06 | All | Validation evidence storage and privacy | GitHub private repository at `https://github.com/khovan123/LCSP`; owner-attested private repository access; public sharing disabled; no real customer repository, production credentials, secrets, full prompts or unnecessary personal data | Project Lead / Evidence Storage Custodian | `DEC-VAL-2026-001`; OWNER_ATTESTATION | APPROVED_FOR_EXECUTION | Any validation evidence collection readiness recheck |
| D-06-LOCATION | All | Storage provider and workspace reference | Storage provider: GitHub private repository; workspace: `https://github.com/khovan123/LCSP`; admin/write user: khovan123; read-only user: nhilb87 | Project Lead / Evidence Storage Custodian | `DEC-VAL-2026-001`; OWNER_ATTESTATION | APPROVED_FOR_EXECUTION | Any validation evidence collection readiness recheck |
| D-06-RETENTION | All | Retention policy | Raw notes/recordings: 30 days; redacted evidence: 12 months; decision-log retention: 12 months; deletion confirmation: deletion register + screenshot/link; independent ACL audit: NOT_REQUIRED_FOR_INTERNAL_VALIDATION | Project Lead / Evidence Storage Custodian | `DEC-VAL-2026-001`; OWNER_ATTESTATION | APPROVED_FOR_EXECUTION | Any validation evidence collection readiness recheck |
| D-07 | A2-b | Fixture release governance | Fixture owner: Phan Nguyễn Quốc Minh; fixture approver: Nguyễn Anh Tú; legal-eligibility reviewer: Lê Bảo Nhi; adjudicator: Nguyễn Tuấn Anh; release process DRAFT -> REVIEW_READY -> APPROVED_FOR_VALIDATION -> RETIRED; approval method `OWNER_ATTESTED_INTERNAL_FIXTURE_APPROVAL` | QA / Architecture | `DEC-VAL-2026-001`; Phase 4.3.1 fixture release completion report | APPROVED_FOR_EXECUTION | A2-b1 readiness recheck only |
| D-07-HASH | A2-b | Fixture hash rule | SHA-256 generated from 10 finalized fixture specification cards under `docs/validation/fixtures/specs/`; all cards recorded as `APPROVED_FOR_VALIDATION` in the fixture release register | QA / Architecture | `sha256sum docs/validation/fixtures/specs/*.md`; Phase 4.3.1 fixture release completion report | APPROVED_FOR_EXECUTION | A2-b1 readiness recheck only |
