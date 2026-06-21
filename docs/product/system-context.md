# LCSP System Context

## Purpose

This document answers the business-domain question: what is LCSP, who uses it, and how an assessment moves from Manager intent to evidence-backed classification and report.

It is a domain-level source of truth. It does not create new requirements, stories, backlog items, architecture, implementation guidance, or validation material.

## Problem Statement

Vietnamese businesses using AI need a way to understand and document their compliance posture without relying only on self-declared checklists or free-form legal chatbot answers. LCSP addresses this by combining Manager-provided business context, repository-derived technical evidence, reconciliation, citation-backed legal matching, classification, gap analysis, document generation, and audit trail.

The core problem is trust: a risk result is not useful unless it can be traced to verified business usage, technical evidence, legal citations, and recorded human decisions.

## Product Vision

LCSP is an evidence-based compliance support platform for businesses using AI in Vietnam. It helps a Manager complete an assessment, collect repository evidence, resolve mismatches, classify risk only after verified prerequisites, identify compliance gaps, and generate traceable reports.

LCSP supports compliance work. It does not replace professional legal advice, certify compliance, or create final legal conclusions without citation traceability.

## Product Scope

LCSP owns the workflow from assessment creation to generated compliance document:

```text
Manager intent
-> WizardProfile
-> Repository Scan
-> TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> VerifiedProfile
-> LegalRuleMatch
-> ClassificationResult
-> GapAnalysis
-> GeneratedDocument
-> AuditEvent
```

## In Scope

- Manager-led assessment lifecycle.
- OAuth/OIDC user login separated from GitHub App authorization.
- Optional Developer collaboration through scoped tasks.
- Read-only GitHub repository connection and commit-pinned Repository Scan.
- Static-analysis technical evidence.
- Evidence gates, TechnicalProfile, AIUsageFlow, and reconciliation.
- Manager-only conflict resolution for MVP completion.
- VerifiedProfile creation after gates and conflict resolution.
- Citation-backed legal matching.
- Risk classification only after VerifiedProfile and legal matching.
- Gap analysis and document generation under output guardrails.
- Audit trail for material actions and generated artifacts.

## Out Of Scope

- Production compliance certification.
- Formal legal opinion.
- Direct submission to regulator portals.
- Public auditor/regulator portal.
- Enterprise SSO/SAML/SCIM and advanced organization identity.
- Local/CI scanner upload and manual evidence JSON as active MVP main paths.
- Runtime scanner accuracy claims before post-implementation empirical acceptance.
- Risk level based only on Wizard answers, provider package presence, model name, or framework detection.
- Final report when critical conflict, insufficient evidence, or missing citation remains unresolved.

## Primary Actors

| Actor | Domain Responsibility | Key Tasks |
|---|---|---|
| Manager | Owns assessment, business/legal truth, final MVP conflict resolution, VerifiedProfile approval, classification request, report generation and audit review. | Create assessment, complete Wizard, connect repo, start scan, review evidence, resolve conflicts, request classification, generate report. |
| Developer | Optional technical collaborator with scoped delegated tasks. Developer input can support technical clarification but does not replace Manager final authority. | Accept task, review technical findings, provide technical clarification, submit structured attestation when allowed. |
| LCSP System | Enforces workflow gates, evidence handling, state transitions, queue choreography, audit, classification prerequisites and output guardrails. | Persist domain objects, publish commands/events, execute workers, block unsafe output. |

## Secondary Actors

| Actor / System | Relationship to LCSP |
|---|---|
| GitHub | External repository provider used through GitHub App read-only repository authorization. |
| OAuth/OIDC Provider | User identity provider for LCSP login only; it does not grant repository access. |
| Legal Corpus | Versioned source for legal rules and citations used by Legal Matching. |
| LLM Provider | May be used behind guardrails with normalized evidence/legal context only; raw source, secrets, full prompts and full AST bodies are excluded. |
| Object Storage | Stores generated document artifacts and allowed non-source artifacts. |

## External Systems

| System | Used For | Boundary |
|---|---|---|
| OAuth/OIDC Provider | User login and identity verification. | Separate from repository authorization. |
| GitHub App | Read-only selected repository access and commit snapshot. | Does not authenticate LCSP user identity. |
| Legal Corpus / RAG Store | Versioned legal retrieval and citation traceability. | Legal matching requires citation coverage. |
| LLM Provider | Assisted classification/generation under structured guardrails. | Receives no raw source, full prompt, secret, or full AST body. |
| Object Storage | Generated document artifact storage. | Stores generated output only, not raw source. |

## High-Level User Journey

