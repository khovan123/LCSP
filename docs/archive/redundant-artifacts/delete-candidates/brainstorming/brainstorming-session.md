# LCSP Brainstorming Session

> Consolidated session artifact. Detailed historical notes are preserved in `docs/brainstorming/brainstorming-session-2026-06-16-1633.md`.

## Problem Framing

LCSP must support evidence-based AI compliance assessment. The central problem is not simply asking users compliance questions; it is aligning business/legal truth from Manager with technical truth from Developer and machine-generated evidence before producing risk classification.

Core tension:

| Tension | Why it matters |
| --- | --- |
| Wizard simplicity vs completeness | Manager must complete the flow without understanding scanner/code, but WizardProfile must be rich enough for reconciliation |
| Evidence trust vs adoption friction | GitHub App read-only is easy for MVP, while Local/CI scanner is safer for enterprise |
| Automation vs legal accountability | Scanner and LLM can support evidence and reasoning, but LCSP must not make unsupported legal conclusions |
| Human attestation vs bypass risk | Structured attestation can supplement weak scanner evidence, but must not replace objective metadata |

## Current Understanding

- LCSP is an evidence-based compliance platform, not a chatbot or self-declared checklist.
- MVP exposes two user-facing roles: Manager and Developer.
- Manager owns assessment and business/legal truth.
- Developer owns technical truth and participates through assigned tasks/policies.
- Risk Classification runs only after WizardProfile, valid technical evidence, evidence gates, reconciliation, VerifiedProfile and no unresolved material/critical conflict.
- Wizard-only state may show `SELF_DECLARED_READINESS`, readiness checklist and preliminary indicators only; it must not show HIGH/MEDIUM/LOW or draft risk level.

## Question Storming

Key unresolved questions:

- Can Manager answer Wizard questions accurately without Developer help?
- Which Wizard fields are mandatory for risk-impacting workflows?
- What minimum legal corpus/rule contract is enough for classification?
- When should missing legal citation degrade output vs block final classification?
- Which human attestation claims are allowed by Manager vs Developer?
- Which claims always require dual confirmation?
- How should LCSP detect and prevent attestation overuse?
- What evidence quality threshold is appropriate per context?

## Assumption Mapping

| Assumption | Risk | Validation dependency |
| --- | --- | --- |
| A1 - Wizard simplicity vs completeness | Wizard too simple misses business/legal truth; too complex blocks Manager | User testing and WizardProfile mapping |
| A2 - Legal corpus / rule reliability | Classification lacks legal basis if rules are not cited/versioned | Rule inventory and citation trace testing |
| A3 - Human attestation abuse risk | Attestation becomes scanner bypass | Abuse-case testing and role-bound policy review |

## Workflow Alternatives

| Alternative | Summary | Trade-off |
| --- | --- | --- |
| GitHub App read-only only | Fastest end-to-end MVP | Lower enterprise trust for sensitive repos |
| Local/CI scanner only | Strong source privacy | Too much setup friction for Manager-led MVP |
| Hybrid | GitHub App default; Local/CI/manual evidence alternative | Requires unified evidence report contract |

Recommended direction: Hybrid strategy with GitHub App read-only as default MVP path and Local/CI/manual evidence upload as enterprise-safe alternative.

## Risk / Trade-off Mapping

| Area | Risk | Mitigation |
| --- | --- | --- |
| Wizard | Missing critical field | A1 validation, field mapping, progressive disclosure |
| Evidence | Scanner false positive/negative | Developer confirmation, rescan, Local/CI upload |
| Reconciliation | Wrong risk-impacting truth | Dual confirmation for material conflicts |
| Scoring | Scores block incorrectly | Only Conflict Score can block workflow |
| Legal | LLM overclaims law | Versioned legal rules, citation trace, degraded/blocked behavior |
| Security | Raw source leakage | No raw source to LLM, no long-term raw source storage |
| Attestation | Human bypass | Structured schema, role-bound claims, audit, forbidden metadata replacement |

## Key Decisions

- Manager-led workflow with task-based Developer participation.
- MVP exposes only Manager and Developer.
- Technical evidence is required before any risk level.
- Schema completeness gate accepts/rejects evidence; quality threshold gate unlocks or blocks classification readiness.
- Evidence Confidence Score and AI Intervention Score are supporting signals.
- Conflict Score is the only blocking score.
- Material conflicts require dual confirmation from Manager and Developer.
- Human technical attestation is a controlled evidence supplement, not a bypass.

## Session Conclusion

The brainstorming phase is sufficient to move into Product Brief and Conditional PRD, but A1-A3 remain high-risk assumptions. Backlog and implementation must stay blocked until validation results are recorded and any PRD/Architecture/ADR updates are completed.
