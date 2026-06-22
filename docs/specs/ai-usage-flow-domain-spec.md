# AI Usage Flow Domain Spec

## Purpose

This document explains exactly how LCSP transforms technical evidence and Manager declarations into evidence-backed AI usage claims.

It is the domain behavior source of truth for `AIUsageFlowWorker`. It does not define implementation files, queues, database schema, tests, validation plans or backlog items.

## Domain Responsibility

AIUsageFlow translates `TechnicalProfile`, `WizardProfile` and `TechnicalEvidenceReport` into business-meaning claims that later drive reconciliation and legal matching.

AIUsageFlow must answer:

- whether AI use is confirmed, possible, absent or unclear;
- what business process the AI supports;
- what input and output categories are involved;
- whether an output feeds a downstream action;
- whether affected subjects exist;
- whether human review is present, absent or unclear;
- whether the use is assistive, semi-automated, fully automated or unknown;
- what harm categories may be relevant;
- what evidence refs support each material claim;
- what uncertainty or coverage limitations remain.

AIUsageFlow must not:

- infer legal risk from provider, model or framework presence alone;
- use raw source, full prompts, secrets or full AST bodies;
- silently accept Manager declarations that conflict with technical evidence;
- produce legal conclusions;
- bypass reconciliation.

## Inputs

### TechnicalProfile

| Field / Aspect | What it contributes | Why it matters | Missing behavior |
|---|---|---|---|
| `technicalProfileId` | Source profile identity. | Links generated claims to immutable technical summary. | AIUsageFlow generation is `BLOCKED`. |
| `aiDetected` | `none`, `possible`, or `confirmed`. | Distinguishes package-only evidence from model invocation evidence. | AI usage claim is `UNKNOWN`; downstream legal matching is blocked. |
| `providers`, `frameworks` | Provider/framework signals. | Supports provider usage claims only. | No provider claim is emitted. |
| `modelInvocationCount` | Count of evidence-backed model calls. | Confirms active AI invocation when greater than zero. | Invocation claim is absent or abstained. |
| `inputCategories` | Detected data/domain input categories. | Drives affected data and harm category claims. | Input claims become `UNKNOWN` if legally material. |
| `outputCategories` | Score, ranking, summary, label or generated content signals. | Drives output type and automation claims. | Output claims become `UNKNOWN`; classification may later block. |
| `decisionFlowSignals` | Evidence that output feeds branch/action/status update. | Required for automated decision claims. | Automated decision claim must abstain. |
| `humanReviewSignals` | Evidence of review workflow. | Distinguishes human review present, absent or unclear. | Human review state becomes `UNCLEAR`. |
| `coverageLimitations` | Unsupported/dynamic/minified/opaque path limits. | Prevents unsupported certainty. | Preserved in AIUsageFlow and may block legal matching. |
| `confidence`, `evidenceRefs` | Evidence quality and traceability. | Required for material claims. | Claims without evidence refs are not eligible for legal matching. |

### WizardProfile

| Field / Aspect | What it contributes | Why it matters | Missing behavior |
|---|---|---|---|
| `wizardProfileId` | Manager declaration identity. | Links Manager-stated business context to reconciliation. | AIUsageFlow generation is `BLOCKED`; classification cannot proceed. |
| `answers.businessProcess` | Manager-declared business process. | Helps interpret technical signals. | Business process is inferred only if evidence-backed; otherwise `UNKNOWN`. |
| `answers.aiPurpose` | Declared AI purpose. | Supports purpose claim and conflict detection. | Purpose claim depends on technical evidence only. |
| `answers.humanReview` | Declared oversight. | Compared against bounded technical path. | Human review conflict cannot be evaluated; mark uncertainty. |
| `answers.affectedSubjects` | Declared users/customers/employees/applicants. | Helps determine affected subject claims. | Affected subject claim remains `UNKNOWN` if evidence is weak. |
| `answers.dataTypes` | Declared personal/sensitive/business data categories. | Compared with technical input signals. | Data type claim depends on technical evidence only. |

### TechnicalEvidenceReport

