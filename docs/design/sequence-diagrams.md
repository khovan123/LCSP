# LCSP Sequence Diagrams

## Purpose

Tài liệu này mô tả sequence diagram cho các flow chính của LCSP. Tên use case và ID khớp với `docs/design/use-case-specification.md`.

Detailed multi-agent sequences for Evidence to VerifiedProfile, Human-in-the-loop Conflict Resolution, Risk Classification with Legal RAG and Document Generation are maintained in `docs/architecture/multi-agent-system-architecture.md`.

## Sequence Diagram List

| Sequence | Related Use Cases | Related Business Rules |
| --- | --- | --- |
| Register and Login | UC-M01-01, UC-M01-02 | BR-001, BR-003 |
| Setup MFA Using Authenticator App | UC-M01-04, UC-M01-05 | BR-006, BR-007, BR-011 |
| Login With MFA | UC-M01-02, UC-M01-10, UC-M01-05 | BR-008, BR-009 |
| Disable / Reset MFA | UC-M01-06, UC-M01-07 | BR-010, BR-012, BR-013 |
| Manager Creates Assessment | UC-M03-01 | BR-018, BR-023 |
| Manager Invites Developer | UC-M02-04, UC-M02-05 | BR-020, BR-021 |
| Developer Provides GitHub Evidence | UC-M04-02, UC-M04-08 | BR-032, BR-057, BR-058, BR-077 |
| Developer Uploads Local/CI Evidence | UC-M04-03 | BR-033 |
| Evidence Gate Processing | UC-M05-01, UC-M05-02, UC-M05-03, UC-M05-05 | BR-036, BR-037, BR-038, BR-040 |
| Reconciliation with Conflict | UC-M06-01..UC-M06-06 | BR-041..BR-048 |
| Human Attestation | UC-M04-07, UC-M09-05 | BR-052..BR-056, BR-070 |
| VerifiedProfile Creation and Approval | UC-M06-07, UC-M06-08 | BR-045, BR-078 |
| Risk Classification with Legal Citation | UC-M07-01..UC-M07-04 | BR-049..BR-051 |
| Document Generation | UC-M08-01..UC-M08-06 | BR-062..BR-066, BR-079 |
| Audit Event Recording | UC-M09-01 | BR-067 |

## Register and Login

Participants: User, Web Frontend, API Backend, Auth Module, Audit Module.

Preconditions: User has valid signup/invite path or existing account.

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Web Frontend
  participant API as API Backend
  participant Auth as Auth Module
  participant Audit as Audit Module
  U->>FE: Register or login
  FE->>API: Submit credentials/identity
  API->>Auth: Validate identity and password
  alt invalid
    Auth-->>API: Reject
    API->>Audit: Write LOGIN_FAILED
    API-->>FE: Error
  else valid without MFA
    Auth-->>API: Authenticated
    API->>Audit: Write LOGIN_SUCCESS
    API-->>FE: Session created
  else valid with MFA enabled
    Auth-->>API: MFA required
    API-->>FE: Prompt Authenticator App code
  end
```

Alternative / failure path: invalid credentials are rate-limited. Audit event generated: `LOGIN_SUCCESS`, `LOGIN_FAILED`. Related use cases: UC-M01-01 Register Account, UC-M01-02 Login.

## Setup MFA Using Authenticator App

Participants: User, Web Frontend, API Backend, Auth Module, Audit Module.

Preconditions: User is authenticated.

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Web Frontend
  participant API as API Backend
  participant Auth as Auth Module
  participant Audit as Audit Module
  U->>FE: Open security settings
  FE->>API: Start MFA setup
  API->>Auth: Generate TOTP secret/QR reference
  Auth-->>API: Setup secret reference + QR/manual key
  API->>Audit: Write MFA_SETUP_STARTED
  API-->>FE: Show QR/manual key
  U->>FE: Enter Authenticator App OTP
  FE->>API: Verify MFA setup OTP
  API->>Auth: Verify OTP
  alt OTP valid
    Auth-->>API: MFA enabled
    API->>Audit: Write MFA_ENABLED
    API-->>FE: MFA enabled
  else OTP invalid/expired
    Auth-->>API: Reject
    API->>Audit: Write MFA_LOGIN_FAILED
    API-->>FE: Show MFA error
  end
```

