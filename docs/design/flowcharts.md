# LCSP Flowchart Documentation

## Purpose

Tài liệu này mô tả các flow chính của LCSP ở mức analysis/design. Flowchart dùng Mermaid, không phải implementation plan.

## Overall Assessment Flow

```mermaid
flowchart TD
  A[UC-M03-01 Create Assessment] --> B[UC-M03-02 Fill Web Wizard]
  B --> C[UC-M03-04 Submit WizardProfile]
  C --> D[TECHNICAL_EVIDENCE_REQUIRED]
  D --> E[UC-M02-04 Invite Developer]
  E --> F[UC-M02-05 Assign Developer Policy]
  F --> G[UC-M04-02/03/04/08 Provide Technical Evidence]
  G --> H[UC-M05-01 Schema Gate]
  H -->|Rejected| HR[TECHNICAL_EVIDENCE_REJECTED]
  H -->|Passed| I[UC-M05-02 Privacy Flags Gate]
  I -->|Rejected| HR
  I -->|Passed| J[UC-M05-03 Quality Gate]
  J -->|Insufficient| HI[TECHNICAL_EVIDENCE_INSUFFICIENT]
  J -->|Ready| K[TECHNICAL_EVIDENCE_READY]
  K --> L[UC-M06-01 Detect Conflict]
  L -->|Material/Critical conflict| M[BLOCKED_BY_CONFLICT]
  M --> N[UC-M06-06 Perform Dual Confirmation]
  N --> O[UC-M06-07 Create VerifiedProfile]
  L -->|No unresolved conflict| O
  O --> OP[UC-M06-08 Review and Approve VerifiedProfile]
  OP --> P[READY_FOR_CLASSIFICATION]
  P --> Q[UC-M07-02 Run Risk Classification Agent]
  Q --> R[UC-M08-01 Run Gap Analysis Agent]
  R --> GV[UC-M08-06 View Gap Analysis]
  GV --> S[UC-M08-02 Generate Compliance Report]
  S --> T[UC-M09-01 Write Audit Event]
```

## Login With MFA Flow

```mermaid
flowchart TD
  A[UC-M01-02 Login] --> B[Verify password or identity]
  B -->|Invalid| C[Reject and audit LOGIN_FAILED]
  B -->|Valid| D{MFA enabled?}
  D -->|No| E[Create session]
  D -->|Yes| F[UC-M01-10 Login With MFA]
  F --> G[UC-M01-05 Verify MFA Code]
  G -->|Invalid/expired| H[Reject, count failed attempt, audit MFA_LOGIN_FAILED]
  H --> I{Too many failures?}
  I -->|Yes| J[Rate-limit or temporary lock]
  I -->|No| F
  G -->|Valid| K[Create session and audit MFA_LOGIN_SUCCESS]
```

## Setup MFA Using Authenticator App Flow

```mermaid
flowchart TD
  A[User opens security settings] --> B[UC-M01-04 Setup MFA Using Authenticator App]
  B --> C[System generates MFA secret/QR]
  C --> D[User scans QR or enters manual key in Authenticator App]
  D --> E[User enters OTP]
  E --> F[UC-M01-05 Verify MFA Code]
  F -->|Invalid/expired| G[Show MFA error state]
  F -->|Valid| H[MFA enabled]
  H --> I[Audit MFA_ENABLED]
```

## Manager Wizard Flow

```mermaid
flowchart TD
  A[UC-M03-01 Create Assessment] --> B[UC-M03-02 Fill Web Wizard]
  B --> C{Critical fields complete?}
  C -->|No| D[UC-M03-03 Save Wizard Progress]
  D --> B
  C -->|Yes or explicit unknown| E[UC-M03-04 Submit WizardProfile]
  E --> F[UC-M03-05 View Self-Declared Readiness]
  F --> G[Readiness checklist + preliminary indicators]
  G --> H[No HIGH/MEDIUM/LOW]
  G --> I[Technical evidence required]
```

## Developer Evidence Flow

```mermaid
flowchart TD
  A[UC-M04-01 Accept Developer Task] --> B{Assigned policy}
  B -->|CONNECT_REPOSITORY| C[UC-M04-02 Connect GitHub Repository]
  B -->|RUN_SCAN| RS[UC-M04-08 Run Repository Scan]
  B -->|UPLOAD_EVIDENCE| D[UC-M04-03 Upload Local/CI Scanner Report]
  B -->|UPLOAD_EVIDENCE| E[UC-M04-04 Upload Manual Technical Evidence JSON]
  C --> RS
  RS --> F[Evidence report produced]
  D --> F
  E --> F
  F --> G[UC-M05-01 Validate Evidence Schema]
```

