# LCSP Event Catalog

## Purpose

This document is the domain-level source of truth for LCSP business, domain and integration events. It uses the canonical `command.*` and `event.*` names from the active queue contract. No alternate queue or event names are allowed.

## Event Naming Rules

- Commands request work and use `command.<domain>.<action>.v1`.
- Events are persisted facts and use `event.<domain>.<fact>.v1`.
- Commands publish through `lcsp.commands.v1`.
- Events publish through `lcsp.events.v1`.
- Poison or exhausted messages route through `lcsp.deadletter.v1` and the matching DLQ.
- Payloads contain references only: UUIDv7 IDs, versions, status and metadata refs. Payloads must not contain raw source, tokens, secrets, full prompts or full AST bodies.

## Business Events

Business events describe user-visible domain progress.

| Event Name | Producer | Consumer | Trigger | Payload | Idempotency Key | Failure Handling |
|---|---|---|---|---|---|---|
| `event.scan.completed.v1` | Scanner Worker | Technical Profile Worker / orchestrator | Repository scan completes only after `TechnicalEvidenceReport` is persisted, report schema/quality gates pass, `RepositoryScanJob.status` is `COMPLETED`, and workspace cleanup is verified. | `assessmentId`, `scanJobId`, `technicalEvidenceReportId`, `reportHash`, `cleanupVerifiedAt` | `scanJobId + reportHash` | If consumer fails, retry via queue; source report remains immutable. If cleanup is not verified, publish `event.scan.failed.v1` instead and do not unlock downstream. |
| `event.scan.failed.v1` | Scanner Worker | Assessment/orchestration projection | Scan fails or is blocked. | `assessmentId`, `scanJobId`, `failureCode`, `failureReasonRef` | `scanJobId + failureCode` | Mark scan failed, audit redacted reason, do not unlock downstream. |
| `event.technical-profile.completed.v1` | Technical Profile Worker | AIUsageFlow Worker / orchestrator | TechnicalProfile is persisted. | `assessmentId`, `technicalProfileId`, `technicalEvidenceReportId` | `technicalProfileId` | Retry consumer; if invalid profile, fail closed and audit. |
| `event.technical-profile.failed.v1` | Technical Profile Worker | Assessment/orchestration projection | TechnicalProfile cannot be built from evidence. | `assessmentId`, `technicalEvidenceReportId`, `failureCode` | `technicalEvidenceReportId + failureCode` | Block downstream and surface actionable reason. |
| `event.ai-usage-flow.completed.v1` | AIUsageFlow Worker | Reconciliation Worker / orchestrator | AIUsageFlow claims are persisted. | `assessmentId`, `aiUsageFlowId`, `technicalProfileId`, `status` | `aiUsageFlowId` | Retry consumer; unresolved uncertainty remains explicit. |
| `event.ai-usage-flow.failed.v1` | AIUsageFlow Worker | Assessment/orchestration projection | AIUsageFlow generation fails. | `assessmentId`, `technicalProfileId`, `failureCode` | `technicalProfileId + failureCode` | Block downstream and audit. |
| `event.reconciliation.conflict-detected.v1` | Reconciliation Worker | Backend API projection / Manager task view | Conflict is persisted. | `assessmentId`, `conflictId`, `aiUsageFlowId`, `conflictType` | `conflictId` | Keep assessment blocked until Manager resolution. |
| `event.reconciliation.verified-profile-ready.v1` | Reconciliation Worker | Legal Matching Worker / orchestrator | VerifiedProfile is created with no unresolved conflict. | `assessmentId`, `verifiedProfileId`, `profileVersion` | `verifiedProfileId + profileVersion` | Legal matching may retry; classification must not consume this event directly. |
| `event.legal-matching.completed.v1` | Legal Matching Worker | Classification Worker / orchestrator | LegalRuleMatch records are persisted. | `assessmentId`, `verifiedProfileId`, `legalRuleMatchIds`, `legalCorpusVersionId` | `verifiedProfileId + legalCorpusVersionId` | Retry classification command; missing citations block/degrade later output. |
| `event.legal-matching.failed.v1` | Legal Matching Worker | Assessment/orchestration projection | Legal matching fails or has missing required citation basis. | `assessmentId`, `verifiedProfileId`, `failureCode` | `verifiedProfileId + failureCode` | Block/degrade classification and audit. |
| `event.classification.completed.v1` | Classification Worker | Gap Analysis Worker / reporting projection | RiskClassification is persisted as completed. | `assessmentId`, `riskClassificationId`, `verifiedProfileId`, `citationCoverage` | `riskClassificationId` | Retry downstream gap-analysis command. |
| `event.classification.blocked.v1` | Classification Worker | Manager UI projection / Document guardrail | Classification cannot complete. | `assessmentId`, `riskClassificationId`, `blockingReasons` | `assessmentId + verifiedProfileId + blockingReasonHash` | Keep report blocked; show reason. |
| `event.gap-analysis.completed.v1` | Gap Analysis Worker | Document Worker / reporting projection | GapAnalysis is persisted as completed. | `assessmentId`, `gapAnalysisId`, `riskClassificationId` | `gapAnalysisId` | Retry downstream document command. |
| `event.gap-analysis.blocked.v1` | Gap Analysis Worker | Manager UI projection / Document guardrail | Gap analysis cannot complete. | `assessmentId`, `riskClassificationId`, `blockingReasons` | `assessmentId + riskClassificationId + blockingReasonHash` | Keep document blocked; show reason. |
| `event.gap-analysis.failed.v1` | Gap Analysis Worker | Assessment/orchestration projection | Gap analysis worker fails after retries or fatal input failure. | `assessmentId`, `riskClassificationId`, `failureCode` | `riskClassificationId + failureCode` | Block document generation and audit. |
| `event.document.generated.v1` | Document Worker | Manager UI projection / Audit | GeneratedDocument metadata and artifact refs are persisted. | `assessmentId`, `documentId`, `documentHash`, `storageRef` | `documentId + documentHash` | Retry projection/audit; do not regenerate silently. |
| `event.document.blocked.v1` | Document Worker | Manager UI projection / Audit | Document output guardrail blocks generation. | `assessmentId`, `documentId`, `blockingReasons` | `assessmentId + blockingReasonHash` | Keep final output unavailable and audit. |