Alternative / failure path: setup remains pending if OTP fails. Audit event generated: `MFA_SETUP_STARTED`, `MFA_ENABLED`, `MFA_LOGIN_FAILED`. Related use cases: UC-M01-04 Setup MFA Using Authenticator App, UC-M01-05 Verify MFA Code.

## Login With MFA

Participants: User, Web Frontend, API Backend, Auth Module, Audit Module.

Preconditions: User account has MFA enabled.

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Web Frontend
  participant API as API Backend
  participant Auth as Auth Module
  participant Audit as Audit Module
  U->>FE: Login with password
  FE->>API: Submit password
  API->>Auth: Verify password
  Auth-->>API: Password valid, MFA required
  API-->>FE: Ask Authenticator App code
  U->>FE: Enter OTP
  FE->>API: Submit OTP
  API->>Auth: Verify OTP
  alt OTP valid
    Auth-->>API: Create session
    API->>Audit: Write MFA_LOGIN_SUCCESS
    API-->>FE: Workspace access
  else OTP invalid
    Auth-->>API: Reject and count failed attempt
    API->>Audit: Write MFA_LOGIN_FAILED
    API-->>FE: Error/rate limit state
  end
```

Audit event generated: `MFA_LOGIN_SUCCESS`, `MFA_LOGIN_FAILED`. Related use cases: UC-M01-02 Login, UC-M01-10 Login With MFA, UC-M01-05 Verify MFA Code.

## Disable / Reset MFA

Participants: User, Web Frontend, API Backend, Auth Module, Recovery Policy, Audit Module.

Preconditions: User has MFA enabled or recovery request.

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Web Frontend
  participant API as API Backend
  participant Auth as Auth Module
  participant Rec as Recovery Policy
  participant Audit as Audit Module
  alt Disable MFA
    U->>FE: Request disable MFA
    FE->>API: Re-authenticate + OTP
    API->>Auth: Verify recent auth and OTP
    Auth-->>API: Disable allowed
    API->>Audit: Write MFA_DISABLED
    API-->>FE: MFA disabled
  else Reset MFA
    U->>FE: Request MFA reset
    FE->>API: Submit recovery request
    API->>Rec: Verify support/admin recovery policy
    Rec-->>API: Approved or denied
    API->>Audit: Write MFA_RESET_REQUESTED
    alt approved
      API->>Auth: Reset MFA method
      API->>Audit: Write MFA_RESET_COMPLETED
      API-->>FE: Reset completed
    else denied
      API-->>FE: Reset denied
    end
  end
```

Failure path: recovery cannot bypass authentication policy. Related use cases: UC-M01-06 Disable MFA, UC-M01-07 Reset MFA.

## Manager Creates Assessment

```mermaid
sequenceDiagram
  participant M as Manager
  participant FE as Web Frontend
  participant API as API Backend
  participant Assess as Assessment Module
  participant Audit as Audit Module
  M->>FE: Create assessment
  FE->>API: Create assessment request
  API->>Assess: Create in organization
  Assess-->>API: Assessment state WIZARD_IN_PROGRESS
  API->>Audit: Write ASSESSMENT_CREATED
  API-->>FE: Assessment created
```

Preconditions: Manager authenticated and organization member. Related use case: UC-M03-01 Create Assessment.

## Manager Invites Developer

```mermaid
sequenceDiagram
  participant M as Manager
  participant API as API Backend
  participant Policy as Role/Permission Module
  participant D as Developer
  participant Audit as Audit Module
  M->>API: Invite Developer
  API->>Policy: Create assessment member invite
  Policy-->>D: Send invite/task
  API->>Audit: Write DEVELOPER_INVITED
  M->>API: Assign Developer policy
  API->>Policy: Grant selected policies
  API->>Audit: Write DEVELOPER_POLICY_ASSIGNED
```