| Field / Aspect | What it contributes | Why it matters | Missing behavior |
|---|---|---|---|
| `technicalEvidenceReportId` | Evidence report identity. | Anchors claims to a scan report. | AIUsageFlow generation is `BLOCKED`. |
| `TechnicalFinding[]` | Atomic evidence signals. | Source material for every technical claim. | Claims based on missing findings must abstain. |
| `EvidenceReference[]` | Traceable evidence refs. | Required for material legal-matching claims. | Claim is not material-eligible. |
| `coverageSummary` | Known blind spots. | Drives coverage limitation and abstention. | Unknown coverage is itself a limitation. |
| `qualityStatus` | Evidence gate result. | Ensures unsupported reports do not feed claims. | If not `PASS`, AIUsageFlow is `BLOCKED` or `UNCLEAR`. |

## Outputs

### AIUsageFlow

| Field | Meaning | Required | Source |
|---|---|---:|---|
| `aiUsageFlowId` | AIUsageFlow identity. | Yes | System generated. |
| `assessmentId` | Assessment scope. | Yes | Input objects. |
| `technicalProfileId` | TechnicalProfile source. | Yes | TechnicalProfile. |
| `status` | `DRAFT`, `READY`, `UNCLEAR`, `CONFLICTED`, or `BLOCKED`. | Yes | Rule outcomes and conflict/abstention status. |
| `summary` | AIUsageFlowSummary object. | Yes | Aggregated claims. |
| `claims` | AIUsageFlowClaim array. | Yes | Rule engine. |
| `confidence` | Overall deterministic confidence, 0.0 to 1.0. | Yes | Confidence model. |
| `uncertaintyReasons` | Reasons for unknown or unclear material fields. | Yes | Rules and coverage limitations. |
| `coverageLimitations` | Preserved limitations from scanner/profile/rules. | Yes | TechnicalProfile and rule engine. |
| `createdAt` | Creation timestamp. | Yes | System generated. |

### AIUsageFlowClaim

| Field | Meaning | Required | Source |
|---|---|---:|---|
| `claimId` | Claim identity. | Yes | System generated. |
| `aiUsageFlowId` | Owning flow. | Yes | System generated. |
| `claimCategory` | Taxonomy category such as `MODEL_INVOCATION` or `AUTOMATED_DECISION`. | Yes | Matched rule. |
| `claimField` | Target field such as `automation_level`, `human_review`, `business_process`. | Yes | Matched rule. |
| `claimValue` | Structured value. | Yes | Evidence-derived or declaration-derived rule output. |
| `lifecycleState` | `DETECTED`, `VALIDATED`, `CONFLICTED`, `VERIFIED`, `REJECTED`, or `ABSTAINED`. | Yes | Claim lifecycle rules. |
| `evidenceRefs` | One or more evidence refs for material claims. | Conditional | Required for material legal-matching claims. |
| `confidence` | Claim confidence, 0.0 to 1.0. | Yes | Confidence model. |
| `confidenceBreakdown` | Base, evidence, support, conflict and coverage components. | Yes | Confidence model. |
| `uncertaintyReasons` | Claim-specific unknowns. | Yes | Rule outcomes. |
| `conflictRefs` | Conflict identifiers or conflict descriptors when applicable. | No | Conflict rules. |

### AIUsageFlowSummary

| Field | Meaning | Required | Source |
|---|---|---:|---|
| `aiDetected` | `none`, `possible`, `confirmed`, or `unknown`. | Yes | TechnicalProfile and claims. |
| `businessProcess` | Business process category or `UNKNOWN`. | Yes | WizardProfile + domain context evidence. |
| `aiPurpose` | Purpose category or `UNKNOWN`. | Yes | Invocation/output/context claims. |
| `aiInputTypes` | Input categories. | Yes | Input category rules. |
| `aiOutputTypes` | Output categories. | Yes | Output type rules. |
| `downstreamAction` | `NONE`, `DISPLAY_ONLY`, `STATUS_UPDATE`, `APPROVE_REJECT`, `THRESHOLD_BRANCH`, or `UNKNOWN`. | Yes | Downstream action rules. |
| `affectedSubjects` | Subject categories or `UNKNOWN`. | Yes | WizardProfile + technical/user impact signals. |
| `humanReview` | `PRESENT`, `ABSENT_WITH_BOUNDED_PATH`, `UNCLEAR`, or `NOT_APPLICABLE`. | Yes | Human review rules. |
| `automationLevel` | `ASSISTIVE`, `SEMI_AUTOMATED`, `FULLY_AUTOMATED`, or `UNKNOWN`. | Yes | Automation rules. |
| `potentialHarmCategories` | Harm category list. | Yes | Harm rules. |
| `materialClaimRefs` | Claim IDs eligible for legal matching. | Yes | Claims with evidence refs and sufficient confidence. |
| `blockingReasons` | Reasons that block reconciliation/legal matching/classification. | Yes | Abstention, coverage and conflict rules. |

