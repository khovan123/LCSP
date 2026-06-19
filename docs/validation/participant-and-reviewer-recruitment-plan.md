# Participant and Reviewer Recruitment Plan

## Purpose

Prepare recruitment for A1, A2, A2-b and A3 validation without starting validation sessions or recording results.

## Scope

This plan defines participant/reviewer profiles, separation rules, proposed sample ranges and conflict controls.

## Role Separation

| Validation | Required Role | Responsibility | Must Not Be Sole Reviewer For |
| --- | --- | --- | --- |
| A1 | Business / Manager-like users | Complete Wizard tasks and explain blocked states | Legal corpus reliability |
| A1 | UX/domain observer | Observe comprehension, wording and task completion | Final legal-rule decision |
| A2 | Legal reviewers | Review citations, rule families and corpus provenance | Scanner technical correctness |
| A2 | Product rule owner | Confirm product/rule intent | Sole legal judgment |
| A2-b | Technical reviewers with software architecture/static-analysis literacy | Review expected scanner findings and AIUsageFlow mapping | Sole legal-rule decision |
| A2-b | Legal/RAG reviewer | Review rule-family eligibility from AIUsageFlow | Sole scanner correctness |
| A3 | Governance/security reviewers | Review abuse and bypass scenarios | Sole product scope decision |
| A3 | Product owner | Review Manager authority and user flow impact | Sole security/governance decision |

Do not use one person as the sole reviewer for all legal and technical decisions.

## Phase 4.1.1 RACI Matrix

Named people or explicitly approved external reviewer roles must be recorded before execution. Placeholder roles below are proposed defaults only and do not approve execution.

| Role | Responsible | Accountable | Consulted | Informed | Status |
| --- | --- | --- | --- | --- | --- |
| A1 Validation Owner | Project Lead by default | Project Lead | UX/domain observer, QA | Product/Architecture | PENDING_OWNER_CONFIRMATION |
| A1 Moderator | Named moderator required | A1 Validation Owner | Product Manager | Participants | PENDING_OWNER_CONFIRMATION |
| A2 Validation Owner | Project Lead by default | Project Lead | Legal reviewers, product rule owner | Architecture/QA | PENDING_OWNER_CONFIRMATION |
| A2 Legal Reviewer 1 | Named reviewer required | A2 Validation Owner | Product rule owner | QA | PENDING_OWNER_CONFIRMATION |
| A2 Legal Reviewer 2 | Named reviewer required | A2 Validation Owner | Product rule owner | QA | PENDING_OWNER_CONFIRMATION |
| A2 Adjudicator | Named adjudicator required | A2 Validation Owner | Legal reviewers | Product/Architecture | PENDING_OWNER_CONFIRMATION |
| A2-b Technical Reviewer 1 | Named reviewer required | A2-b Validation Owner | QA, Architecture | Product | PENDING_OWNER_CONFIRMATION |
| A2-b Technical Reviewer 2 | Named reviewer required | A2-b Validation Owner | QA, Architecture | Product | PENDING_OWNER_CONFIRMATION |
| A2-b Legal-eligibility Reviewer | Named reviewer required | A2-b Validation Owner | Legal/RAG owner | Product | PENDING_OWNER_CONFIRMATION |
| A3 Governance Reviewer | Named reviewer required | A3 Validation Owner | Product, Security | QA | PENDING_OWNER_CONFIRMATION |
| A3 Security Reviewer | Named reviewer required | A3 Validation Owner | Governance reviewer | Product/Architecture | PENDING_OWNER_CONFIRMATION |
| Evidence Storage Custodian | Named custodian required | Product Manager / Security Reviewer | QA, Legal, Architecture | Validation reviewers | PENDING_OWNER_CONFIRMATION |

Execution rule:

```text
No validation stream may start until required named assignments or explicitly approved external reviewer roles are recorded.
```

## Proposed Recruitment Ranges

| Validation | Proposed Participants / Reviewers | Status |
| --- | --- | --- |
| A1 | 3-5 Manager-like participants across SME Manager, compliance-oriented user and technical manager profiles | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION |
| A2 | 2+ reviewers including legal/compliance reviewer and product rule owner | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION |
| A2-b | 2+ technical/QA reviewers plus legal/RAG reviewer | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION |
| A3 | 2+ governance/security/product reviewers | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION |

## Recruitment Criteria

| Validation | Include | Exclude |
| --- | --- | --- |
| A1 | People who can represent Manager/business decision owner perspective | Scanner implementers, people who authored all Wizard questions |
| A2 | People able to review legal citation and rule applicability | Sole author of all legal rules under review |
| A2-b | People familiar with static analysis, architecture or evidence traceability | Anyone reviewing only provider/model presence as sufficient legal risk proof |
| A3 | People familiar with governance, audit, conflict resolution or abuse scenarios | Anyone incentivized to bypass evidence gates |

## Bias and Conflict Controls

- Use synthetic scenarios and fixture IDs.
- Separate expected-output review from observed-result scoring where possible.
- Use at least two reviewer perspectives for legal/technical mixed decisions.
- Record disagreements in the evidence capture template.
- Keep participant identity pseudonymized.

## Recruitment Open Decisions

| Item | Classification | Recommended Default | Owner | Required Before |
| --- | --- | --- | --- | --- |
| Final participant/reviewer count | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | Use proposed ranges unless project constraints require smaller samples | Product/QA | Validation execution |
| Reviewer independence requirement | DECISION_REQUIRED_BEFORE_VALIDATION_EXECUTION | No sole reviewer for legal+technical combined decisions | Product/QA | Validation execution |
