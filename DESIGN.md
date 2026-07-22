---
name: LCSP Workspace Dashboard Design
description: Hallmark-generated design for LCSP workspace dashboard following modern-minimal aesthetic with Stat-Led macrostructure
metadata:
  type: project
---

# LCSP Workspace Dashboard Design

## Design Overview

This document captures the design system implemented for the LCSP workspace dashboard using the Hallmark skill with modern-minimal genre and Stat-Led macrostructure.

## Design System

### Macrostructure
- **Stat-Led**: Hero section features a prominent metric (total assessments count) as the primary visual focus

### Theme
- **Cobalt**: From the modern-minimal theme cluster, featuring cool accent hues that complement LCSP's primary blue

### Navigation & Footer
- **Nav**: N3 Side rail - matches the existing persistent sidebar navigation pattern
- **Footer**: Ft1 Implicit - minimal footer appropriate for utilitarian dashboard

### Enrichment
- None (typography only) - following the operational, evidence-first nature of LCSP

### Typography System
- Uses existing LCSP design system typography:
  - Display: Workspace-level page titles
  - Headline: Wizard panels, evidence cards
  - Title: Section headers
  - Body: Main content
  - Label: Form labels, metadata
  - Caption: Dense metadata, legal references

### Color System
- Uses existing LCSP design system colors defined in DESIGN.md:
  - Primary blue (#155E75) for primary actions and active states
  - Neutral surfaces for background and card backgrounds
  - Warning amber for blocked/degraded states
  - Success green for completed gates
  - Danger red for destructive actions
  - Info blue for informational provenance

### Spacing System
- Uses existing LCSP 4pt spacing scale:
  - 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px

### Components Used
- **Alert**: For error states
- **Badge**: For status indicators
- **Card**: For container components (stat hero, workspace header, assessment cards)
- **Sidebar**: Existing LCSP sidebar component
- **WorkspaceHeader**: Existing molecule component
- **AssessmentList**: Existing organism component

### Interactive States
All interactive components implement the 8-state checklist:
- Default
- Hover
- Focus-visible
- Active
- Disabled
- Loading
- Error
- Success

### Microinteractions
- Transform and opacity animations only
- Custom easings: ease-in, ease-out, ease-in-out
- Reduced motion support: spatial motion reduced to ≤150ms opacity crossfade
- Focus rings: Visible with ≥3:1 contrast, instant appearance

### Implementation Notes
- Maintains existing LCSP component hierarchy:
  - UI primitives: apps/web/src/components/ui
  - Atomic Design: apps/web/src/components/{atoms,molecules,organisms}
  - Feature-specific: apps/web/src/features/workspace/components/{molecules,organisms}
- All customer-facing copy resolved from @lcsp/i18n
- Uses Tailwind CSS v4.3 utility classes exclusively
- No custom CSS files or inline styles beyond token declarations in globals.css

## File Created
- apps/web/src/features/workspace/components/organisms/workspace-dashboard.tsx

## Design Principles Applied
- Structural variety: Stat-Led macrostructure differs from potential default structures
- Honest copy: Uses actual assessment count, no fabricated metrics
- Locked tokens: All colors and spacing reference CSS variables
- No re-drawn chrome: Uses native browser/elements
- Mobile responsiveness: Verified at 320/375/414/768px breakpoints
- Typography purity: No italic headers

## Diversification
This is the first Hallmark run for this project, establishing the baseline for future diversification.