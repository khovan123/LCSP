# Epic 2 Context: Manager Assessment and Wizard Readiness

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable a Manager to create an organization-scoped assessment, capture a structured account of the AI system in clear business and legal language, and understand what evidence or clarification is still needed before downstream analysis can begin. The epic deliberately stops at readiness: self-declared Wizard information may guide preparation, but it must never be presented as a risk level, legal conclusion, compliance determination, or final report.

## Stories

- Story 2.1: Create Manager-Owned Assessment
- Story 2.2: Complete WizardProfile in Business Language
- Story 2.3: Wizard-Only Readiness Without Risk Level
- Story 2.4: Wizard Readiness Export

## Requirements & Constraints

- Assessment creation, Wizard access, submission, export, and download must be organization-scoped and PBAC-protected. Denials fail closed, disclose no protected assessment data, and provide a safe recovery path.
- A Manager must be able to complete this epic without a Developer. Each assessment records its owner, organization, lifecycle timestamps, and material audit events.
- The Wizard captures purpose, business process, sector, affected people, user impact, data categories, decision role, human oversight, external AI usage, deployment context, and special-impact indicators as structured answers rather than free-form technical testimony.
- Required critical fields block submission when missing or invalid. A permitted explicit unknown is a valid, intentional answer and must remain distinguishable from an omitted field.
- Submitted Wizard data without accepted technical evidence produces `SELF_DECLARED_READINESS`, locks classification with `LOCKED_EVIDENCE_REQUIRED`, and exposes no risk value. Readiness consists of missing evidence, unresolved material unknowns, and actionable next steps.
- All pre-evidence surfaces and generated outputs must avoid HIGH/MEDIUM/LOW, severity, violation, non-compliance, legal certainty, certification, or equivalent authoritative wording. Output guardrails must block or neutralize overclaims and record safe audit evidence.
- Readiness artifacts must remain visibly and semantically distinct from final reports across title, badge, preview, metadata, history, and download state. Generated artifacts require provenance and immutable version identity.
- User-facing blocked, failed, loading, saved, submitted, and generated states must be actionable, accessible, announced to assistive technology, and understandable without source-code expertise.
- Structured attestation, manual technical-evidence upload, delegated free-form clarification, final classification, and legal conclusions are outside this epic.

## Technical Decisions

- Stable `question_id` values form the seam across UI, API, audit, analytics, readiness projection, and downstream processing. Copy may change without changing field identity or answer semantics.
- Each answer carries a question identifier, normalized value, answer state, and update timestamp. Explicit unknowns use a dedicated answer state and a canonical unknown value; `null` must not represent “I do not know.”
- Question definitions include section, target WizardProfile field, field type, criticality, whether unknown is allowed, downstream uses, and readiness/reconciliation implications. Readiness is derived from this registry and structured answers, never inferred from arbitrary prose.
- WizardProfile versions are immutable inputs. Later evidence or edits produce updated projections or new versions rather than mutating the submitted historical version.
- The readiness export consumes the same readiness projection displayed in the product; it must not independently reinterpret raw Wizard answers. It carries material unresolved items without exposing unnecessary raw answer content.
- Artifact metadata includes its readiness-specific type, readiness-only flag, locked classification status, WizardProfile version, assessment ID, generator identity, generation timestamp, and artifact version.
- Material writes and transitions emit append-oriented audit events with actor, organization scope, entity identifiers, action, result, correlation ID, and timestamp. Audit records exclude secrets and unnecessary sensitive content.

## UX & Interaction Patterns

- Use a two-phase responsive flow: a short pre-screen followed by structured detailed intake. Desktop uses a focused main column with a guidance rail; smaller screens stack guidance and task panels.
- Keep one primary action per panel, autosave at safe section or input-cluster boundaries, and require an explicit submit. Users may return to earlier sections but cannot bypass validation to reach readiness.
- Questions use business-language labels, short contextual rationale, examples, progressive disclosure, and an accessible explicit “I do not know” option where permitted. Contextual help opens without losing form data and returns focus to its trigger.
- The readiness panel uses neutral operational styling and presents preparation guidance, missing evidence, unresolved items, blockers, and the next action. Its visual treatment must not resemble a final classification result.
- Use restrained workbench styling: neutral surfaces, teal for product actions, amber for blocked or caution states, and green only after a valid gate completes. State and validation cannot rely on color alone.
- Avoid one-page mega-forms, nested decorative cards, chatbot patterns, gamified progress, unexplained implementation jargon, and lengthy legal prose inline.

## Cross-Story Dependencies

- Assessment ownership and organization scope established during creation govern every later Wizard read, write, readiness view, export, history entry, and download.
- Structured Wizard answers and a submitted WizardProfile are prerequisites for readiness projection; that projection is the single source for both the readiness UI and readiness artifacts.
- PBAC and append-oriented audit primitives must already exist and remain available for all protected reads, state changes, guardrail outcomes, exports, and denied actions.
- Epic 4 consumes selected WizardProfile facts to build AIUsageFlow, while Epic 5 compares material declarations with technical evidence. Unknown semantics and stable field identities must survive both handoffs.
- Later document work must preserve Wizard Readiness Export as its own readiness-only artifact rather than treating it as a shortened final report.