## Domain Events

Domain events are persisted state facts. Some are also published as integration events.

| Domain Event | Producer | Consumer | Trigger | Payload | Idempotency Key | Failure Handling |
|---|---|---|---|---|---|---|
| `ASSESSMENT_CREATED` | Backend API | Audit / Assessment projection | Manager creates assessment. | `assessmentId`, `organizationId`, `ownerManagerId` | `assessmentId` | Transaction rollback if audit/outbox write fails. |
| `WIZARD_PROFILE_SAVED` | Backend API | Audit / Assessment projection | Manager saves/submits WizardProfile. | `assessmentId`, `wizardProfileId`, `version` | `wizardProfileId + version` | Keep previous version if write fails. |
| `REPOSITORY_CONNECTED` | Backend API | Audit / Assessment projection | GitHub repository connection is recorded. | `assessmentId`, `repositoryConnectionId`, `repositoryId` | `repositoryConnectionId` | Do not create scan without connection. |
| `SNAPSHOT_CREATED` | Backend API / Repository Integration | Audit / Scan API | Commit-pinned snapshot metadata is recorded. | `assessmentId`, `repositorySnapshotId`, `commitSha` | `repositoryConnectionId + commitSha` | Do not scan without snapshot. |
| `SCAN_REQUESTED` | Backend API | Outbox publisher / Scanner Worker | Manager requests scan. | `assessmentId`, `scanJobId`, `repositorySnapshotId` | `scanJobId` | Retry outbox publish; job remains requested. |
| `SCAN_STARTED` | Scanner Worker | Audit / scan status projection | Scanner begins processing. | `assessmentId`, `scanJobId` | `scanJobId + startedAt` | Retry status update if transient. |
| `TECHNICAL_PROFILE_CREATED` | Technical Profile Worker | Audit / orchestration | TechnicalProfile is persisted. | `assessmentId`, `technicalProfileId` | `technicalProfileId` | Block AIUsageFlow if creation fails. |
| `AI_USAGE_FLOW_CREATED` | AIUsageFlow Worker | Audit / orchestration | AIUsageFlow is persisted. | `assessmentId`, `aiUsageFlowId` | `aiUsageFlowId` | Block reconciliation if creation fails. |
| `RECONCILIATION_CONFLICT_DETECTED` | Reconciliation Worker | Audit / Manager UI | Conflict is created. | `assessmentId`, `conflictId`, `conflictType` | `conflictId` | Keep assessment in conflict state. |
| `RECONCILIATION_RESOLVED` | Backend API | Reconciliation Worker / Audit | Manager resolves conflict. | `assessmentId`, `conflictId`, `resolutionId` | `conflictId + resolvedAt` | Do not overwrite scanner evidence; retry resume command. |
| `VERIFIED_PROFILE_CREATED` | Reconciliation Worker | Legal Matching Worker / Audit | VerifiedProfile is persisted. | `assessmentId`, `verifiedProfileId`, `profileVersion` | `verifiedProfileId + profileVersion` | Retry legal matching command. |
| `LEGAL_MATCHING_COMPLETED` | Legal Matching Worker | Classification Worker / Audit | LegalRuleMatch records are persisted. | `assessmentId`, `legalRuleMatchIds`, `corpusVersionId` | `verifiedProfileId + corpusVersionId` | Block/degrade if citations missing. |
| `CLASSIFICATION_COMPLETED` | Classification Worker | Gap Analysis Worker / Audit | RiskClassification completes. | `assessmentId`, `riskClassificationId` | `riskClassificationId` | Retry gap-analysis command if needed. |
| `CLASSIFICATION_BLOCKED` | Classification Worker | Manager UI / Audit | Classification cannot complete. | `assessmentId`, `riskClassificationId`, `blockingReasons` | `riskClassificationId + blockingReasonHash` | Surface blocking reason. |
| `GAP_ANALYSIS_COMPLETED` | Gap Analysis Worker | Document Worker / Audit | GapAnalysis completes. | `assessmentId`, `gapAnalysisId`, `riskClassificationId` | `gapAnalysisId` | Retry document command if needed. |
| `GAP_ANALYSIS_BLOCKED` | Gap Analysis Worker | Manager UI / Audit | GapAnalysis cannot complete. | `assessmentId`, `riskClassificationId`, `blockingReasons` | `riskClassificationId + blockingReasonHash` | Surface blocking reason and keep document unavailable. |
| `DOCUMENT_GENERATED` | Document Worker | Manager UI / Audit | GeneratedDocument is available. | `assessmentId`, `documentId`, `documentHash` | `documentId + documentHash` | Keep artifact immutable; retry projection. |
| `DOCUMENT_BLOCKED` | Document Worker | Manager UI / Audit | Document generation blocked. | `assessmentId`, `documentId`, `blockingReasons` | `documentId + blockingReasonHash` | Keep blocked state. |
| `SECURITY_EVENT` | Any service | Audit / Security review | Security-sensitive denial or guardrail event occurs. | `assessmentId?`, `actorUserId?`, `eventCode`, `redactedMetadata` | `correlationId + eventCode` | Never include secret/source in event. |