## Claim Taxonomy

| Claim Category | Meaning | Business Impact | Required Evidence |
|---|---|---|---|
| `MODEL_PROVIDER_USAGE` | Provider package, SDK, endpoint or configured provider appears. | Shows possible AI dependency but not usage by itself. | Import/package/config evidence ref. |
| `MODEL_INVOCATION` | Code invokes an AI model/provider method. | Confirms active AI use. | Call/evidence ref to invocation. |
| `AI_GENERATED_OUTPUT` | Model output is assigned, parsed, returned, displayed or stored. | Establishes AI output type. | Output variable/parser/return evidence ref. |
| `DOWNSTREAM_ACTION` | AI output feeds a branch, status update, approve/reject action or display-only path. | Determines whether the use affects decisions. | Output-to-action path evidence refs. |
| `AUTOMATED_DECISION` | AI output plus rule/threshold/action creates a bounded automated decision path. | Enables high-impact legal matching only when evidence-backed. | Invocation, output, branch/action and absence-of-review evidence. |
| `HUMAN_REVIEW` | A human review or approval workflow is present, absent, or unclear. | Distinguishes assistive/semi-automated/automated use. | Review queue/approval state or bounded path evidence. |
| `PROMPT_STORAGE` | Prompt or prompt reference is stored/configured. | Indicates prompt governance and privacy concern. | Redacted prompt metadata or config evidence ref. |
| `PERSONAL_DATA_INPUT` | AI input includes personal/sensitive/domain-specific data. | Drives affected subject and harm categories. | Data field/category evidence refs. |
| `TRAINING_ACTIVITY` | Code indicates model training/fine-tuning activity. | Affects lifecycle and data governance. | Training API/job/config evidence refs. |
| `RAG_USAGE` | Retrieval-augmented generation uses external corpus/vector retrieval. | Affects data/citation/knowledge-source handling. | Retrieval call/vector store/citation evidence refs. |
| `DOCUMENT_GENERATION` | AI is used to generate document/report text. | Affects output guardrails and citation requirements. | Generation call/output/template evidence refs. |

## Claim Lifecycle

| State | Meaning | Entry rule | Exit rule |
|---|---|---|---|
| `DETECTED` | A signal exists but may not yet satisfy material evidence threshold. | Rule matched at least one signal. | Move to `VALIDATED`, `CONFLICTED`, `REJECTED`, or `ABSTAINED`. |
| `VALIDATED` | Required evidence is present and confidence is at least 0.65. | Required evidence refs exist and no blocking conflict exists. | Move to `VERIFIED` after reconciliation, or `CONFLICTED` if mismatch emerges. |
| `CONFLICTED` | Claim conflicts with WizardProfile, TechnicalProfile or another claim. | Conflict rule matched. | Reconciliation resolves or rejects. |
| `VERIFIED` | Claim is accepted into VerifiedProfile after reconciliation. | Reconciliation confirms no conflict or Manager resolves it. | Immutable for that VerifiedProfile version. |
| `REJECTED` | Claim is not accepted because evidence contradicts it or Manager resolution rejects it. | Reconciliation or rule evaluation rejects claim. | Immutable audit outcome. |
| `ABSTAINED` | Rule refused to produce a material claim because evidence is insufficient or coverage is limited. | Abstention rule matched. | Requires better evidence, rescan or Manager-visible unresolved state. |

