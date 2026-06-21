# LCSP Sequence Diagrams

## Purpose

Tài liệu này mô tả sequence diagram cho các flow chính của LCSP. Tên use case và ID khớp với `docs/design/use-case-specification.md`.

Detailed multi-agent sequences for Evidence to VerifiedProfile, Human-in-the-loop Conflict Resolution, Risk Classification with Legal RAG and Document Generation are maintained in `docs/architecture/multi-agent-system-architecture.md`. That architecture document is the source of truth for Orchestrator-controlled agent routing, LLM Gateway boundaries, RAG/citation guardrails and audit-every-node behavior.

## Sequence Diagram List

| Sequence | Related Use Cases | Related Business Rules |
| --- | --- | --- |
| Register and Login | UC-M01-01, UC-M01-02 | BR-001, BR-003 |
| Sign In with OAuth/OIDC | UC-M01-14 | BR-086, BR-087, BR-088 |
| Setup MFA Using Authenticator App | UC-M01-04, UC-M01-05 | BR-006, BR-007, BR-011 |
| Login With MFA | UC-M01-02, UC-M01-10, UC-M01-05 | BR-008, BR-009 |
| Disable / Reset MFA | UC-M01-06, UC-M01-07 | BR-010, BR-012, BR-013 |
| Manager Creates Assessment | UC-M03-01 | BR-018, BR-023 |
| Manager Invites Developer | UC-M02-04, UC-M02-05 | BR-020, BR-021 |
| Manager Runs Repository Scan | UC-M04-02, UC-M04-08 | BR-032, BR-057, BR-058, BR-077 |
| Scanner-to-AIUsageFlow Static Analysis Sequence | UC-M04-08, UC-M05-01..UC-M05-05, UC-M06-01 | BR-080..BR-085 |
| Evidence Gate Processing | UC-M05-01, UC-M05-02, UC-M05-03, UC-M05-05 | BR-036, BR-037, BR-038, BR-040 |
| AI Usage Flow Analysis | UC-M05-04, UC-M06-01, UC-M07-01 | BR-080..BR-084 |
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

## Sign In with OAuth/OIDC

```mermaid
sequenceDiagram
  participant U as User
  participant FE as LCSP Login UI
  participant API as API Backend
  participant IdP as OAuth/OIDC Provider
  participant Auth as Auth Module
  participant Audit as Audit Module
  U->>FE: Select OAuth/OIDC provider
  FE->>API: Initiate OAuth/OIDC login
  API->>Auth: Create authorization request with PKCE/state/nonce
  Auth-->>FE: Redirect to provider
  FE->>IdP: Authorization request
  IdP-->>API: Callback with code/state
  API->>Auth: Validate redirect URI, state, nonce, issuer, audience, expiry
  Auth->>Auth: Apply safe account linking policy
  alt MFA enabled in LCSP
    Auth-->>FE: MFA challenge required
  else session allowed
    Auth-->>API: Create LCSP session
    API->>Audit: Write OAUTH_LOGIN_SUCCESS / OAUTH_ACCOUNT_LINKED
  end
```

Failure path: invalid callback/state/nonce/provider token is rejected and audited. OAuth/OIDC login does not create GitHub repository connection and does not grant repository scan permission. Related use case: UC-M01-14 Sign In with OAuth/OIDC.

## Manager Runs Repository Scan

```mermaid
sequenceDiagram
  participant M as Manager
  participant FE as Manager Workspace
  participant API as API Backend
  participant GH as GitHub
  participant Q as Queue
  participant W as Python Worker
  participant Scanner as Scanner
  participant Gate as Evidence Gate Module
  participant Usage as AI Usage Flow Analysis Node
  participant Audit as Audit Module
  M->>FE: Connect repository
  FE->>API: Select repo/branch/commit
  API->>GH: Read-only access request
  GH-->>API: Repo metadata/token scope
  API->>Audit: Write GITHUB_REPOSITORY_CONNECTED
  M->>FE: Click Run Repository Scan
  FE->>API: Request repository scan
  API->>API: Check Manager ownership or delegated RUN_REPOSITORY_SCAN policy and valid branch/commit
  API->>Q: Create scan job
  Q->>W: Dispatch scan job
  W->>Scanner: Run repository scan in temporary workspace
  Scanner-->>W: TechnicalEvidenceReport
  W->>Gate: Evidence normalization + schema gate + quality gate
  Gate-->>W: TechnicalProfile or rejected/insufficient status
  W->>Usage: Analyze AI purpose/input/output/downstream action/affected subjects/human review
  Usage-->>W: AIUsageFlow with evidence refs or uncertainty
  W-->>API: Scan/evidence gate status
  API->>Audit: Write REPOSITORY_SCAN_STARTED / REPOSITORY_SCAN_COMPLETED / EVIDENCE_GATE_RESULT / AI_USAGE_FLOW_ANALYZED
```

Failure path: delegated Developer missing `RUN_REPOSITORY_SCAN` policy, invalid branch/commit, scan failure or source privacy violation blocks evidence readiness. Manager can run scan without Developer assignment. Raw source is not sent to LLM and not stored long-term. Related use cases: UC-M04-02 Connect GitHub Repository, UC-M04-08 Run Repository Scan.

## Scanner-to-AIUsageFlow Static Analysis Sequence

