# Consent, Privacy and Data Handling Plan

## Purpose

Define privacy and evidence-handling controls for A1, A2, A2-b and A3 validation preparation and execution.

## Scope

This plan applies to validation participants, reviewers, fixture materials, observation notes, evidence records and result artifacts.

## Consent Requirements

| Requirement | Rule |
| --- | --- |
| Informed consent | Participant/reviewer must understand purpose, materials, evidence captured and retention/deletion status. |
| Voluntary participation | Participant may decline or stop participation. |
| Recording consent | Audio/video/screen recording requires explicit separate consent. |
| Data minimization | Capture only information needed for validation decision. |
| Pseudonymization | Use participant/reviewer references rather than names in validation records. |

## Data Handling Rules

| Data Type | Allowed? | Handling |
| --- | --- | --- |
| Synthetic fixtures | Yes | Default validation material |
| Real customer repository | No | Prohibited in Phase 4 validation prep/execution unless future policy explicitly changes |
| Production credentials | No | Prohibited |
| Secrets/tokens/keys | No | Must not appear in validation records |
| Personal data | Avoid | If unavoidable, document consent, minimize, pseudonymize and restrict access |
| Raw source code | No | Prohibited |
| Raw/full prompt | No | Prohibited |
| Full AST body | No | Prohibited |
| Legal corpus references | Yes | Use approved/public corpus references and version IDs |

## Evidence Storage

| Control | Requirement |
| --- | --- |
| Access control | Limit validation evidence to assigned Product/QA/Architecture/Legal/Security reviewers |
| Location | Decision required before validation execution |
| Retention | Decision required before validation execution |
| Deletion | Decision required before validation execution |
| Export | Export must preserve pseudonymization and redaction |

## Phase 4.1.1 Required Storage Decision

One concrete storage location must be selected and approved before any validation evidence is collected. The following model is a proposed minimum, not an approval.

| Required Field | Proposed Minimum | Status |
| --- | --- | --- |
| storage provider | GitHub private repository | APPROVED_FOR_EXECUTION by owner attestation |
| workspace/folder/repository reference | `https://github.com/khovan123/LCSP` | APPROVED_FOR_EXECUTION by owner attestation |
| custodian | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION by owner attestation |
| access roles or individuals | Admin/write user: khovan123; read-only user: nhilb87 | APPROVED_FOR_EXECUTION by owner attestation |
| retention owner | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION by owner attestation |
| deletion confirmation method | Deletion register + screenshot/link | APPROVED_FOR_EXECUTION by owner attestation |
| encryption at rest | Use selected GitHub private repository controls; independent ACL audit not required for internal validation | APPROVED_FOR_EXECUTION by owner attestation |

## Phase 4.1.2 Evidence Storage Owner Attestation

Phase 4.1.2 records the Project Lead's owner attestation for internal validation evidence storage. This is not an independently verified GitHub access-control audit.

| Control | Approved Value |
| --- | --- |
| Status | APPROVED_FOR_EXECUTION |
| Approval method | OWNER_ATTESTATION |
| Access-control assurance model | OWNER_ATTESTED_PRIVATE_REPOSITORY_ACCESS |
| Independent ACL audit | NOT_REQUIRED_FOR_INTERNAL_VALIDATION |
| Approval evidence reference | DEC-VAL-2026-001 |
| Storage provider | GitHub private repository |
| Workspace | `https://github.com/khovan123/LCSP` |
| Evidence Storage Custodian | Phan Nguyễn Quốc Minh |
| Admin / Write user | khovan123 |
| Read-only user | nhilb87 |
| Public sharing | Disabled |
| Raw notes / recordings retention | 30 days |
| Redacted evidence retention | 12 months |
| Decision-log retention | 12 months |
| Deletion confirmation | Deletion register + screenshot/link |

Mandatory attestation:

```text
The Project Lead attests that the repository is private, public sharing is disabled,
and the listed access-control configuration is accurate for internal validation evidence storage.

This is an owner attestation for internal validation.
It is not an independently verified GitHub access-control audit.
```

Mandatory restrictions remain:

- No real customer repository.
- No production credential.
- No secret.
- No full prompt.
- No unnecessary personal data.

## Privacy Classification

| Classification | Meaning | Examples |
| --- | --- | --- |
| PUBLIC_APPROVED | Public/approved reference | Legal citation URL/reference |
| SYNTHETIC_LOW | Synthetic non-sensitive material | Fixture label, expected output |
| INTERNAL_RESTRICTED | Internal validation note | Reviewer disagreement note |
| PARTICIPANT_PSEUDONYMIZED | Participant data without direct identifier | P001 response row |
| PROHIBITED | Must not be collected | Raw source, secrets, full prompt, production personal data |

## Retention and Deletion

| Item | Status |
| --- | --- |
| Validation evidence retention schedule | APPROVED_FOR_EXECUTION by owner attestation |
| Consent record retention schedule | APPROVED_FOR_EXECUTION by owner attestation |
| Deletion owner and process | APPROVED_FOR_EXECUTION by owner attestation |

### Phase 4.1.1 Proposed Retention Policy

| Artifact Type | Proposed Retention | Status |
| --- | --- | --- |
| Raw session notes/recordings | Delete within 30 days after final validation decision | APPROVED_FOR_EXECUTION by owner attestation |
| Redacted validation evidence | Retain 12 months | APPROVED_FOR_EXECUTION by owner attestation |
| Decision logs, aggregate findings and document-update evidence | Retain 12 months | APPROVED_FOR_EXECUTION by owner attestation |
| Access review | Before each validation stream and at closure | APPROVED_FOR_EXECUTION by owner attestation |

## Incident Handling

If prohibited material is discovered in validation records:

1. Stop evidence collection for the affected run.
2. Quarantine the artifact.
3. Notify Product, Security and QA owner.
4. Remove/redact prohibited content according to approved process.
5. Mark run as inconclusive if evidence integrity is compromised.