## Integration Events and Commands

| Command / Event | Exchange | Queue | DLQ | Producer | Consumer |
|---|---|---|---|---|---|
| `command.scan.requested.v1` | `lcsp.commands.v1` | `lcsp.scan-worker.v1` | `lcsp.scan-worker.dlq.v1` | Backend API / Outbox publisher | Scanner Worker |
| `command.technical-profile.requested.v1` | `lcsp.commands.v1` | `lcsp.technical-profile-worker.v1` | `lcsp.technical-profile-worker.dlq.v1` | Orchestrator / Outbox publisher | Technical Profile Worker |
| `command.ai-usage-flow.requested.v1` | `lcsp.commands.v1` | `lcsp.ai-usage-flow-worker.v1` | `lcsp.ai-usage-flow-worker.dlq.v1` | Orchestrator / Outbox publisher | AIUsageFlow Worker |
| `command.reconciliation.requested.v1` | `lcsp.commands.v1` | `lcsp.reconciliation-worker.v1` | `lcsp.reconciliation-worker.dlq.v1` | Orchestrator / Outbox publisher | Reconciliation Worker |
| `command.legal-matching.requested.v1` | `lcsp.commands.v1` | `lcsp.legal-matching-worker.v1` | `lcsp.legal-matching-worker.dlq.v1` | Orchestrator / Outbox publisher | Legal Matching Worker |
| `command.classification.requested.v1` | `lcsp.commands.v1` | `lcsp.classification-worker.v1` | `lcsp.classification-worker.dlq.v1` | Orchestrator / Outbox publisher | Classification Worker |
| `command.gap-analysis.requested.v1` | `lcsp.commands.v1` | `lcsp.gap-analysis-worker.v1` | `lcsp.gap-analysis-worker.dlq.v1` | Orchestrator / Outbox publisher | Gap Analysis Worker |
| `command.document.requested.v1` | `lcsp.commands.v1` | `lcsp.document-worker.v1` | `lcsp.document-worker.dlq.v1` | Backend API / Orchestrator / Outbox publisher | Document Worker |
| `event.scan.completed.v1` | `lcsp.events.v1` | projection / orchestration binding | `lcsp.scan-worker.dlq.v1` | Scanner Worker | Orchestrator / Technical Profile trigger |
| `event.reconciliation.verified-profile-ready.v1` | `lcsp.events.v1` | projection / orchestration binding | `lcsp.reconciliation-worker.dlq.v1` | Reconciliation Worker | Legal Matching trigger |
| `event.legal-matching.completed.v1` | `lcsp.events.v1` | projection / orchestration binding | `lcsp.legal-matching-worker.dlq.v1` | Legal Matching Worker | Classification trigger |
| `event.classification.completed.v1` | `lcsp.events.v1` | projection / orchestration binding | `lcsp.classification-worker.dlq.v1` | Classification Worker | Gap Analysis trigger |
| `event.gap-analysis.completed.v1` | `lcsp.events.v1` | projection / orchestration binding | `lcsp.gap-analysis-worker.dlq.v1` | Gap Analysis Worker | Document trigger |