```mermaid
sequenceDiagram
  participant M as Manager
  participant API as NestJS API
  participant Q as Queue
  participant W as Python Worker
  participant GH as GitHub App
  participant WS as Temporary Workspace
  participant Inv as Inventory/Manifest Analyzer
  participant Parsers as Tree-sitter + TS Sidecar + Python Analyzer
  participant Det as Scanner Detectors
  participant Graph as NetworkX Evidence Graph
  participant DB as PostgreSQL
  participant Gate as Schema/Quality Gates
  participant TP as TechnicalProfile Builder
  participant UF as AI Usage Flow Analysis
  participant R as Reconciliation
  M->>API: Request Repository Scan
  API->>Q: Create RepositoryScanJob with repo/branch/commit refs
  Q->>W: Deliver job
  W->>GH: Resolve read-only repository access
  W->>WS: Create isolated temporary workspace
  W->>WS: Shallow clone pinned commit SHA
  WS->>Inv: Repository inventory + manifest/config analysis
  Inv->>Parsers: Static parse and semantic analysis
  Parsers->>Det: AI invocation, input, output, downstream action, human-review and domain signals
  Det->>Graph: Build call/data/control/evidence paths
  Graph->>DB: Persist graph metadata, refs, hashes and coverage limitations only
  Graph-->>W: TechnicalFinding records
  W->>DB: Persist TechnicalEvidenceReport metadata/report hash
  W->>WS: Cleanup raw source workspace
  W->>Gate: Schema Gate then Quality Gate
  Gate->>TP: Accepted evidence
  TP->>UF: TechnicalProfile + evidence refs
  UF->>R: AIUsageFlow claim-level evidence or uncertainty
```

Boundary: raw source exists only in the temporary workspace and is deleted after scan success/failure handling. Scanner does not execute customer code, installs, builds, tests, Docker, CI workflows, scripts or API probes. LLM Gateway is not used by the scanner; AIUsageFlow may later use only sanitized metadata and evidence reference IDs.

## Deferred / Future Evidence Sequences

Not part of MVP main workflow.

### Developer Uploads Local/CI Evidence

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

## AI Usage Flow Analysis

```mermaid
sequenceDiagram
  participant W as Python Worker
  participant TP as TechnicalProfile Builder
  participant UF as AI Usage Flow Analysis Node
  participant R as Reconciliation Module
  participant Legal as Legal Corpus/RAG
  participant Audit as Audit Module
  TP-->>W: TechnicalProfile ready
  W->>UF: Analyze TechnicalProfile + findings + Wizard context
  UF->>UF: Identify business_process, ai_purpose, input/output, downstream action, affected subject, human review, automation level, harm potential
  alt usage purpose unclear
    UF-->>R: AIUsageFlow uncertainty with evidence refs
    R->>Audit: Write AI_USAGE_FLOW_UNCERTAIN
  else usage purpose clear
    UF-->>R: AIUsageFlow with evidence refs
    R->>Audit: Write AI_USAGE_FLOW_ANALYZED
  end
  R->>Legal: Later rule matching uses VerifiedProfile + AIUsageFlow
```

Failure path: unclear or conflicting usage purpose creates reconciliation conflict/confirmation rather than overclaiming risk. Related concepts: TechnicalProfile, AIUsageFlow, Reconciliation, Legal Rule Matching.

## Reconciliation with Conflict

```mermaid
sequenceDiagram
  participant R as Reconciliation Module
  participant API as API Backend
  participant M as Manager
  participant V as VerifiedProfile Builder
  participant Audit as Audit Module
  R->>R: Compare WizardProfile with TechnicalProfile + AIUsageFlow
  alt CONFLICT_FOUND
    R->>API: Pause workflow and create Manager conflict resolution task
    API-->>M: Show WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs
    M-->>API: Resolve conflict, request correction or request re-scan
    API-->>R: Conflict resolution recorded
    R->>Audit: Write CONFLICT_RESOLVED_BY_MANAGER
    R->>V: Build VerifiedProfile
  else NO_CONFLICT_FOUND
    R->>V: Build VerifiedProfile
  end
```

Failure path: unresolved conflict keeps classification locked and final report blocked. Developer clarification may be added post-MVP as optional input, but no MVP sequence depends on Developer action. Related use cases: UC-M06-01..UC-M06-06.

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
    V->>V: Check no unresolved conflict and required confirmations
    V->>Audit: Write VERIFIED_PROFILE_APPROVED
  end
```

Failure path: approval is blocked if required confirmation is missing or any conflict remains unresolved. Related use cases: UC-M06-07 Create VerifiedProfile, UC-M06-08 Review and Approve VerifiedProfile.

## Risk Classification with Legal Citation

```mermaid
sequenceDiagram
  participant API as API Backend
  participant Legal as Legal Corpus/RAG
  participant Agent as Risk Classification Agent
  participant Audit as Audit Module
  API->>Legal: Retrieve versioned rules/citations using VerifiedProfile + AIUsageFlow
  alt critical citation missing
    API->>Audit: Write CLASSIFICATION_BLOCKED_OR_DEGRADED
    API-->>API: Block or degrade classification
  else citations available
    API->>Agent: Send VerifiedProfile + AIUsageFlow + legal rules
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
  else unresolved conflict
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
| A2 | AI Usage Flow Analysis, Risk Classification with Legal Citation, Document Generation |
| A3 | Manager Invites Developer, Reconciliation with Conflict, Human Attestation, Audit Event Recording |