1. Manager creates an assessment.
2. Manager completes the WizardProfile using business/legal language.
3. Manager connects a GitHub repository and selects branch/commit scope.
4. Manager starts Repository Scan.
5. LCSP creates technical evidence and profile objects.
6. LCSP builds AIUsageFlow claims from evidence and declarations.
7. LCSP reconciles WizardProfile, TechnicalProfile and AIUsageFlow.
8. If conflict exists, Manager resolves it.
9. LCSP creates VerifiedProfile.
10. LCSP performs legal matching and risk classification.
11. LCSP generates gap analysis and document output only when guardrails pass.
12. LCSP records audit trail throughout.

## Manager Journey

```text
Login
-> Create Assessment
-> Complete WizardProfile
-> Connect Repository
-> Start Scan
-> Review Findings / AIUsageFlow
-> Resolve Conflict if present
-> Approve or rely on VerifiedProfile readiness
-> Request Classification
-> Generate Report
-> Review Audit Trail
```

Manager can complete every active MVP workflow without Developer assignment. State gates may block final output, but Developer absence does not.

## Developer Journey

```text
Receive invitation or task
-> Accept scoped task
-> Review assigned technical findings
-> Provide clarification or structured attestation
-> Stop at delegated scope
```

Developer cannot finalize conflicts, approve VerifiedProfile, run final classification, generate final report, change Manager decisions or block Manager-only completion.

## Assessment Journey

```text
CREATED
-> WIZARD_PROFILE_READY
-> REPOSITORY_CONNECTED
-> SNAPSHOT_CREATED
-> SCAN_REQUESTED
-> SCAN_RUNNING
-> SCAN_COMPLETED
-> TECHNICAL_PROFILE_READY
-> AI_USAGE_FLOW_READY
-> RECONCILIATION_REQUIRED or VERIFIED_PROFILE_READY
-> LEGAL_MATCHING_READY
-> CLASSIFICATION_READY or CLASSIFICATION_BLOCKED
-> DOCUMENT_GENERATED or DOCUMENT_BLOCKED
```

## Classification Journey

```text
VerifiedProfile
-> LegalRuleMatch[]
-> ClassificationResult
```

Classification is blocked or degraded when:

- VerifiedProfile does not exist.
- Any material conflict remains unresolved.
- AIUsageFlow critical usage is unknown or unsupported.
- Legal citation coverage is missing for required conclusions.
- Provider/model/framework presence is the only evidence.

## Report Journey

```text
ClassificationResult
-> GapAnalysis
-> GeneratedDocument
-> AuditEvent
```

A final report requires classification, gap analysis, evidence trace, legal citation trace, and no unresolved conflict. Readiness-only output may exist earlier, but it must not contain a risk level.

## Assessment Lifecycle Summary

| Stage | Business Meaning | Output |
|---|---|---|
| Wizard | Manager states intended business use and oversight. | `WizardProfile` |
| Repository Scan | LCSP gathers static technical evidence from selected repository snapshot. | `TechnicalEvidenceReport`, `TechnicalFinding[]` |
| Technical Profile | LCSP normalizes technical evidence into dimensions. | `TechnicalProfile` |
| AI Usage Flow | LCSP turns evidence into business usage claims with evidence refs and uncertainty. | `AIUsageFlow`, `AIUsageFlowClaim[]` |
| Reconciliation | LCSP compares Manager declaration and technical evidence. | `Conflict[]` or `VerifiedProfile` |
| Legal Matching | LCSP retrieves citation-backed legal rules. | `LegalRuleMatch[]` |
| Classification | LCSP determines risk only from verified and cited basis. | `ClassificationResult` |
| Reporting | LCSP generates gap analysis and document output under guardrails. | `GapAnalysis`, `GeneratedDocument` |

## Key Business Outcomes

- Manager understands what evidence is required before risk classification.
- Technical evidence is traceable to repository snapshot metadata and evidence refs.
- Business declarations and technical findings are reconciled before classification.
- Legal conclusions are citation-backed or blocked/degraded.
- Generated documents are traceable to evidence, legal basis and Manager decisions.
- Audit trail records material workflow actions.

## Success Metrics

| Metric | Meaning |
|---|---|
| Manager completion quality | Manager can complete Wizard and MVP workflow without Developer dependency. |
| Evidence-gated classification | Risk classification runs only after evidence gates, reconciliation and VerifiedProfile. |
| No Wizard-only risk level | Self-declared readiness never shows HIGH/MEDIUM/LOW. |
| Conflict accountability | Material conflicts have Manager resolution and audit trail. |
| Report traceability | Final report traces to evidence, legal rule/citation and decisions. |