Transition rules:

- `DETECTED -> VALIDATED` requires required evidence refs and confidence >= 0.65.
- `DETECTED -> ABSTAINED` occurs when only provider/package evidence exists for material usage.
- `VALIDATED -> CONFLICTED` occurs when a compared WizardProfile field disagrees.
- `CONFLICTED -> VERIFIED` requires Manager resolution and preserved scanner evidence.
- `CONFLICTED -> REJECTED` requires Manager resolution rejecting the claim for VerifiedProfile use.
- `ABSTAINED` never becomes `VERIFIED` without new evidence or explicit non-material classification.

## Claim Generation Rules

| Claim Type | Input Evidence | Required Signals | Optional Signals | Missing Evidence Behavior | Conflict Behavior |
|---|---|---|---|---|---|
| `MODEL_PROVIDER_USAGE` | Provider imports, dependencies, provider config. | `AI_PROVIDER_USAGE` or `AI_FRAMEWORK_USAGE`. | Provider name, package version. | Emit possible provider claim only; no material usage claim. | None unless Wizard says no AI and invocation also exists. |
| `MODEL_INVOCATION` | Call facts and invocation findings. | `AI_MODEL_INVOCATION`. | Provider import, output variable. | Abstain from confirmed AI usage. | Conflict if Wizard says no AI. |
| `AI_GENERATED_OUTPUT` | Output variable/parser/return findings. | `AI_OUTPUT_SIGNAL`. | Output category hints. | Output type `UNKNOWN`. | Conflict if Wizard says no generated output and evidence is strong. |
| `DOWNSTREAM_ACTION` | Branch, status update, approve/reject, display path. | `AI_DECISION_FLOW_SIGNAL`, `STATUS_UPDATE_SIGNAL`, `AUTOMATED_DECISION_SIGNAL`, or `USER_IMPACT_SIGNAL`. | Route/controller names. | Downstream action `UNKNOWN`; classification may block. | Conflict if Wizard says content-only but action evidence exists. |
| `AUTOMATED_DECISION` | Invocation + output + action path + no review evidence. | `AUTOMATED_DECISION_SIGNAL` and bounded output/action path. | Domain context, persistence action. | Abstain unless bounded path exists. | Conflict if Wizard claims human review or assistive-only use. |
| `HUMAN_REVIEW` | Review queue, approval status, moderation/manager approval workflow. | `HUMAN_REVIEW_SIGNAL` or bounded path absence. | Wizard review declaration. | `UNCLEAR`. | Conflict if Wizard claims review but bounded path shows absent. |
| `PROMPT_STORAGE` | System prompt findings or dynamic prompt references. | `SYSTEM_PROMPT_DETECTED` or `DYNAMIC_SYSTEM_PROMPT_REFERENCE`. | Template/config path. | Preserve coverage limitation; no raw prompt. | Conflict if prompt use is denied and evidence exists. |
| `PERSONAL_DATA_INPUT` | Data field facts and sensitive/domain signals. | `SENSITIVE_DATA_SIGNAL` or domain input category. | Wizard-declared data types. | Input category `UNKNOWN`. | Conflict if Wizard omits material data category. |
| `TRAINING_ACTIVITY` | Training API/job/config evidence. | Training/fine-tune finding if present in TechnicalFinding metadata. | Dataset/config refs. | No training claim. | Conflict if Wizard declares no training and evidence exists. |
| `RAG_USAGE` | Retrieval/vector/corpus call findings. | `RAG_USAGE_SIGNAL`. | Citation or vector collection refs. | No RAG claim or `UNKNOWN` if dynamic. | Conflict if Wizard declares no external knowledge source. |
| `DOCUMENT_GENERATION` | Document generation call/output/template evidence. | AI output used for document/report generation. | Template version, citation path. | No document-generation claim. | Conflict if Wizard says no generated document output. |

## Confidence Model

Confidence is deterministic per claim.

```text
D = required evidence present bonus
O = optional support bonus
C = coverage penalty
K = conflict penalty
M = missing required evidence penalty

claimConfidence = clamp(base + D + O - C - K - M, 0.00, 1.00)
```