Failure path: Developer receives no Manager permissions. Related use cases: UC-M02-04 Invite Developer, UC-M02-05 Assign Developer Policy.

## Developer Provides GitHub Evidence

```mermaid
sequenceDiagram
  participant D as Developer
  participant FE as Developer Workspace
  participant API as API Backend
  participant GH as GitHub
  participant W as Python Worker
  participant Audit as Audit Module
  D->>FE: Connect repository
  FE->>API: Select repo/branch/commit
  API->>GH: Read-only access request
  GH-->>API: Repo metadata/token scope
  API->>Audit: Write GITHUB_REPOSITORY_CONNECTED
  D->>FE: Run Scan or Re-scan
  FE->>API: Request repository scan
  API->>API: Check RUN_SCAN policy and valid branch/commit
  API->>W: Queue scan job
  W->>W: Scan temporary workspace
  W-->>API: Normalized evidence report
  API->>Audit: Write REPOSITORY_SCAN_STARTED / REPOSITORY_SCAN_COMPLETED
```

Failure path: missing `RUN_SCAN` policy, invalid branch/commit, scan failure or source privacy violation blocks evidence readiness. Raw source is not sent to LLM and not stored long-term. Related use cases: UC-M04-02 Connect GitHub Repository, UC-M04-08 Run Repository Scan.

## Developer Uploads Local/CI Evidence

```mermaid
sequenceDiagram
  participant D as Developer
  participant FE as Developer Workspace
  participant API as API Backend
  participant Evidence as Evidence Module
  participant Audit as Audit Module
  D->>FE: Upload report
  FE->>API: Upload Local/CI evidence report
  API->>Evidence: Store metadata and report artifact
  Evidence-->>API: Report received
  API->>Audit: Write EVIDENCE_REPORT_UPLOADED
```

Failure path: missing required metadata leads to schema rejection. Related use case: UC-M04-03 Upload Local/CI Scanner Report.

## Evidence Gate Processing

```mermaid
sequenceDiagram
  participant API as API Backend
  participant W as Python Worker
  participant Gate as Evidence Gate Module
  participant Audit as Audit Module
  API->>W: Process evidence report
  W->>Gate: Validate schema
  alt schema missing required fields
    Gate-->>API: TECHNICAL_EVIDENCE_REJECTED
  else schema pass
    Gate->>Gate: Validate privacy flags
    Gate->>Gate: Evaluate quality threshold
    alt insufficient
      Gate-->>API: TECHNICAL_EVIDENCE_INSUFFICIENT
    else ready
      Gate-->>API: TECHNICAL_EVIDENCE_READY
    end
  end
  API->>Audit: Write evidence gate result
```

Related use cases: UC-M05-01 Validate Evidence Schema, UC-M05-02 Validate Privacy Flags, UC-M05-03 Evaluate Evidence Quality, UC-M05-05 Mark Evidence as Rejected, Insufficient, or Ready.

## Reconciliation with Conflict

```mermaid
sequenceDiagram
  participant R as Reconciliation Module
  participant S as Scoring Module
  participant M as Manager
  participant D as Developer
  participant Audit as Audit Module
  R->>R: Compare WizardProfile and TechnicalProfile
  R->>S: Calculate Conflict Score
  alt material or critical conflict
    R->>M: Request business/legal confirmation
    R->>D: Request technical confirmation
    M-->>R: Confirm business/legal meaning
    D-->>R: Confirm technical truth
    R->>Audit: Write DUAL_CONFIRMATION_COMPLETED
  else non-material conflict
    R->>M: Route or auto-resolve based on owner
  end
```

Failure path: unresolved material/critical conflict sets `BLOCKED_BY_CONFLICT`. Related use cases: UC-M06-01..UC-M06-06.

## Human Attestation

