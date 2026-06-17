# LCSP Flowchart Documentation

## Purpose

Tài liệu này mô tả các flow chính của LCSP ở mức analysis/design. Flowchart dùng Mermaid, không phải implementation plan.

## Overall Assessment Flow

```mermaid
flowchart TD
  A[UC-M03-01 Create Assessment] --> B[UC-M03-02 Fill Web Wizard]
  B --> C[UC-M03-04 Submit WizardProfile]
  C --> D[TECHNICAL_EVIDENCE_REQUIRED]
  D --> G[UC-M04-02 Connect GitHub Repository]
  G -->|Repository not connected| GR[Classification locked: repository connection required]
  G --> H[UC-M04-08 Run Repository Scan]
  H -->|Delegated Developer lacks RUN_REPOSITORY_SCAN policy| HP[Scan blocked]
  H -->|Scan failed| HF[REPOSITORY_SCAN_FAILED]
  H --> I[Scanner creates TechnicalEvidenceReport]
  I --> J[UC-M05-01 Schema Gate]
  J -->|Rejected| HR[TECHNICAL_EVIDENCE_REJECTED]
  J -->|Passed| K[UC-M05-02 Privacy Flags Gate]
  K -->|Rejected| HR
  K -->|Passed| L[UC-M05-03 Quality Gate]
  L -->|Insufficient| HI[TECHNICAL_EVIDENCE_INSUFFICIENT]
  L -->|Ready| TP[UC-M05-04 Generate TechnicalProfile]
  TP --> AUF[AI Usage Flow Analysis]
  AUF -->|Unclear usage purpose| AUC[Create Manager resolution task]
  AUF -->|Ready| TR[AI_USAGE_FLOW_ANALYSIS_READY]
  AUC --> M
  TR --> RC[UC-M06-01 Detect Conflict]
  RC --> CDEC{Có mâu thuẫn không?}
  CDEC -->|Có| M[Manager resolves conflict]
  M --> N[Resolve Conflict]
  N --> RDEC{Conflict Resolved?}
  RDEC -->|No| LCK[Classification locked]
  RDEC -->|Yes| O[UC-M06-07 Create VerifiedProfile]
  CDEC -->|Không| O
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

## Manager Repository Scan Flow

```mermaid
flowchart TD
  A[Manager owns assessment] --> C[UC-M04-02 Connect GitHub Repository]
  C -->|Repository not connected| CN[Prompt repository connection]
  C -->|Connected| RS[UC-M04-08 Run Repository Scan]
  RS -->|Delegated Developer lacks RUN_REPOSITORY_SCAN policy| RP[Scan blocked]
  RS -->|Scan failed| RF[REPOSITORY_SCAN_FAILED]
  RS -->|Scan completed| F[Scanner creates TechnicalEvidenceReport]
  F --> G[UC-M05-01 Validate Evidence Schema]
```

Developer may use the same scan flow only when Manager delegates repository/scan permission. MVP completion does not require Developer invitation.

## Static Analysis Scanner Subsystem Flow

```mermaid
flowchart TD
  A[Manager requests Repository Scan] --> B[NestJS API creates RepositoryScanJob]
  B --> C[Queue delivers job to Python Worker]
  C --> D[Create temporary isolated workspace]
  D --> E[Shallow clone pinned commit SHA]
  E --> F[Repository inventory]
  F --> G[Manifest and config analysis]
  G --> H[Tree-sitter generic parse]
  H --> I[TypeScript Semantic Analyzer Sidecar]
  H --> J[Python Semantic Analyzer]
  H --> K[Basic signal detection for other languages]
  I --> L[AI Invocation Detector]
  J --> L
  K --> L
  L --> M[Input Flow Analyzer]
  M --> N[Output and Decision Flow Analyzer]
  N --> O[Human Review Detector]
  O --> P[Domain Context Fusion]
  P --> Q[NetworkX Evidence Graph scan-local]
  Q --> R[TechnicalFinding records]
  R --> S[TechnicalEvidenceReport]
  S --> T[Redaction and metadata persistence]
  T --> U[Workspace cleanup: raw source deleted]
  U --> V[Schema Gate]
  V --> W[Quality Gate]
  W --> X[TechnicalProfile]
  X --> Y[AI Usage Flow Analysis]
  Y --> Z[Reconciliation]
