# Tool Catalog and Operational Purpose

## TOOL-01 - GitHub App Repository Access

| Field | Value |
|---|---|
| Tool ID | `GITHUB_APP_REPOSITORY_ACCESS` |
| Packages | `@octokit/app`, `@octokit/rest` |
| Owning module | `apps/api/src/github/` |
| Purpose | Allow a Manager to install/connect a GitHub App and select only an authorized repository, branch and immutable commit SHA for scanning. |
| Input | `organizationId`, `assessmentId`, `githubInstallationId`, `githubRepositoryId`, `branchName`, `commitSha`, `actorUserId` |
| Output | `RepositoryConnection`, `RepositorySnapshotRequest` |
| Trigger | Manager starts install/connect/select repository flow |
| Failure behavior | Fail closed with `GITHUB_REPOSITORY_AUTHORIZATION_FAILED` or `GITHUB_COMMIT_RESOLUTION_FAILED`; audit failure |
| Audit event | `audit.github.repository.connected.v1`, `audit.github.repository.selected.v1` |

Processing steps: validate Manager permission, store installation metadata only, list repositories, resolve branch to commit SHA, store connection/snapshot, publish scan command with IDs and commit SHA only. Worker mints short-lived installation token in memory.

Must not persist GitHub installation token, put token into RabbitMQ, put token into audit event, send repository source to LLM or permit Developer to connect/select repository.

## TOOL-02 - Repository Snapshot Builder

| Field | Value |
|---|---|
| Tool ID | `REPOSITORY_SNAPSHOT_BUILDER` |
| Owner | `packages/scanner/src/snapshot/` |
| Purpose | Download only selected repository snapshot at selected commit SHA, extract supported files into ephemeral worker storage and produce inventory. |
| Input | `repositoryConnectionId`, `commitSha`, `scanJobId` |
| Output | `RepositorySnapshotManifest` |
| Trigger | `command.scan.requested.v1` |
| Failure behavior | Abort scan with `SNAPSHOT_BUILD_FAILED` or `REPOSITORY_LIMIT_EXCEEDED`; cleanup workspace; audit failure |
| Audit event | `audit.repository.snapshot.built.v1`, `audit.repository.snapshot.failed.v1` |

Manifest fields: `snapshotId`, `repositoryConnectionId`, `commitSha`, `fileCount`, `supportedFileCount`, `ignoredFileCount`, `totalBytes`, `fileHashes`, `languageSummary`, `coverageLimitations`.

Must not persist full raw source into PostgreSQL, send raw source to LLM, scan ignored files or continue beyond size/safety limits.

## TOOL-03 - Static Repository Scanner

| Field | Value |
|---|---|
| Tool ID | `STATIC_REPOSITORY_SCANNER` |
| Packages | `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-javascript`, `tree-sitter-python`, `typescript`, `fast-glob`, `ignore`, `zod` |
| Owner | `packages/scanner/src/` |
| Purpose | Produce deterministic technical evidence from source, dependency manifests, configuration and bounded static-analysis paths. |
| Input | `RepositorySnapshotManifest`, `scanJobId`, `commitSha` |
| Output | `TechnicalEvidenceReport` |
| Trigger | scan worker after snapshot manifest creation |
| Failure behavior | Emit `event.scan.failed.v1`; persist coverage limitation where partial analysis is valid |
| Audit event | `audit.scan.completed.v1`, `audit.scan.failed.v1` |

Processing order: apply ignore/size policy, identify manifests/source files, parse package/lock/config files, detect AI SDK dependencies, parse TS/JS/Python syntax with Tree-sitter, run TS Compiler API semantic pass for TS/JS only, detect invocation/input/output/human-review patterns, build bounded evidence graph, create findings, create coverage limitations, persist report/findings, publish `event.scan.completed.v1`.

Every finding includes `findingId`, `findingType`, `confidence`, `sourceFile`, `sourceSpan`, `fileHash`, `evidenceRef`, `scannerVersion`, `commitSha`, `coverageLimitations`.

Must not make legal conclusions, assign risk level, claim runtime behavior, claim complete coverage, infer high-impact use from SDK import alone or silently turn absent evidence into negative evidence.

## TOOL-04 - AI Usage Flow Builder

| Field | Value |
|---|---|
| Tool ID | `AI_USAGE_FLOW_BUILDER` |
| Owner | `packages/ai-usage-flow/src/` |
| Purpose | Transform technical findings plus WizardProfile into explainable claims about how AI is used in business workflow. |
| Input | `WizardProfile`, `TechnicalProfile`, `TechnicalEvidenceReport`, `assessmentId` |
| Output | `AIUsageFlow` |
| Trigger | `command.ai-usage-flow.requested.v1` |
| Failure behavior | Emit uncertainty or `AI_USAGE_FLOW_BLOCKED` instead of unsupported certainty |
| Audit event | `audit.ai_usage_flow.created.v1` |

