# LCSP Archive

## Purpose

The archive is not a second knowledge base. It is split into historical decisions and redundant delete candidates.

## Structure

```text
docs/archive/
  decisions/
  redundant-artifacts/delete-candidates/
```

## Archive A — Historical Decisions

Keep under `docs/archive/decisions/`:

- architecture checkpoints;
- scanner amendment/checkpoint reports;
- owner risk acceptance and consolidation final reports;
- reports that explain why a canonical decision changed.

## Archive B — Redundant Artifacts

Place under `docs/archive/redundant-artifacts/delete-candidates/`:

- build specs;
- implementation playbooks;
- engineering manuals;
- story artifacts;
- developer story blueprints;
- duplicated examples and merged source fragments.

## Retention Rule

```text
Archive retention = 30 days
```

Delete physically only when all conditions are true:

1. Canonical merge is complete.
2. No active backlink remains.
3. No open decision references the artifact.
4. The artifact is older than 30 days in delete-candidates.
5. Owner approves physical deletion.

Current cleanup run date: `2026-06-21`.
Earliest delete date for current delete candidates: `2026-07-21`.
