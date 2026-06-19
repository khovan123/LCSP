# A3 Governance Scenario Register

## Scope

This register tracks A3 human attestation abuse and governance validation scenarios. It does not record pass/fail until real evidence and reviewer confirmation are supplied.

## Register

| Record ID | Validation Stream | Date | Responsible Person | Evidence Reference | Status | Data Classification | Retention / Deletion Date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A3-S-01 | A3 | 2026-06-20 | Phan Nguyễn Quốc Minh / Nguyễn Anh Tú | PENDING_REAL_EVIDENCE | NOT_STARTED | INTERNAL_RESTRICTED | Set after evidence capture | Manager minimizes AI impact despite scanner evidence. |
| A3-S-02 | A3 | 2026-06-20 | Phan Nguyễn Quốc Minh / Nguyễn Anh Tú | PENDING_REAL_EVIDENCE | NOT_STARTED | INTERNAL_RESTRICTED | Set after evidence capture | Manager claims human review without process evidence. |
| A3-S-03 | A3 | 2026-06-20 | Phan Nguyễn Quốc Minh / Nguyễn Anh Tú | PENDING_REAL_EVIDENCE | NOT_STARTED | INTERNAL_RESTRICTED | Set after evidence capture | Manager attempts to erase or replace scanner evidence. |
| A3-S-04 | A3 | 2026-06-20 | Phan Nguyễn Quốc Minh / Nguyễn Anh Tú | PENDING_REAL_EVIDENCE | NOT_STARTED | INTERNAL_RESTRICTED | Set after evidence capture | Manager requests classification with unresolved conflict. |
| A3-S-05 | A3 | 2026-06-20 | Phan Nguyễn Quốc Minh / Nguyễn Anh Tú | PENDING_REAL_EVIDENCE | NOT_STARTED | INTERNAL_RESTRICTED | Set after evidence capture | Manager changes business declaration after TechnicalProfile creation. |
| A3-S-06 | A3 | 2026-06-20 | Phan Nguyễn Quốc Minh / Nguyễn Anh Tú | PENDING_REAL_EVIDENCE | NOT_STARTED | INTERNAL_RESTRICTED | Set after evidence capture | Manager requests final document with missing legal citation. |

## Outcome Fields To Capture After Real Evidence Exists

| Field | Required |
| --- | --- |
| Scenario ID | Required |
| Precondition | Required from actual scenario evidence |
| Actor action | Required from actual scenario evidence |
| Expected fail-closed behavior | Required |
| Actual observed behavior | Required from actual scenario evidence |
| Scanner-evidence preservation result | Required from actual scenario evidence |
| Classification blocking result | Required from actual scenario evidence |
| Citation blocking/degradation result | Required from actual scenario evidence |
| Audit-event result | Required from actual scenario evidence |
| Pass/fail/not-executed | Required only after actual evidence exists |
| Evidence reference | Required |
| Reviewer confirmation | Required |