Required claims: `business_process`, `ai_purpose`, `ai_input_types`, `ai_output_types`, `downstream_action`, `affected_subjects`, `human_review`, `automation_level`, `potential_harm_categories`, `evidence_refs`, `confidence`, `uncertainty_reasons`.

Rules: `MODEL_INVOCATION + OUTPUT_USED_IN_IF + STATUS_UPDATE` maps to `AUTOMATED_DECISION`; `MODEL_INVOCATION + SEND_TO_MANAGER_REVIEW` maps to `human_review = PRESENT`; `SDK_DEPENDENCY_ONLY` maps to `ai_usage = UNKNOWN` with `SDK_FOUND_WITHOUT_PROVEN_INVOCATION`.

Must not assign legal risk, create legal conclusion, override evidence, treat unknown as safe or treat provider/model name as proof of decision impact.

## TOOL-05 - Reconciliation Engine

| Field | Value |
|---|---|
| Tool ID | `RECONCILIATION_ENGINE` |
| Owner | `packages/reconciliation/src/` |
| Purpose | Compare WizardProfile and AIUsageFlow/TechnicalProfile; create explicit conflict or verified state. |
| Input | `WizardProfile`, `TechnicalProfile`, `AIUsageFlow` |
| Output | `ReconciliationConflict[]` or `VerifiedProfileCandidate` |
| Trigger | `command.reconciliation.requested.v1` |
| Failure behavior | Create conflict and block classification when material mismatch exists |
| Audit event | `audit.reconciliation.conflict_detected.v1`, `audit.verified_profile.created.v1` |

Example: Wizard says AI assists staff only; evidence says AI output feeds automatic approve/reject state update. Output is `RECONCILIATION_CONFLICT`; classification remains blocked.

## TOOL-06 - Legal Retrieval and Citation Guardrail

| Field | Value |
|---|---|
| Tool ID | `LEGAL_RETRIEVAL_CITATION_GUARDRAIL` |
| Owner | `packages/legal-rag/src/` |
| Purpose | Retrieve legal rules/chunks only after VerifiedProfile exists and return citation-linked candidates. |
| Input | `VerifiedProfile`, legal question type, risk/classification context |
| Output | `LegalRuleMatch[]` |
| Trigger | classification workflow after VerifiedProfile gate |
| Failure behavior | Return `CITATION_REQUIRED` or `LEGAL_RETRIEVAL_BLOCKED`; block final legal output |
| Audit event | `audit.legal_retrieval.completed.v1`, `audit.citation_guardrail.blocked.v1` |

Required fields: `ruleId`, `documentId`, `article`, `clause`, `chunkId`, `citationText`, `effectiveStatus`, `applicabilityReason`, `citationCoverage`.

Must not return policy context as mandatory legal obligation, create legal conclusion without citation trace or permit final output when required citation is missing.

## TOOL-07 - Classification Workflow

| Field | Value |
|---|---|
| Tool ID | `CLASSIFICATION_WORKFLOW` |
| Owner | `apps/worker/src/handlers/classification/`, `packages/legal-rag`, `packages/reconciliation` |
| Purpose | Apply deterministic risk gate rules plus citation-linked legal-rule matches to create classification draft. |
| Preconditions | VerifiedProfile exists, no unresolved conflict, citation coverage passes |
| Output | `RiskClassificationDraft` or `CLASSIFICATION_BLOCKED` |
| Trigger | `command.classification.requested.v1` |
| Failure behavior | Emit `event.classification.blocked.v1` with safe blocked reason |
| Audit event | `audit.classification.completed.v1`, `audit.classification.blocked.v1` |

## TOOL-08 - Gap and Document Workflow Shells

| Field | Value |
|---|---|
| Tool ID | `GAP_AND_DOCUMENT_WORKFLOW_SHELLS` |
| Owner | `apps/worker/src/handlers/gap-analysis/`, `apps/worker/src/handlers/document/` |
| Purpose | Produce prototype gap/document outputs only after valid classification, citation and output guardrails. |
| Input | `VerifiedProfile`, `RiskClassificationDraft`, `LegalCitation[]`, `GapAnalysisRequest` or `DocumentGenerationRequest` |
| Output | `GapAnalysisResult`, `GeneratedDocument` metadata or blocked state |
| Trigger | `command.gap-analysis.requested.v1`, `command.document.requested.v1` |
| Failure behavior | Block on missing classification, citation, unresolved conflict, output guardrail failure or object storage error |
| Audit event | `audit.gap_analysis.completed.v1`, `audit.document.generated.v1`, `audit.document.blocked.v1` |

Document shell must render prototype limitation warnings and must not issue production legal documents.