```mermaid
sequenceDiagram
  participant D as Developer
  participant API as API Backend
  participant Att as Attestation Module
  participant Audit as Audit Module
  D->>API: Submit structured attestation
  API->>Att: Validate schema and role-bound claim
  alt forbidden metadata replacement
    Att-->>API: Reject
    API->>Audit: Write ATTESTATION_REJECTED
  else accepted
    Att-->>API: Record attestation
    API->>Audit: Write HUMAN_ATTESTATION_SUBMITTED
    API->>Audit: Write ATTESTATION_USAGE_RECORDED if used
  end
```

Related use cases: UC-M04-07 Provide Structured Technical Attestation, UC-M09-05 Track Human Attestation Usage.

## VerifiedProfile Creation and Approval

```mermaid
sequenceDiagram
  participant R as Reconciliation Module
  participant M as Manager
  participant V as VerifiedProfile Module
  participant Audit as Audit Module
  R->>V: Request profile creation
  V->>V: Check evidence ready and conflicts resolved
  alt gate failed or unresolved conflict
    V-->>R: Reject creation
  else checks pass
    V-->>R: VerifiedProfile candidate ready
    V->>Audit: Write VERIFIED_PROFILE_CREATED
    V->>M: Show VerifiedProfile candidate
    M-->>V: Approve business/legal meaning
    V->>V: Check no unresolved material/critical conflict and required Developer confirmations
    V->>Audit: Write VERIFIED_PROFILE_APPROVED
  end
```

Failure path: approval is blocked if required Developer confirmation is missing or material/critical conflict remains unresolved. Related use cases: UC-M06-07 Create VerifiedProfile, UC-M06-08 Review and Approve VerifiedProfile.

## Risk Classification with Legal Citation

```mermaid
sequenceDiagram
  participant API as API Backend
  participant Legal as Legal Corpus/RAG
  participant Agent as Risk Classification Agent
  participant Audit as Audit Module
  API->>Legal: Retrieve versioned rules/citations
  alt critical citation missing
    API->>Audit: Write CLASSIFICATION_BLOCKED_OR_DEGRADED
    API-->>API: Block or degrade classification
  else citations available
    API->>Agent: Send VerifiedProfile + legal rules
    Agent-->>API: Classification with rule trace
    API->>Audit: Write RISK_CLASSIFICATION_RUN
  end
```

Failure path: LLM cannot create unsupported legal conclusion. Related use cases: UC-M07-01..UC-M07-04.

## Document Generation

```mermaid
sequenceDiagram
  participant M as Manager
  participant API as API Backend
  participant Doc as Document Module
  participant Gap as Gap Analysis Module
  participant Obj as Object Storage
  participant Audit as Audit Module
  M->>API: Request report/export
  alt no technical evidence
    API->>Doc: Generate readiness-only export
  else unresolved material/critical conflict
    API-->>M: Final report blocked
  else gates pass
    API->>Gap: Retrieve GapAnalysisResult
    Gap-->>API: Gaps, priorities, evidence basis, legal citations
    API-->>M: Show Gap Analysis view if requested
    API->>Doc: Generate compliance report
    Doc->>Obj: Store generated document
    Doc-->>API: Document metadata
  end
  API->>Audit: Write document event
```

Related use cases: UC-M08-01..UC-M08-06.

## Audit Event Recording

```mermaid
sequenceDiagram
  participant Module as Domain Module
  participant Audit as Audit Module
  participant Store as Audit Store
  Module->>Audit: Write material event
  Audit->>Audit: Validate event metadata
  Audit->>Store: Append event
  Store-->>Audit: Stored
```

Related use case: UC-M09-01 Write Audit Event.

## Validation Dependencies

| Assumption | Affected Sequence Diagrams |
| --- | --- |
| A1 | Manager Creates Assessment, Evidence Gate Processing, Reconciliation with Conflict |
| A2 | Risk Classification with Legal Citation, Document Generation |
| A3 | Manager Invites Developer, Reconciliation with Conflict, Human Attestation, Audit Event Recording |