## Canonical Workflow Choreography

```text
POST /api/v1/assessments/:assessmentId/scans
-> command.scan.requested.v1
-> event.scan.completed.v1
-> command.technical-profile.requested.v1
-> event.technical-profile.completed.v1
-> command.ai-usage-flow.requested.v1
-> event.ai-usage-flow.completed.v1
-> command.reconciliation.requested.v1
-> event.reconciliation.conflict-detected.v1
   OR event.reconciliation.verified-profile-ready.v1
-> command.legal-matching.requested.v1
-> event.legal-matching.completed.v1
-> command.classification.requested.v1
-> event.classification.completed.v1 OR event.classification.blocked.v1
-> command.gap-analysis.requested.v1
-> event.gap-analysis.completed.v1 OR event.gap-analysis.blocked.v1
-> command.document.requested.v1
-> event.document.generated.v1 OR event.document.blocked.v1
```

## Payload Envelope

All integration messages use this envelope:

```json
{
  "messageId": "uuidv7",
  "eventType": "command.scan.requested.v1",
  "schemaVersion": 1,
  "correlationId": "uuidv7",
  "causationId": "uuidv7",
  "aggregateType": "Assessment",
  "aggregateId": "uuidv7",
  "occurredAt": "2026-06-21T00:00:00.000Z",
  "payload": {
    "assessmentId": "uuidv7",
    "scanJobId": "uuidv7",
    "repositorySnapshotId": "uuidv7"
  }
}
```
