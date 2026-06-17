# Document Generation Spec

## Status

AUTHORITATIVE

## Merged From

- Document output rules from `docs/specs/scanner-spec.md`
- Citation requirements from `docs/specs/legal-matching-domain-spec.md`

## Purpose

Single source of truth for document-generation domain behavior and output guardrails.

## Canonical Rules

- No final legal output without citation traceability.
- Missing legal citation blocks or degrades output.
- Unresolved conflict blocks final document generation.
- Generated documents reference RiskClassification, GapAnalysis, citations, and evidence appendix.
- Document generation starts only after `event.gap-analysis.completed.v1` creates `command.document.requested.v1`.
- Document generation must not start directly from `event.classification.completed.v1`.
- Raw source, secrets, full prompts, and full AST bodies must not be included.

## Runtime Source

See `docs/developer-execution-blueprints/end-to-end-execution.md`.