```

Static-analysis safety: scanner reads/parses source only. It must not execute customer code, run installs/builds/tests/Docker/CI/scripts, probe APIs, persist raw source/full AST/full prompts/secrets, or send raw source/full prompts/secrets to LLM.

## Evidence Gate Flow

```mermaid
flowchart TD
  A[TechnicalEvidenceReport from Repository Scan] --> B[UC-M05-01 Validate Evidence Schema]
  B -->|Missing required field| C[TECHNICAL_EVIDENCE_REJECTED]
  B -->|Passed| D[UC-M05-02 Validate Privacy Flags]
  D -->|Raw source/secret violation| C
  D -->|Passed| E[UC-M05-03 Evaluate Evidence Quality]
  E -->|Below threshold| F[TECHNICAL_EVIDENCE_INSUFFICIENT]
  E -->|Ready| G[TECHNICAL_EVIDENCE_READY]
  G --> H[UC-M05-04 Generate TechnicalProfile]
  H --> I[AI Usage Flow Analysis]
  I --> J[AI_USAGE_FLOW_ANALYSIS_READY or uncertainty conflict]
```

## Deferred / Future Evidence Flow

```mermaid
flowchart TD
  A[Future/Enterprise Evidence Path] --> B[Upload Local/CI Scanner Report]
  A --> C[Upload Manual Technical Evidence JSON]
  A --> D[CLI/CI Evidence Submission]
  B --> E[Not part of MVP main workflow]
  C --> E
  D --> E
```

## Reconciliation Flow

```mermaid
flowchart TD
  A[WizardProfile + TechnicalProfile + AIUsageFlow] --> B[Reconciliation Agent]
  B --> C{Có mâu thuẫn không?}
  C -->|Không| D[UC-M06-07 Create VerifiedProfile]
  C -->|Có| E[Pause Workflow + Create Conflict Resolution Tasks]
  E --> F{Conflict Resolved?}
  F -->|No| G[Keep Classification Locked]
  F -->|Yes| D
  D --> H[UC-M06-08 Review and Approve VerifiedProfile]
  H --> I[READY_FOR_CLASSIFICATION]
```

## Risk Classification Flow

```mermaid
flowchart TD
  A{Approved VerifiedProfile + AIUsageFlow exists?} -->|No| B[Classification locked]
  A -->|Yes| C[UC-M07-01 Retrieve Legal Rules/Citations using usage-flow context]
  C --> D{Critical citation available?}
  D -->|No| E[UC-M07-04 Block or Degrade Classification if Citation Missing]
  D -->|Yes| F[UC-M07-02 Run Risk Classification Agent]
  F --> G[UC-M07-03 Trace Classification to Legal Rule]
  G --> H[UC-M07-05 View Classification Result]
```

## AI Usage Flow Analysis Flow

```mermaid
flowchart TD
  A[Run Repository Scan] --> B[TechnicalEvidenceReport]
  B --> C[Schema Gate]
  C -->|Pass| D[Quality Gate]
  D -->|Ready| E[Build TechnicalProfile]
  E --> F[AI Usage Flow Analysis]
  F --> F1[Identify AI purpose, inputs, outputs, downstream action, affected subjects, human review, harm potential]
  F1 --> G{Usage purpose clear?}
  G -->|No| H[Mark uncertainty + create confirmation/conflict]
  G -->|Yes| I[AIUsageFlow with evidence refs]
  H --> J[Reconciliation]
  I --> J
  J --> K{Có mâu thuẫn không?}
  K -->|Có| L[Pause Workflow + Resolve Conflict]
  K -->|Không| M[Build VerifiedProfile]
  M --> N[Legal Rule Matching / RAG]
  N --> O[Risk Classification]
  O --> P[Gap Analysis]
  P --> Q[Document Generation]
```

## Report Generation Flow

```mermaid
flowchart TD
  A[Manager requests output] --> B{Technical evidence + VerifiedProfile + classification available?}
  B -->|No evidence| C[UC-M08-03 Generate Readiness-Only Export]
  C --> D[No risk level]
  B -->|Yes| E{Unresolved conflict?}
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
  E -->|Yes| G[Manager final review]
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
  B -->|Unresolved conflict| F[Show conflict resolution required]
  B -->|Missing citation| G[Show legal rule/citation required]
  B -->|Final report conflict| H[Show final report blocked]
```

## Validation Dependencies

| Assumption | Affected Flowcharts |
| --- | --- |
| A1 | Manager Wizard Flow, Evidence Gate Flow, Reconciliation Flow, Blocked State Flow |
| A2 | AI Usage Flow Analysis Flow, Risk Classification Flow, Report Generation Flow |
| A3 | Reconciliation Flow, Human Attestation Flow, Report Generation Flow |