Base scores:

| Claim category | Base |
|---|---:|
| `MODEL_PROVIDER_USAGE` | 0.35 |
| `MODEL_INVOCATION` | 0.70 |
| `AI_GENERATED_OUTPUT` | 0.65 |
| `DOWNSTREAM_ACTION` | 0.70 |
| `AUTOMATED_DECISION` | 0.80 |
| `HUMAN_REVIEW` | 0.70 |
| `PROMPT_STORAGE` | 0.55 |
| `PERSONAL_DATA_INPUT` | 0.60 |
| `TRAINING_ACTIVITY` | 0.60 |
| `RAG_USAGE` | 0.65 |
| `DOCUMENT_GENERATION` | 0.65 |

Adjustments:

- `D = +0.10` when all required evidence refs are present.
- `O = +0.05` per optional supporting signal, capped at `+0.10`.
- `C = -0.15` per material coverage limitation affecting the claim, capped at `-0.30`.
- `K = -0.20` when a WizardProfile conflict exists.
- `M = -0.35` when a required evidence class is missing.

Thresholds:

- `< 0.40`: claim is `ABSTAINED`.
- `0.40..0.64`: claim is `DETECTED` but not material-eligible.
- `>= 0.65`: claim is `VALIDATED` if no conflict exists.
- `>= 0.75` with complete evidence path: claim may support legal matching after reconciliation.

Overall AIUsageFlow confidence is the average of material claim confidences minus `0.05` for each flow-level uncertainty reason, capped between `0.00` and `1.00`.

## Abstention Rules

Claim generation must abstain when:

- provider/package/framework presence is the only AI signal;
- output-to-action path is dynamic or unresolved for an automated decision claim;
- human review is declared but no review process evidence or bounded path evidence exists;
- source coverage is unsupported, generated/minified, dynamic or incomplete for the material claim;
- evidence refs are missing for a material claim;
- WizardProfile is missing;
- TechnicalProfile or TechnicalEvidenceReport is missing or failed.

The system must return `UNKNOWN` when:

- business process cannot be determined from WizardProfile or evidence;
- affected subjects cannot be determined;
- downstream action cannot be proven;
- human review cannot be proven present or absent;
- automation level cannot be derived without unsupported inference.

The system must refuse downstream classification by producing `BLOCKED` or `UNCLEAR` when:

- unknown critical usage affects legal matching eligibility;
- any material conflict remains unresolved;
- material claims have no evidence refs;
- only provider/model/framework presence exists.

## Conflict Generation Rules

| WizardProfile says | TechnicalProfile says | AIUsageFlow says | Result |
|---|---|---|---|
| No AI use | `aiDetected = confirmed` or invocation count > 0 | `MODEL_INVOCATION` validated | Create conflict `WIZARD_NO_AI_BUT_INVOCATION_EXISTS`. |
| Human review exists | Bounded path shows approve/reject/status update without review evidence | `human_review = ABSENT_WITH_BOUNDED_PATH` | Create conflict `HUMAN_REVIEW_CLAIM_UNSUPPORTED`. |
| Internal-only use | User-facing route/chat/customer support evidence exists | `affected_subjects` includes customer/user | Create conflict `INTERNAL_ONLY_CONFLICTS_WITH_USER_IMPACT`. |
| Content-only assistance | Scoring/ranking/decision label and downstream action exists | `automation_level` semi/full automated | Create conflict `CONTENT_ONLY_CONFLICTS_WITH_DECISION_FLOW`. |
| Low/no sensitive data | Sensitive/personal/domain fields are found | `PERSONAL_DATA_INPUT` validated | Create conflict `DATA_CATEGORY_DECLARATION_MISMATCH`. |

## Reconciliation Handoff

AIUsageFlow hands off to reconciliation by persisting:

- `AIUsageFlow.status`;
- `AIUsageFlow.summary`;
- `AIUsageFlowClaim[]`;
- `uncertaintyReasons`;
- `coverageLimitations`;
- conflict candidate descriptors;
- evidence refs for every material claim.

Handoff behavior:

