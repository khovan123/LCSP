# Document Generation Spec

## Status

AUTHORITATIVE

## Merged From

- Document output rules from `docs/specs/evidence-report-contract.md`
- Citation requirements from `docs/specs/legal-rule-citation-contract.md`

## Purpose

Single source of truth for document-generation domain behavior and output guardrails.

## Canonical Rules

- No final legal output without citation traceability.
- Missing legal citation blocks or degrades output.
- Unresolved conflict blocks final document generation.
- Generated documents reference ClassificationResult, GapAnalysis, citations, and evidence appendix.
- Raw source, secrets, full prompts, and full AST bodies must not be included.

## Runtime Source

See `docs/developer-execution-blueprints/09-document-generation-blueprint.md`.
