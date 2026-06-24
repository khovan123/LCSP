---
name: LCSP
description: Evidence-based compliance support platform for Vietnamese AI-system assessments.
status: draft
sources:
  - docs/product/prd.md
  - docs/specs/user-task-flows.md
  - docs/specs/requirements-traceability-summary.md
updated: 2026-06-24
colors:
  background: '#F7F8FA'
  surface: '#FFFFFF'
  surface-muted: '#EEF1F4'
  surface-warning: '#FFF6E6'
  surface-success: '#EAF7EF'
  surface-danger: '#FDECEC'
  ink: '#18202A'
  ink-muted: '#5B6673'
  ink-subtle: '#7B8794'
  border: '#D7DDE4'
  primary: '#155E75'
  primary-foreground: '#FFFFFF'
  accent: '#8A5A12'
  accent-foreground: '#FFFFFF'
  success: '#1F7A4D'
  warning: '#A15C00'
  danger: '#B42318'
  info: '#2563A6'
typography:
  display:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 32px
    fontWeight: '650'
    lineHeight: '1.2'
    letterSpacing: '0'
  headline:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 22px
    fontWeight: '650'
    lineHeight: '1.25'
    letterSpacing: '0'
  title:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 18px
    fontWeight: '620'
    lineHeight: '1.35'
    letterSpacing: '0'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.55'
    letterSpacing: '0'
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '560'
    lineHeight: '1.35'
    letterSpacing: '0'
  caption:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  page-gutter: 24px
  page-gutter-mobile: 16px
components:
  primary-button:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  evidence-card:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  blocked-banner:
    background: '{colors.surface-warning}'
    foreground: '{colors.warning}'
    radius: '{rounded.md}'
  citation-chip:
    background: '{colors.surface-muted}'
    foreground: '{colors.ink}'
    radius: '{rounded.sm}'
---

# LCSP Design Spine

## Brand & Style

LCSP reads as a compliance workbench: quiet, explicit, and evidence-first. The interface should help a Manager understand what is known, what is missing, what is blocked, and what can be done next without implying legal certification or unsupported certainty.

The visual language is operational rather than promotional. Dense information is acceptable when it is structured, grouped, and scannable. Avoid marketing hero layouts, decorative illustrations, large emotional gradients, or chatbot-style surfaces that imply informal legal advice.

## Colors

- **Primary teal (`{colors.primary}`)** is used for primary commands, selected navigation, and active step emphasis. It signals official product action, not legal approval.
- **Neutral surfaces (`{colors.background}`, `{colors.surface}`, `{colors.surface-muted}`)** carry most of the UI. Evidence and audit content should remain readable in long sessions.
- **Warning amber (`{colors.warning}` / `{colors.surface-warning}`)** marks blocked, degraded, insufficient, or needs-review states. It must not be used as decoration.
- **Success green (`{colors.success}` / `{colors.surface-success}`)** marks completed gates or generated artifacts only after prerequisites pass.
- **Danger red (`{colors.danger}` / `{colors.surface-danger}`)** is reserved for destructive actions, denied access, failed security/privacy checks, and report-blocking guardrail violations.
- **Info blue (`{colors.info}`)** marks informational provenance, corpus version, and audit references.

## Typography

Use a system sans-serif stack. LCSP is a repeated-use operational tool; typography should prioritize legibility, stable table layout, and clear hierarchy over expressive brand moments.

Reserve `{typography.display}` for workspace-level page titles. Wizard panels, evidence cards, conflict tasks, and document states use `{typography.headline}` or smaller. Dense metadata, evidence refs, legal chunk IDs, corpus versions, and audit IDs use `{typography.caption}` with sufficient contrast.

## Layout & Spacing

Primary layout is responsive web with a persistent desktop sidebar, a top workspace bar, and a constrained main content region. Mobile and tablet layouts collapse navigation into a sheet and stack panels in workflow order.

Use the spacing scale consistently: `16px` for ordinary panel spacing, `24px` for section gaps, and `32px` for major workflow separation. Fixed-format elements such as step indicators, status rows, citation chips, and action bars must keep stable dimensions so text/status updates do not shift the layout.

## Elevation & Depth

Use borders and tonal surfaces before shadows. Cards represent actual grouped work objects: assessment, wizard section, evidence report, conflict, legal match, gap item, document artifact. Do not use cards as decorative page sections or nest cards inside cards.

Dialogs and sheets may use modest elevation to establish modality. Long-running status, audit, and legal citation surfaces should remain flat and inspectable.

## Shapes

Use tight radii: `{rounded.sm}` for chips and small controls, `{rounded.md}` for buttons and inputs, `{rounded.lg}` for work-object cards and dialogs. Avoid pill-shaped buttons except for short status badges where the shape improves scanning.

## Components

- **Primary button** — `{components.primary-button}`. One primary command per surface or modal footer.
- **Evidence card** — `{components.evidence-card}`. Shows source, state, confidence, limitations, and next action. Must not hide limitations behind hover-only UI.
- **Blocked banner** — `{components.blocked-banner}`. Contains reason, affected stage, next action, and audit/reference ID when available.
- **Citation chip** — `{components.citation-chip}`. Shows legal document/article/clause/point. Opens citation detail with corpus version, effective date, context role, and provenance.
- **Stepper** — horizontal on desktop, vertical on mobile. Must distinguish completed, current, blocked, deferred, and not-yet-eligible states.
- **Status badge** — short state labels only: `Ready`, `Blocked`, `Needs review`, `Generated`, `Readiness only`.
- **Data table** — used for audit events, evidence findings, legal references, and generated documents. Must support filtering, wrapping, and redacted metadata display.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Show evidence, provenance, limitations, and next action together | Show a risk level before gates pass |
| Use warning color for blocked/degraded state | Use warning color as visual emphasis |
| Make citations inspectable by document/article/clause/point | Show vague legal source labels |
| Keep legal and audit metadata readable | Hide critical provenance in tooltips only |
| Use restrained operational density | Build a marketing-style landing page as the first screen |
| Label readiness-only output clearly | Make readiness look like final classification |