```text
all material claims validated
and no conflict candidates
=> event.ai-usage-flow.completed.v1
=> command.reconciliation.requested.v1

one or more conflict candidates
=> event.ai-usage-flow.completed.v1 with status CONFLICTED
=> command.reconciliation.requested.v1

missing critical input or failed evidence report
=> event.ai-usage-flow.failed.v1 or completed status BLOCKED
=> no VerifiedProfile until recovery
```

Reconciliation, not AIUsageFlow, creates `VerifiedProfile`.

## End-to-End Example

### TechnicalProfile Input

```json
{
  "technicalProfileId": "018f0000-0000-7000-8000-000000000221",
  "assessmentId": "018f0000-0000-7000-8000-000000000001",
  "technicalEvidenceReportId": "018f0000-0000-7000-8000-000000000211",
  "source": "GITHUB_REPOSITORY_SCAN",
  "aiDetected": "confirmed",
  "providers": ["openai"],
  "frameworks": [],
  "modelInvocationCount": 1,
  "inputCategories": ["financial", "personal_data"],
  "outputCategories": ["score"],
  "decisionFlowSignals": ["output_feeds_threshold_branch", "approve_reject_action"],
  "humanReviewSignals": [],
  "sensitiveDataSignals": ["income", "credit", "loan"],
  "domainSignals": ["loan_approval"],
  "coverageLimitations": [],
  "confidence": 0.86,
  "evidenceRefs": [
    {"evidenceRefId": "018f0000-0000-7000-8000-000000000241", "sourceType": "STATIC_SCAN"},
    {"evidenceRefId": "018f0000-0000-7000-8000-000000000242", "sourceType": "STATIC_SCAN"},
    {"evidenceRefId": "018f0000-0000-7000-8000-000000000243", "sourceType": "STATIC_SCAN"}
  ],
  "createdAt": "2026-06-21T00:00:00.000Z"
}
```

### Generated Claims

| Claim | Rule basis | Confidence | Lifecycle |
|---|---|---:|---|
| `MODEL_INVOCATION` | Invocation evidence ref exists. | 0.80 | `VALIDATED` |
| `AI_GENERATED_OUTPUT` | Score output evidence exists. | 0.75 | `VALIDATED` |
| `PERSONAL_DATA_INPUT` | Financial/personal data fields exist. | 0.70 | `VALIDATED` |
| `DOWNSTREAM_ACTION` | Score feeds threshold branch and approve/reject action. | 0.85 | `VALIDATED` |
| `AUTOMATED_DECISION` | Invocation + score + approve/reject + no review path. | 0.90 | `VALIDATED` |
| `HUMAN_REVIEW` | No review path found on bounded decision path. | 0.70 | `VALIDATED` |

### Conflicts

If WizardProfile says "AI only assists staff" or "human review exists", AIUsageFlow emits conflict candidates for reconciliation:

- `CONTENT_ONLY_CONFLICTS_WITH_DECISION_FLOW`
- `HUMAN_REVIEW_CLAIM_UNSUPPORTED`

### Final AIUsageFlow

```json
{
  "aiUsageFlowId": "018f0000-0000-7000-8000-000000000231",
  "assessmentId": "018f0000-0000-7000-8000-000000000001",
  "technicalProfileId": "018f0000-0000-7000-8000-000000000221",
  "status": "CONFLICTED",
  "summary": {
    "aiDetected": "confirmed",
    "businessProcess": "loan_approval",
    "aiPurpose": "credit_scoring_decision_support",
    "aiInputTypes": ["financial", "personal_data"],
    "aiOutputTypes": ["score"],
    "downstreamAction": "APPROVE_REJECT",
    "affectedSubjects": ["loan_applicant"],
    "humanReview": "ABSENT_WITH_BOUNDED_PATH",
    "automationLevel": "FULLY_AUTOMATED",
    "potentialHarmCategories": ["financial_harm"],
    "materialClaimRefs": ["claim_invocation", "claim_score", "claim_action", "claim_auto"],
    "blockingReasons": ["RECONCILIATION_REQUIRED"]
  },
  "confidence": 0.78,
  "uncertaintyReasons": [],
  "coverageLimitations": []
}
```