## Evidence Gate Flow

```mermaid
flowchart TD
  A[Evidence received] --> B[UC-M05-01 Validate Evidence Schema]
  B -->|Missing required field| C[TECHNICAL_EVIDENCE_REJECTED]
  B -->|Passed| D[UC-M05-02 Validate Privacy Flags]
  D -->|Raw source/secret violation| C
  D -->|Passed| E[UC-M05-03 Evaluate Evidence Quality]
  E -->|Below threshold| F[TECHNICAL_EVIDENCE_INSUFFICIENT]
  E -->|Ready| G[TECHNICAL_EVIDENCE_READY]
  G --> H[UC-M05-04 Generate TechnicalProfile]
```

## Reconciliation Flow

```mermaid
flowchart TD
  A[WizardProfile + TechnicalProfile] --> B[UC-M06-01 Detect Conflict]
  B -->|No conflict| C[UC-M06-07 Create VerifiedProfile]
  B -->|Conflict| D[UC-M06-02 Calculate Conflict Score]
  D --> E[UC-M06-03 Route Conflict]
  E -->|Technical truth| F[UC-M06-04 Resolve Technical Conflict]
  E -->|Business/legal meaning| G[UC-M06-05 Resolve Business/Legal Conflict]
  E -->|Material/Critical| H[UC-M06-06 Perform Dual Confirmation]
  F --> I{Resolved?}
  G --> I
  H --> I
  I -->|No| J[BLOCKED_BY_CONFLICT]
  I -->|Yes| C
  C --> K[UC-M06-08 Review and Approve VerifiedProfile]
  K --> L[READY_FOR_CLASSIFICATION]
```

## Risk Classification Flow

```mermaid
flowchart TD
  A{Approved VerifiedProfile exists?} -->|No| B[Classification locked]
  A -->|Yes| C[UC-M07-01 Retrieve Legal Rules/Citations]
  C --> D{Critical citation available?}
  D -->|No| E[UC-M07-04 Block or Degrade Classification if Citation Missing]
  D -->|Yes| F[UC-M07-02 Run Risk Classification Agent]
  F --> G[UC-M07-03 Trace Classification to Legal Rule]
  G --> H[UC-M07-05 View Classification Result]
```

## Report Generation Flow

```mermaid
flowchart TD
  A[Manager requests output] --> B{Technical evidence + VerifiedProfile + classification available?}
  B -->|No evidence| C[UC-M08-03 Generate Readiness-Only Export]
  C --> D[No risk level]
  B -->|Yes| E{Unresolved material/critical conflict?}
  E -->|Yes| F[Final report blocked]
  E -->|No| G{Legal citation trace complete?}
  G -->|No| H[Classification/report blocked or degraded]
  G -->|Yes| GA[UC-M08-06 View Gap Analysis]
  GA --> I[UC-M08-02 Generate Compliance Report]
```

## Human Attestation Flow

```mermaid
flowchart TD
  A[UC-M04-07 Provide Structured Technical Attestation] --> B{Schema complete?}
  B -->|No| C[Reject attestation]
  B -->|Yes| D{Forbidden metadata replacement?}
  D -->|Yes| C
  D -->|No| E{Critical claim?}
  E -->|No| F[Record attestation]
  E -->|Yes| G[UC-M06-06 Perform Dual Confirmation]
  G --> F
  F --> H[UC-M09-05 Track Human Attestation Usage]
```

## Blocked State Flow

```mermaid
flowchart TD
  A[Workflow action requested] --> B{Block reason}
  B -->|No technical evidence| C[Show technical evidence required]
  B -->|Evidence rejected| D[Show schema/privacy reason]
  B -->|Evidence insufficient| E[Show quality reason and next action]
  B -->|Material conflict| F[Show dual confirmation required]
  B -->|Missing citation| G[Show legal rule/citation required]
  B -->|Final report conflict| H[Show final report blocked]
```

## Validation Dependencies

| Assumption | Affected Flowcharts |
| --- | --- |
| A1 | Manager Wizard Flow, Evidence Gate Flow, Reconciliation Flow, Blocked State Flow |
| A2 | Risk Classification Flow, Report Generation Flow |
| A3 | Reconciliation Flow, Human Attestation Flow, Report Generation Flow |
